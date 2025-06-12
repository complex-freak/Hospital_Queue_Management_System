import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

describe('AuthContext', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        AsyncStorage.getItem.mockClear();
        AsyncStorage.setItem.mockClear();
        AsyncStorage.removeItem.mockClear();
    });

    it('provides initial authentication state', async () => {
        // Mock AsyncStorage to return no user
        AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

        const wrapper = ({ children }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        // Wait for useEffect to complete
        await waitFor(() => {
            expect(result.current.state.loading).toBe(false);
        });

        // After loading, user should still be null because AsyncStorage returned null
        expect(result.current.state.user).toBeNull();
        expect(result.current.state.error).toBeNull();
    });

    it('loads user from AsyncStorage on mount', async () => {
        // Mock user in AsyncStorage
        const mockUser = {
            id: '123',
            fullName: 'Test User',
            phoneNumber: '1234567890',
            isAuthenticated: true,
        };

        AsyncStorage.getItem.mockImplementation(() => Promise.resolve(JSON.stringify(mockUser)));

        const wrapper = ({ children }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        // Wait for useEffect to complete
        await waitFor(() => {
            expect(result.current.state.loading).toBe(false);
            expect(result.current.state.user).toEqual(mockUser);
        });

        // User should be loaded from AsyncStorage
        expect(result.current.state.error).toBeNull();
    });

    it('handles login successfully', async () => {
        AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
        AsyncStorage.setItem.mockImplementation(() => Promise.resolve());

        const wrapper = ({ children }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        // Wait for initial loading
        await waitFor(() => {
            expect(result.current.state.loading).toBe(false);
        });

        // Perform login
        await act(async () => {
            result.current.login('1234567890', 'password123');

            // Wait for login to complete
            await waitFor(() => {
                expect(result.current.state.loading).toBe(false);
                expect(result.current.state.user).toBeTruthy();
            });
        });

        // Should be logged in
        expect(result.current.state.user.phoneNumber).toBe('1234567890');
        expect(result.current.state.error).toBeNull();

        // Should have saved to AsyncStorage
        expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('handles logout', async () => {
        // Set up a logged-in state
        const mockUser = {
            id: '123',
            fullName: 'Test User',
            phoneNumber: '1234567890',
            isAuthenticated: true,
        };

        AsyncStorage.getItem.mockImplementation(() => Promise.resolve(JSON.stringify(mockUser)));
        AsyncStorage.removeItem.mockImplementation(() => Promise.resolve());

        const wrapper = ({ children }) => (
            <AuthProvider>{children}</AuthProvider>
        );

        const { result } = renderHook(() => useAuth(), { wrapper });

        // Wait for useEffect to complete
        await waitFor(() => {
            expect(result.current.state.user).toEqual(mockUser);
        });

        // Perform logout
        await act(async () => {
            await result.current.logout();
        });

        // Should be logged out
        expect(result.current.state.user).toBeNull();
        expect(AsyncStorage.removeItem).toHaveBeenCalledWith('user');
    });
}); 