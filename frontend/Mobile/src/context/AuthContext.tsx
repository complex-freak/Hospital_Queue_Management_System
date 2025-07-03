import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { User, AuthState } from '../types';
import { authService } from '../services';
import { STORAGE_KEYS, AUTH_CONFIG } from '../config/env';

// Initial state
const initialState: AuthState = {
    user: null,
    loading: true,
    error: null,
};

// Action types
type AuthAction =
    | { type: 'LOGIN_REQUEST' }
    | { type: 'LOGIN_SUCCESS'; payload: User }
    | { type: 'LOGIN_FAILURE'; payload: string }
    | { type: 'REGISTER_REQUEST' }
    | { type: 'REGISTER_SUCCESS'; payload: User }
    | { type: 'REGISTER_FAILURE'; payload: string }
    | { type: 'LOGOUT' }
    | { type: 'CLEAR_ERROR' }
    | { type: 'PROFILE_UPDATE_REQUEST' }
    | { type: 'PROFILE_UPDATE_SUCCESS'; payload: User }
    | { type: 'PROFILE_UPDATE_FAILURE'; payload: string }
    | { type: 'TOKEN_EXPIRED' };

// Reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
    switch (action.type) {
        case 'LOGIN_REQUEST':
        case 'REGISTER_REQUEST':
            return {
                ...state,
                loading: true,
                error: null,
            };
        case 'LOGIN_SUCCESS':
        case 'REGISTER_SUCCESS':
            return {
                ...state,
                user: action.payload,
                loading: false,
                error: null,
            };
        case 'LOGIN_FAILURE':
        case 'REGISTER_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case 'LOGOUT':
        case 'TOKEN_EXPIRED':
            return {
                ...state,
                user: null,
                loading: false,
                error: null,
            };
        case 'CLEAR_ERROR':
            return {
                ...state,
                error: null,
            };
        case 'PROFILE_UPDATE_REQUEST':
            return {
                ...state,
                loading: true,
                error: null,
            };
        case 'PROFILE_UPDATE_SUCCESS':
            return {
                ...state,
                user: action.payload,
                loading: false,
                error: null,
            };
        case 'PROFILE_UPDATE_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        default:
            return state;
    }
}

