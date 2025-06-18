import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification, NotificationState } from '../types';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService } from '../services';
import { useAuth } from './AuthContext';
import { AUTH_CONFIG } from '../config/env';

// Initial state
const initialState: NotificationState = {
    notifications: [],
    loading: false,
    error: null,
};

// Actions
type NotificationAction =
    | { type: 'FETCH_NOTIFICATIONS_REQUEST' }
    | { type: 'FETCH_NOTIFICATIONS_SUCCESS'; payload: Notification[] }
    | { type: 'FETCH_NOTIFICATIONS_FAILURE'; payload: string }
    | { type: 'MARK_NOTIFICATION_READ'; payload: string }
    | { type: 'ADD_NOTIFICATION'; payload: Notification };

// Context values
interface NotificationsContextType {
    state: NotificationState;
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
}

// Create context
const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Reducer
function notificationsReducer(state: NotificationState, action: NotificationAction): NotificationState {
    switch (action.type) {
        case 'FETCH_NOTIFICATIONS_REQUEST':
            return {
                ...state,
                loading: true,
                error: null,
            };
        case 'FETCH_NOTIFICATIONS_SUCCESS':
            return {
                ...state,
                loading: false,
                notifications: action.payload,
            };
        case 'FETCH_NOTIFICATIONS_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case 'MARK_NOTIFICATION_READ':
            return {
                ...state,
                notifications: state.notifications.map(notification =>
                    notification.id === action.payload
                        ? { ...notification, read: true }
                        : notification
                ),
            };
        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [action.payload, ...state.notifications],
            };
        default:
            return state;
    }
}

// Provider
export const NotificationsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [state, dispatch] = useReducer(notificationsReducer, initialState);
    const { state: authState } = useAuth();

    // Fetch notifications only when user is authenticated
    useEffect(() => {
        const checkAuthAndFetchNotifications = async () => {
            // Check if user is authenticated
            const token = await AsyncStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
            if (token && authState.user) {
                fetchNotifications();
            }
        };

        checkAuthAndFetchNotifications();
    }, [authState.user]); // Re-run when auth state changes

    // Fetch all notifications
    const fetchNotifications = async () => {
        try {
            dispatch({ type: 'FETCH_NOTIFICATIONS_REQUEST' });
            const response = await notificationService.getNotifications();
            
            if (response.isSuccess) {
                const transformedNotifications = response.data.map(
                    notificationService.transformNotificationData
                );
                dispatch({ type: 'FETCH_NOTIFICATIONS_SUCCESS', payload: transformedNotifications });
            } else {
                dispatch({ type: 'FETCH_NOTIFICATIONS_FAILURE', payload: 'Failed to fetch notifications' });
            }
        } catch (error) {
            dispatch({
                type: 'FETCH_NOTIFICATIONS_FAILURE',
                payload: error instanceof Error ? error.message : 'Failed to fetch notifications',
            });
        }
    };

    // Mark a notification as read
    const markAsRead = async (notificationId: string) => {
        try {
            const response = await notificationService.markAsRead(notificationId);
            if (response.isSuccess) {
                dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notificationId });
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    return (
        <NotificationsContext.Provider value={{ state, fetchNotifications, markAsRead }}>
            {children}
        </NotificationsContext.Provider>
    );
};

// Hook
export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
}; 