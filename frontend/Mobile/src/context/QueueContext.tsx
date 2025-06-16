import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appointment, ConditionType, Gender, QueueState } from '../types';
import { useAuth } from './AuthContext';
import { format, addDays } from 'date-fns';

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

    // Create appointment function - in real app, this would make an API call
    const createAppointment = async (
        gender: Gender,
        appointmentDate: string,
        conditionType: ConditionType,
        addToQueue: boolean = true
    ) => {
        try {
            if (!authState.user) {
                throw new Error('User must be logged in to create an appointment');
            }

            dispatch({ type: 'APPOINTMENT_REQUEST' });

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Calculate queue number and position only if adding to queue
            let queuePosition = 0;
            let estimatedTime = 0;
            let queueNumber = 0;
            let status: 'waiting' | 'scheduled' = 'scheduled';
            
            if (addToQueue) {
                // Calculate based on condition type
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
                estimatedTime = queuePosition * 5;
                queueNumber = Math.floor(Math.random() * 1000) + 1; // Random queue number for demo
                status = 'waiting';
            }

            // Create appointment object
            const appointment: Appointment = {
                id: Math.random().toString(36).substring(2, 15),
                patientName: authState.user.fullName,
                gender,
                dateOfBirth: appointmentDate,
                phoneNumber: authState.user.phoneNumber,
                conditionType,
                queueNumber,
                currentPosition: queuePosition,
                estimatedTime,
                doctorName: 'Dr. Hamisi Mwangi', // Mock doctor name
                status,
                createdAt: new Date().toISOString(),
            };

            // For immediate appointments, save to active appointment in AsyncStorage
            if (addToQueue) {
                await AsyncStorage.setItem('appointment', JSON.stringify(appointment));
            }
            
            // Save to appointments list in AsyncStorage
            const storedAppointments = await AsyncStorage.getItem('appointments');
            let appointments: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];
            appointments.push(appointment);
            await AsyncStorage.setItem('appointments', JSON.stringify(appointments));

            // Only update state for immediate appointments
            if (addToQueue) {
                dispatch({ type: 'APPOINTMENT_SUCCESS', payload: appointment });
            } else {
                // Clear loading state for future appointments
                dispatch({ type: 'APPOINTMENT_REQUEST' });
                dispatch({ type: 'APPOINTMENT_FAILURE', payload: '' });
            }
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

    // Get all appointments for the current user
    const getAppointments = async (): Promise<Appointment[]> => {
        try {
            if (!authState.user) {
                throw new Error('User must be logged in to get appointments');
            }
            
            // Try to get appointments from AsyncStorage first
            const storedAppointments = await AsyncStorage.getItem('appointments');
            let appointments: Appointment[] = storedAppointments ? JSON.parse(storedAppointments) : [];
            
            // Add current active appointment if exists and not already in the list
            if (state.appointment && !appointments.some(a => a.id === state.appointment?.id)) {
                appointments.push(state.appointment);
            }
            
            // If no appointments yet, add some mock ones
            if (appointments.length === 0) {
                // Add some mock appointments with different statuses
                appointments.push({
                    id: 'appt-001',
                    patientName: authState.user.fullName,
                    gender: 'male',
                    dateOfBirth: '1990-01-15',
                    phoneNumber: authState.user.phoneNumber,
                    conditionType: 'normal',
                    queueNumber: 124,
                    currentPosition: 0,
                    estimatedTime: 0,
                    doctorName: 'Dr. Sarah Johnson',
                    status: 'completed',
                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
                });
                
                appointments.push({
                    id: 'appt-002',
                    patientName: authState.user.fullName,
                    gender: 'male',
                    dateOfBirth: '1990-01-15',
                    phoneNumber: authState.user.phoneNumber,
                    conditionType: 'elderly',
                    queueNumber: 86,
                    currentPosition: 0,
                    estimatedTime: 0,
                    doctorName: 'Dr. Michael Kariuki',
                    status: 'cancelled',
                    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
                });
                
                // Add a future appointment
                appointments.push({
                    id: 'appt-003',
                    patientName: authState.user.fullName,
                    gender: 'male',
                    dateOfBirth: format(addDays(new Date(), 5), 'dd/MM/yyyy'),
                    phoneNumber: authState.user.phoneNumber,
                    conditionType: 'normal',
                    queueNumber: 0,
                    currentPosition: 0,
                    estimatedTime: 0,
                    doctorName: 'Dr. Jane Smith',
                    status: 'scheduled',
                    createdAt: new Date().toISOString(),
                });
                
                // Save mock appointments to storage
                await AsyncStorage.setItem('appointments', JSON.stringify(appointments));
            }
            
            // Sort by creation date (newest first)
            appointments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            
            return appointments;
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
            
            // In a real app, this would call an API endpoint
            // For now, we'll just log it
            console.log(`Cancelling appointment ${appointmentId}`);
            
            // Actual implementation would be something like:
            // await appointmentService.cancelAppointment(appointmentId);
        } catch (error) {
            console.error('Error cancelling appointment:', error);
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