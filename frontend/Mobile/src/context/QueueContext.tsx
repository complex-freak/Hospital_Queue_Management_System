import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appointment, ConditionType, Gender, QueueState } from '../types';
import { useAuth } from './AuthContext';
import { format, addDays } from 'date-fns';
import { appointmentService } from '../services';
import { AUTH_CONFIG } from '../config/env';

// Initial state
const initialState: QueueState = {
    appointment: null,
    loading: false,
    error: null,
};

// Action types
type QueueAction =
    | { type: 'APPOINTMENT_REQUEST' }
    | { type: 'APPOINTMENT_SUCCESS'; payload: Appointment }
    | { type: 'APPOINTMENT_FAILURE'; payload: string }
    | { type: 'UPDATE_QUEUE_POSITION'; payload: { currentPosition: number; estimatedTime: number } }
    | { type: 'CLEAR_APPOINTMENT' }
    | { type: 'CLEAR_ERROR' };

// Reducer
function queueReducer(state: QueueState, action: QueueAction): QueueState {
    switch (action.type) {
        case 'APPOINTMENT_REQUEST':
            return {
                ...state,
                loading: true,
                error: null,
            };
        case 'APPOINTMENT_SUCCESS':
            return {
                ...state,
                appointment: action.payload,
                loading: false,
                error: null,
            };
        case 'APPOINTMENT_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case 'UPDATE_QUEUE_POSITION':
            return state.appointment
                ? {
                    ...state,
                    appointment: {
                        ...state.appointment,
                        currentPosition: action.payload.currentPosition,
                        estimatedTime: action.payload.estimatedTime,
                    },
                }
                : state;
        case 'CLEAR_APPOINTMENT':
            return {
                ...state,
                appointment: null,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        default:
            return state;
    }
}

// Create context
interface QueueContextType {
    state: QueueState;
    createAppointment: (
        gender: Gender,
        appointmentDate: string,
        conditionType: ConditionType,
        addToQueue?: boolean
    ) => Promise<boolean>;
    refreshQueueStatus: () => Promise<void>;
    clearAppointment: () => Promise<void>;
    clearError: () => void;
    getAppointments: () => Promise<Appointment[]>;
    cancelAppointment: (appointmentId: string) => Promise<void>;
}

const QueueContext = createContext<QueueContextType | undefined>(undefined);

// Provider component
export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(queueReducer, initialState);
    const { state: authState } = useAuth();

    // Load appointment data from AsyncStorage on app start
    useEffect(() => {
        const loadAppointment = async () => {
            try {
                const appointmentData = await AsyncStorage.getItem('appointment');

                if (appointmentData) {
                    const appointment = JSON.parse(appointmentData);
                    dispatch({ type: 'APPOINTMENT_SUCCESS', payload: appointment });
                }
            } catch (error) {
                console.error('Error loading appointment data:', error);
            }
        };

        if (authState.user) {
            loadAppointment();
        }
    }, [authState.user]);

    // Create appointment function that can be called with custom authentication handler
    const createAppointment = async (
        gender: Gender,
        appointmentDate: string,
        conditionType: ConditionType,
        addToQueue: boolean = true,
        onAuthError?: () => void
    ): Promise<boolean> => {
        try {
            if (!authState.user) {
                dispatch({ 
                    type: 'APPOINTMENT_FAILURE', 
                    payload: 'User must be logged in to create an appointment'
                });
                return false;
            }

            dispatch({ type: 'APPOINTMENT_REQUEST' });

            // Map condition type to urgency for API
            const urgencyMap: Record<ConditionType, string> = {
                'emergency': 'EMERGENCY',
                'elderly': 'HIGH',
                'child': 'LOW',
                'normal': 'NORMAL'
            };

            try {
                // Call the actual API
                const response = await appointmentService.createAppointment({
                    urgency: urgencyMap[conditionType],
                    appointment_date: addToQueue ? undefined : appointmentDate,
                    notes: `Patient Gender: ${gender}`
                });

                if (!response.isSuccess) {
                    // Check if this is an auth error
                    if (response.status === 401) {
                        console.error('Authentication error during appointment creation');
                        dispatch({
                            type: 'APPOINTMENT_FAILURE',
                            payload: 'Authentication failed'
                        });
                        if (onAuthError) {
                            onAuthError();
                            return false;
                        }
                        return false;
                    }
                    
                    dispatch({
                        type: 'APPOINTMENT_FAILURE',
                        payload: response.message || 'Failed to create appointment'
                    });
                    return false;
                }

                // Transform the API response to frontend format
                const appointment = appointmentService.transformAppointmentData(response.data);

                // For immediate appointments, save to active appointment in AsyncStorage
                if (addToQueue) {
                    await AsyncStorage.setItem('appointment', JSON.stringify(appointment));
                    dispatch({ type: 'APPOINTMENT_SUCCESS', payload: appointment });
                } else {
                    // Clear loading state for future appointments
                    dispatch({ type: 'APPOINTMENT_REQUEST' });
                    dispatch({ type: 'APPOINTMENT_FAILURE', payload: '' });
                }
                return true;
            } catch (error: any) {
                console.log('Error creating appointment:', error);
                
                if (error && error.status === 422) {
                    // Handle validation errors
                    let errorMessage = 'Validation error:';
                    if (error.errors) {
                        Object.entries(error.errors).forEach(([field, msgs]) => {
                            errorMessage += ` ${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`;
                        });
                    } else if (error.data && error.data.detail) {
                        // Extract validation error details
                        if (Array.isArray(error.data.detail)) {
                            error.data.detail.forEach((item: any) => {
                                errorMessage += ` ${item.loc.join('.')}: ${item.msg}`;
                            });
                        } else {
                            errorMessage += ` ${error.data.detail}`;
                        }
                    }
                    dispatch({
                        type: 'APPOINTMENT_FAILURE',
                        payload: errorMessage,
                    });
                    return false;
                }
                
                if (error && 
                    (error.message?.includes('session has expired') || 
                     error.message?.includes('validate credentials') ||
                     error.message?.includes('Authentication failed'))) {
                    
                    console.error('Authentication error during appointment creation:', error);
                    dispatch({
                        type: 'APPOINTMENT_FAILURE',
                        payload: 'Authentication failed'
                    });
                    if (onAuthError) {
                        onAuthError();
                        return false;
                    }
                }
                
                dispatch({
                    type: 'APPOINTMENT_FAILURE',
                    payload: error?.message || 'Failed to create appointment',
                });
                return false;
            }
        } catch (error) {
            dispatch({
                type: 'APPOINTMENT_FAILURE',
                payload: error instanceof Error ? error.message : 'Failed to create appointment',
            });
            return false;
        }
    };

    // Refresh queue status to get updated queue information from API
    const refreshQueueStatus = async () => {
        try {
            if (!state.appointment) {
                throw new Error('No active appointment found');
            }

            // Call the queue status API for the current appointment
            const queueResponse = await appointmentService.getQueueStatus(state.appointment.id);
            
            if (queueResponse.isSuccess && queueResponse.data) {
                const currentPosition = queueResponse.data.queue_position;
                const estimatedTime = queueResponse.data.estimated_wait_time || 0;
                
                dispatch({
                    type: 'UPDATE_QUEUE_POSITION',
                    payload: { currentPosition, estimatedTime },
                });
                
                // Update AsyncStorage as well
                if (state.appointment) {
                    const updatedAppointment = {
                        ...state.appointment,
                        currentPosition,
                        estimatedTime,
                    };
                    await AsyncStorage.setItem('appointment', JSON.stringify(updatedAppointment));
                }
            }
        } catch (error) {
            console.error('Error refreshing queue status:', error);
        }
    };

    // Clear appointment
    const clearAppointment = async () => {
        try {
            await AsyncStorage.removeItem('appointment');
            dispatch({ type: 'CLEAR_APPOINTMENT' });
        } catch (error) {
            console.error('Error clearing appointment:', error);
        }
    };

    // Clear error
    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    // Get all appointments for the current user
    const getAppointments = async (): Promise<Appointment[]> => {
        try {
            if (!authState.user) {
                console.log('User must be logged in to get appointments');
                throw new Error('User must be logged in to get appointments');
            }
            
            // Verify we have a token before making the request
            const token = await AsyncStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
            if (!token) {
                console.log('No auth token available for appointments request');
                throw new Error('Authentication token not found');
            }
            
            // Call the appointment service API to get real appointments
            console.log('Fetching appointments for user:', authState.user.id);
            const response = await appointmentService.getAppointments();
            
            if (response.isSuccess && response.data) {
                // Transform API data to frontend format
                const appointments = response.data.map(apiAppointment => 
                    appointmentService.transformAppointmentData(apiAppointment)
                );
                
                // Sort by creation date (newest first)
                appointments.sort((a, b) => {
                    // Handle potentially missing or malformed dates
                    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                    return dateB - dateA;
                });
                
                return appointments;
            }
            
            // If response was not successful
            if (!response.isSuccess) {
                console.error('Failed to get appointments:', response.message);
                throw new Error(response.message || 'Failed to get appointments');
            }
            
            return [];
        } catch (error) {
            console.error('Error getting appointments:', error);
            // Don't swallow the error - propagate it up
            throw error;
        }
    };

    // Cancel an appointment
    const cancelAppointment = async (appointmentId: string): Promise<void> => {
        try {
            if (!authState.user) {
                throw new Error('User must be logged in to cancel an appointment');
            }
            
            // Call the real appointment service to cancel
            await appointmentService.cancelAppointment(appointmentId);
            
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            throw error;
        }
    };

    return (
        <QueueContext.Provider
            value={{
                state,
                createAppointment,
                refreshQueueStatus,
                clearAppointment,
                clearError,
                getAppointments,
                cancelAppointment,
            }}
        >
            {children}
        </QueueContext.Provider>
    );
};

// Custom hook to use the queue context
export const useQueue = () => {
    const context = useContext(QueueContext);

    if (context === undefined) {
        throw new Error('useQueue must be used within a QueueProvider');
    }

    return context;
}; 