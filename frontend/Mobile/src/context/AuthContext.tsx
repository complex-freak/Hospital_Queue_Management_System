import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '../types';

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
    | { type: 'PROFILE_UPDATE_FAILURE'; payload: string };

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
    register: (fullName: string, phoneNumber: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
    clearError: () => void;
    updateProfile: (updatedData: { fullName?: string, phoneNumber?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(authReducer, initialState);

    // Check if user is already logged in on app start
    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await AsyncStorage.getItem('user');

                if (userData) {
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

    // Login function - in real app, this would make an API call
    const login = async (phoneNumber: string, password: string) => {
        try {
            dispatch({ type: 'LOGIN_REQUEST' });

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In a real app, validate credentials with an API
            // For demo purposes, we'll do a simple validation
            if (phoneNumber.trim() === '' || password.trim() === '') {
                throw new Error('Phone number and password are required');
            }

            // Mock successful login
            const user: User = {
                id: '123',
                fullName: 'John Doe', // In real app, this would come from API
                phoneNumber,
                isAuthenticated: true,
            };

            // Save to AsyncStorage
            await AsyncStorage.setItem('user', JSON.stringify(user));

            dispatch({ type: 'LOGIN_SUCCESS', payload: user });
        } catch (error) {
            dispatch({
                type: 'LOGIN_FAILURE',
                payload: error instanceof Error ? error.message : 'Login failed'
            });
        }
    };

    // Register function - in real app, this would make an API call
    const register = async (fullName: string, phoneNumber: string, password: string) => {
        try {
            dispatch({ type: 'REGISTER_REQUEST' });

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // In a real app, validate and send data to an API
            // For demo purposes, we'll do a simple validation
            if (fullName.trim() === '' || phoneNumber.trim() === '' || password.trim() === '') {
                throw new Error('All fields are required');
            }

            // Mock successful registration
            const user: User = {
                id: '123',
                fullName,
                phoneNumber,
                isAuthenticated: true,
            };

            // Save to AsyncStorage
            await AsyncStorage.setItem('user', JSON.stringify(user));

            dispatch({ type: 'REGISTER_SUCCESS', payload: user });
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
            // Remove user data from AsyncStorage
            await AsyncStorage.removeItem('user');
            dispatch({ type: 'LOGOUT' });
        } catch (error) {
            console.error('Error during logout:', error);
        }
    };

    // Clear error
    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    // Update user profile
    const updateProfile = async (updatedData: { fullName?: string, phoneNumber?: string }) => {
        try {
            dispatch({ type: 'PROFILE_UPDATE_REQUEST' });

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (!state.user) {
                throw new Error('No authenticated user found');
            }

            // Update user data
            const updatedUser: User = {
                ...state.user,
                ...(updatedData.fullName && { fullName: updatedData.fullName }),
                ...(updatedData.phoneNumber && { phoneNumber: updatedData.phoneNumber }),
            };

            // Save to AsyncStorage
            await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

            dispatch({ type: 'PROFILE_UPDATE_SUCCESS', payload: updatedUser });
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