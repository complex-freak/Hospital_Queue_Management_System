import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueueProvider, useQueue } from '../../src/context/QueueContext';
import { AuthProvider } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appointment } from '../../src/types';

// Mock the AuthContext to provide a mock user
jest.mock('../../src/context/AuthContext', () => ({
    AuthProvider: ({ children }) => <>{children}</>,
    useAuth: () => ({
        state: {
            user: {
                id: '123',
                fullName: 'Test User',
                phoneNumber: '1234567890',
                isAuthenticated: true,
            },
            loading: false,
            error: null,
        },
    }),
}));

describe('QueueContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        AsyncStorage.getItem.mockClear();
        AsyncStorage.setItem.mockClear();
        AsyncStorage.removeItem.mockClear();
    });

    it('provides initial queue state', async () => {
        // Mock AsyncStorage to return no appointment
        AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

        const wrapper = ({ children }) => (
            <AuthProvider>
                <QueueProvider>{children}</QueueProvider>
            </AuthProvider>
        );

        const { result } = renderHook(() => useQueue(), { wrapper });

        // Initial state should have no appointment
        expect(result.current.state.appointment).toBeNull();
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.error).toBeNull();
    });

    it('loads appointment from AsyncStorage on mount', async () => {
        // Mock appointment in AsyncStorage
        const mockAppointment: Appointment = {
            id: 'appt123',
            patientName: 'Test User',
            gender: 'male',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            conditionType: 'normal',
            queueNumber: 123,
            currentPosition: 5,
            estimatedTime: 25,
            doctorName: 'Dr. Test',
            status: 'waiting',
            createdAt: new Date().toISOString(),
        };

        AsyncStorage.getItem.mockImplementation((key) => {
            if (key === 'appointment') {
                return Promise.resolve(JSON.stringify(mockAppointment));
            }
            return Promise.resolve(null);
        });

        const wrapper = ({ children }) => (
            <AuthProvider>
                <QueueProvider>{children}</QueueProvider>
            </AuthProvider>
        );

        const { result } = renderHook(() => useQueue(), { wrapper });

        // Wait for appointment to be loaded
        await waitFor(() => {
            expect(result.current.state.appointment).toEqual(mockAppointment);
        });

        // Appointment should be loaded from AsyncStorage
        expect(result.current.state.loading).toBe(false);
        expect(result.current.state.error).toBeNull();
    });

    it('creates a new appointment', async () => {
        AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
        AsyncStorage.setItem.mockImplementation(() => Promise.resolve());

        const wrapper = ({ children }) => (
            <AuthProvider>
                <QueueProvider>{children}</QueueProvider>
            </AuthProvider>
        );

        const { result } = renderHook(() => useQueue(), { wrapper });

        // Create a new appointment
        await result.current.createAppointment('male', '1990-01-01', 'normal');

        // Wait for appointment creation to complete
        await waitFor(() => {
            expect(result.current.state.loading).toBe(false);
            expect(result.current.state.appointment).toBeTruthy();
        });

        // Should have an appointment with correct data
        expect(result.current.state.appointment.patientName).toBe('Test User');
        expect(result.current.state.appointment.gender).toBe('male');
        expect(result.current.state.appointment.conditionType).toBe('normal');
        expect(result.current.state.error).toBeNull();

        // Should have saved to AsyncStorage
        expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('clears an appointment', async () => {
        // Set up a state with an appointment
        const mockAppointment: Appointment = {
            id: 'appt123',
            patientName: 'Test User',
            gender: 'male',
            dateOfBirth: '1990-01-01',
            phoneNumber: '1234567890',
            conditionType: 'normal',
            queueNumber: 123,
            currentPosition: 5,
            estimatedTime: 25,
            doctorName: 'Dr. Test',
            status: 'waiting',
            createdAt: new Date().toISOString(),
        };

        AsyncStorage.getItem.mockImplementation(() => Promise.resolve(JSON.stringify(mockAppointment)));
        AsyncStorage.removeItem.mockImplementation(() => Promise.resolve());

        const wrapper = ({ children }) => (
            <AuthProvider>
                <QueueProvider>{children}</QueueProvider>
            </AuthProvider>
        );

        const { result } = renderHook(() => useQueue(), { wrapper });

        // Wait for appointment to be loaded
        await waitFor(() => {
            expect(result.current.state.appointment).toEqual(mockAppointment);
        });

        // Clear the appointment
        await result.current.clearAppointment();

        // Appointment should be cleared
        expect(result.current.state.appointment).toBeNull();
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('appointment');
    });
}); 