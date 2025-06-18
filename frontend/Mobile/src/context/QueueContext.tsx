import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appointment, ConditionType, Gender, QueueState } from '../types';
import { useAuth } from './AuthContext';
import { format, addDays } from 'date-fns';
import { appointmentService } from '../services';

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
    ) => Promise<void>;
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
    ) => {
        try {
            if (!authState.user) {
                throw new Error('User must be logged in to create an appointment');
            }

            dispatch({ type: 'APPOINTMENT_REQUEST' });

            // Map condition type to urgency for API
            const urgencyMap: Record<ConditionType, string> = {
                'emergency': 'emergency',
                'elderly': 'high',
                'child': 'low',
                'normal': 'normal'
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
                        if (onAuthError) {
                            onAuthError();
                            return;
                        }
                        throw new Error('Authentication failed');
                    }
                    
                    throw new Error(response.message || 'Failed to create appointment');
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
            } catch (error) {
                if (error instanceof Error && 
                    (error.message.includes('session has expired') || 
                     error.message.includes('validate credentials') ||
                     error.message.includes('Authentication failed'))) {
                    
                    console.error('Authentication error during appointment creation:', error);
                    if (onAuthError) {
                        onAuthError();
                        return;
                    }
                }
                
                throw error;
            }
        } catch (error) {
            dispatch({
                type: 'APPOINTMENT_FAILURE',
                payload: error instanceof Error ? error.message : 'Failed to create appointment',
            });
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
                throw new Error('User must be logged in to get appointments');
            }
            
            // Call the appointment service API to get real appointments
            const response = await appointmentService.getAppointments();
            
            if (response.isSuccess && response.data) {
                // Transform API data to frontend format
                const appointments = response.data.map(apiAppointment => 
                    appointmentService.transformAppointmentData(apiAppointment)
                );
                
                // Sort by creation date (newest first)
                appointments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                
                return appointments;
            }
            
            return [];
        } catch (error) {
            console.error('Error getting appointments:', error);
            return [];
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