// Create context
interface AuthContextType {
    state: AuthState;
    login: (phoneNumber: string, password: string) => Promise<void>;
    register: (firstName: string, lastName: string, phoneNumber: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    updateProfile: (updatedData: {
        email?: string;
        dateOfBirth?: string;
        gender?: 'male' | 'female' | 'other';
        address?: string;
        emergencyContact?: string;
        emergencyContactName?: string;
        emergencyContactRelationship?: string;
    }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Check if user is already logged in on app start
    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem(STORAGE_KEYS.USER_DATA);
                const token = await AsyncStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);

                if (userData && token) {
                    const user = JSON.parse(userData);
                    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
                } else {
                    dispatch({ type: 'LOGOUT' });
                }
            } catch (error) {
                console.error('Error loading user data:', error);
                dispatch({ type: 'LOGOUT' });
            }
        };

        loadUser();
    }, []);

    // Listen for token expiration events
    useEffect(() => {
        const tokenInvalidSubscription = DeviceEventEmitter.addListener(
            'auth_token_invalid',
            handleTokenExpired
        );

        return () => {
            tokenInvalidSubscription.remove();
        };
    }, []);

    // Handle token expiration
    const handleTokenExpired = async () => {
        console.log('Token expired or invalid, logging out user');
        try {
            // Remove tokens and user data
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
            await AsyncStorage.removeItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
            await AsyncStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
            
            // Update auth state
            dispatch({ type: 'TOKEN_EXPIRED' });
        } catch (error) {
            console.error('Error handling token expiration:', error);
            dispatch({ type: 'LOGOUT' });
        }
    };

    // Login function using the auth service
    const login = async (phoneNumber: string, password: string) => {
        try {
            dispatch({ type: 'LOGIN_REQUEST' });

            // Call auth service login
            const response = await authService.login({
                phone_number: phoneNumber,
                password: password
            });

            // If login was successful, fetch user profile
            if (response.isSuccess) {
                const profileResponse = await authService.getProfile();
                
                if (profileResponse.isSuccess) {
                    // Transform backend user data to frontend User format
                    const user = authService.transformUserResponse(profileResponse.data);

                    // Save to AsyncStorage
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

                    dispatch({ type: 'LOGIN_SUCCESS', payload: user });
                } else {
                    throw new Error('Failed to retrieve user profile');
                }
            } else {
                throw new Error('Login failed');
            }
        } catch (error) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error instanceof Error ? error.message : 'Login failed'
            });
        }
    };

    // Register function using the auth service
    const register = async (firstName: string, lastName: string, phoneNumber: string, password: string) => {
        try {
            dispatch({ type: 'REGISTER_REQUEST' });

            // Call auth service register
            const response = await authService.register({
                first_name: firstName,
                last_name: lastName,
                phone_number: phoneNumber,
                password: password
            });

            // If registration was successful
            if (response.isSuccess) {
                // Login after successful registration
                const loginResponse = await authService.login({
                    phone_number: phoneNumber,
                    password: password
                });

                if (loginResponse.isSuccess) {
                    // Get user profile
                    const profileResponse = await authService.getProfile();
                    
                    if (profileResponse.isSuccess) {
                        // Transform backend user data to frontend User format
                        const user = authService.transformUserResponse(profileResponse.data);

                        // Explicitly ensure isProfileComplete is set
                        user.isProfileComplete = !!(
                            profileResponse.data.gender && 
                            profileResponse.data.date_of_birth && 
                            profileResponse.data.address && 
                            profileResponse.data.emergency_contact
                        );

                        // Save to AsyncStorage
                        await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));

                        dispatch({ type: 'REGISTER_SUCCESS', payload: user });
                    } else {
                        throw new Error('Failed to retrieve user profile');
                    }
                } else {
                    throw new Error('Registration successful, but login failed');
                }
            } else {
                throw new Error('Registration failed');
            }
        } catch (error) {
            dispatch({
                type: 'REGISTER_FAILURE',
                payload: error instanceof Error ? error.message : 'Registration failed'
            });
        }
    };

    // Logout function
    const logout = async () => {
        try {
            // Remove tokens and user data
            await AsyncStorage.removeItem(STORAGE_KEYS.USER_DATA);
            await AsyncStorage.removeItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
            await AsyncStorage.removeItem(AUTH_CONFIG.REFRESH_TOKEN_KEY);
            await authService.logout();
            dispatch({ type: 'LOGOUT' });
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    // Clear error
    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    // Update user profile using the auth service
    const updateProfile = async (updatedData: {
        email?: string;
        dateOfBirth?: string;
        gender?: 'male' | 'female' | 'other';
        address?: string;
        emergencyContact?: string;
        emergencyContactName?: string;
        emergencyContactRelationship?: string;
    }) => {
        try {
            dispatch({ type: 'PROFILE_UPDATE_REQUEST' });

            if (!state.user) {
                throw new Error('No authenticated user found');
            }

            // Transform frontend data to backend format
            const profileData = {
                email: updatedData.email,
                date_of_birth: updatedData.dateOfBirth,
                gender: updatedData.gender,
                address: updatedData.address,
                emergency_contact: updatedData.emergencyContact,
                emergency_contact_name: updatedData.emergencyContactName,
                emergency_contact_relationship: updatedData.emergencyContactRelationship,
            };

            // Call auth service to update profile
            const response = await authService.updateProfile(profileData);

            if (response.isSuccess) {
                // Get updated profile
                const profileResponse = await authService.getProfile();
                
                if (profileResponse.isSuccess) {
                    // Transform backend user data to frontend User format
                    const updatedUser = authService.transformUserResponse(profileResponse.data);

                    // Save to AsyncStorage
                    await AsyncStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(updatedUser));

                    dispatch({ type: 'PROFILE_UPDATE_SUCCESS', payload: updatedUser });
                } else {
                    throw new Error('Failed to retrieve updated user profile');
                }
            } else {
                throw new Error('Profile update failed');
            }
        } catch (error) {
            dispatch({
                type: 'PROFILE_UPDATE_FAILURE',
                payload: error instanceof Error ? error.message : 'Profile update failed'
            });
        }
    };

    return (
        <AuthContext.Provider
            value={{
                state,
                login,
                register,
                logout,
                clearError,
                updateProfile,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the auth context
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
}; 