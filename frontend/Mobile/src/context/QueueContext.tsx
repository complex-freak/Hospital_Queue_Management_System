import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appointment, ConditionType, Gender, QueueState } from '../types';
import { useAuth } from './AuthContext';

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
        dateOfBirth: string,
        conditionType: ConditionType
    ) => Promise<void>;
    refreshQueueStatus: () => Promise<void>;
    clearAppointment: () => Promise<void>;
    clearError: () => void;
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

    // Create appointment function - in real app, this would make an API call
    const createAppointment = async (
        gender: Gender,
        dateOfBirth: string,
        conditionType: ConditionType
    ) => {
        try {
            if (!authState.user) {
                throw new Error('User must be logged in to create an appointment');
            }

            dispatch({ type: 'APPOINTMENT_REQUEST' });

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Calculate queue number and position based on condition type
            // In a real app, this would come from the server
            // Here, we're simulating priority based on condition type
            let queuePosition = 1;
            switch (conditionType) {
                case 'emergency':
                    queuePosition = 1;
                    break;
                case 'elderly':
                    queuePosition = 3;
                    break;
                case 'child':
                    queuePosition = 5;
                    break;
                case 'normal':
                    queuePosition = 8;
                    break;
            }

            // Estimated time based on position (5 mins per position)
            const estimatedTime = queuePosition * 5;

            // Create appointment object
            const appointment: Appointment = {
                id: Math.random().toString(36).substring(2, 15),
                patientName: authState.user.fullName,
                gender,
                dateOfBirth,
                phoneNumber: authState.user.phoneNumber,
                conditionType,
                queueNumber: Math.floor(Math.random() * 1000) + 1, // Random queue number for demo
                currentPosition: queuePosition,
                estimatedTime,
                doctorName: 'Dr. Hamisi Mwangi', // Mock doctor name
                status: 'waiting',
                createdAt: new Date().toISOString(),
            };

            // Save to AsyncStorage
            await AsyncStorage.setItem('appointment', JSON.stringify(appointment));

            dispatch({ type: 'APPOINTMENT_SUCCESS', payload: appointment });
        } catch (error) {
            dispatch({
                type: 'APPOINTMENT_FAILURE',
                payload: error instanceof Error ? error.message : 'Failed to create appointment',
            });
        }
    };

    // Refresh queue status - in real app, this would fetch updated queue data from API
    const refreshQueueStatus = async () => {
        try {
            if (!state.appointment) {
                throw new Error('No active appointment found');
            }

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Simulate queue position update
            // In a real app, fetch the current position from the server
            const currentPosition = Math.max(1, state.appointment.currentPosition - 1);
            const estimatedTime = currentPosition * 5;

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

    return (
        <QueueContext.Provider
            value={{
                state,
                createAppointment,
                refreshQueueStatus,
                clearAppointment,
                clearError,
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