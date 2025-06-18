import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AUTH_CONFIG } from '../config/env';
import { httpClient } from '../services';
import { DeviceEventEmitter } from 'react-native';

/**
 * Hook to ensure API calls are made with valid authentication
 * This provides a way for components to check if the user is properly authenticated
 * before making API calls, avoiding the "Could not validate credentials" error
 */
export const useAuthenticatedAPI = () => {
    const { state: authState, logout } = useAuth();
    const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(true);

    // Verify token is present and valid
    const verifyToken = useCallback(async () => {
        try {
            setIsChecking(true);
            const token = await AsyncStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
            
            if (!token) {
                setIsTokenValid(false);
                return false;
            }
            
            // Token exists, now check if user object exists in auth state
            if (!authState.user) {
                setIsTokenValid(false);
                return false;
            }
            
            setIsTokenValid(true);
            return true;
        } catch (error) {
            console.error('Error verifying token:', error);
            setIsTokenValid(false);
            return false;
        } finally {
            setIsChecking(false);
        }
    }, [authState.user]);

    // Refresh token validation when auth state changes
    useEffect(() => {
        verifyToken();
    }, [verifyToken, authState.user]);

    // Listen for token invalidation events
    useEffect(() => {
        const handleTokenInvalid = () => {
            console.log('Token invalidated in useAuthenticatedAPI');
            setIsTokenValid(false);
        };

        // Add event listener for token invalidation using DeviceEventEmitter
        DeviceEventEmitter.addListener('auth_token_invalid', handleTokenInvalid);

        // Clean up the event listener
        return () => {
            DeviceEventEmitter.removeAllListeners('auth_token_invalid');
        };
    }, []);

    // Function to make an authenticated API call
    const makeAuthenticatedRequest = useCallback(async <T>(
        apiCallFn: () => Promise<T>,
        onAuthError?: () => void
    ): Promise<T | null> => {
        try {
            // Verify token before making request
            const isValid = await verifyToken();
            
            if (!isValid) {
                console.error('Cannot make API call: Not authenticated');
                onAuthError?.();
                return null;
            }
            
            // Make the API call
            return await apiCallFn();
        } catch (error) {
            // Check if this is an auth error
            if (
                error instanceof Error && 
                (error.message.includes('session has expired') || 
                 error.message.includes('validate credentials'))
            ) {
                console.error('Authentication error during API call:', error);
                onAuthError?.();
                return null;
            }
            
            // Re-throw other errors
            throw error;
        }
    }, [verifyToken]);

    return {
        isAuthenticated: isTokenValid,
        isLoading: isChecking,
        makeAuthenticatedRequest,
        verifyToken
    };
};

export default useAuthenticatedAPI; 