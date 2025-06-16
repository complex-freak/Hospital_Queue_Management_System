import React, { createContext, useContext, useReducer, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification } from '../types';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';

// State type
export interface NotificationsState {
    notifications: Notification[];
    loading: boolean;
    error: string | null;
    isPermissionGranted: boolean;
}

// Initial state
const initialState: NotificationsState = {
    notifications: [],
    loading: false,
    error: null,
    isPermissionGranted: false,
};

// Action types
type NotificationsAction =
    | { type: 'FETCH_NOTIFICATIONS_REQUEST' }
    | { type: 'FETCH_NOTIFICATIONS_SUCCESS'; payload: Notification[] }
    | { type: 'FETCH_NOTIFICATIONS_FAILURE'; payload: string }
    | { type: 'ADD_NOTIFICATION'; payload: Notification }
    | { type: 'MARK_AS_READ'; payload: string }
    | { type: 'MARK_ALL_AS_READ' }
    | { type: 'DELETE_NOTIFICATION'; payload: string }
    | { type: 'CLEAR_ALL_NOTIFICATIONS' }
    | { type: 'SET_PERMISSION_STATUS'; payload: boolean }
    | { type: 'CLEAR_ERROR' };

// Reducer
function notificationsReducer(state: NotificationsState, action: NotificationsAction): NotificationsState {
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
                notifications: action.payload,
                loading: false,
                error: null,
            };
        case 'FETCH_NOTIFICATIONS_FAILURE':
            return {
                ...state,
                loading: false,
                error: action.payload,
            };
        case 'ADD_NOTIFICATION':
            return {
                ...state,
                notifications: [action.payload, ...state.notifications],
            };
        case 'MARK_AS_READ':
            return {
                ...state,
                notifications: state.notifications.map(notification =>
                    notification.id === action.payload
                        ? { ...notification, read: true }
                        : notification
                ),
            };
        case 'MARK_ALL_AS_READ':
            return {
                ...state,
                notifications: state.notifications.map(notification => ({
                    ...notification,
                    read: true,
                })),
            };
        case 'DELETE_NOTIFICATION':
            return {
                ...state,
                notifications: state.notifications.filter(notification => notification.id !== action.payload),
            };
        case 'CLEAR_ALL_NOTIFICATIONS':
            return {
                ...state,
                notifications: [],
            };
        case 'SET_PERMISSION_STATUS':
            return {
                ...state,
                isPermissionGranted: action.payload,
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
interface NotificationsContextType {
    state: NotificationsState;
    fetchNotifications: () => Promise<void>;
    addNotification: (title: string, message: string) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    deleteNotification: (id: string) => Promise<void>;
    clearAllNotifications: () => Promise<void>;
    requestPermissions: () => Promise<void>;
    clearError: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

// Provider component
export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(notificationsReducer, initialState);

    // Configure Expo Notifications handler
    useEffect(() => {
        ExpoNotifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                shouldShowBanner: true,
                shouldShowList: true,
            }),
        });

        // Check notification permissions on mount
        checkPermissions();

        // Load notifications from AsyncStorage
        loadNotifications();
    }, []);

    // Check for notification permissions
    const checkPermissions = async () => {
        try {
            const { status } = await ExpoNotifications.getPermissionsAsync();
            dispatch({ type: 'SET_PERMISSION_STATUS', payload: status === 'granted' });
        } catch (error) {
            console.error('Error checking notification permissions:', error);
        }
    };

    // Load notifications from AsyncStorage
    const loadNotifications = async () => {
        try {
            dispatch({ type: 'FETCH_NOTIFICATIONS_REQUEST' });
            const notificationsData = await AsyncStorage.getItem('notifications');

            if (notificationsData) {
                const notifications = JSON.parse(notificationsData);
                dispatch({ type: 'FETCH_NOTIFICATIONS_SUCCESS', payload: notifications });
            } else {
                dispatch({ type: 'FETCH_NOTIFICATIONS_SUCCESS', payload: [] });
            }
        } catch (error) {
            console.error('Error loading notifications:', error);
            dispatch({
                type: 'FETCH_NOTIFICATIONS_FAILURE',
                payload: error instanceof Error ? error.message : 'Error loading notifications',
            });
        }
    };

    // Fetch notifications - in a real app, this would make an API call
    const fetchNotifications = async () => {
        try {
            dispatch({ type: 'FETCH_NOTIFICATIONS_REQUEST' });

            // For now, we'll just reload from AsyncStorage
            // In a real app, this would be an API call
            const notificationsData = await AsyncStorage.getItem('notifications');
            const notifications = notificationsData ? JSON.parse(notificationsData) : [];

            dispatch({ type: 'FETCH_NOTIFICATIONS_SUCCESS', payload: notifications });
        } catch (error) {
            dispatch({
                type: 'FETCH_NOTIFICATIONS_FAILURE',
                payload: error instanceof Error ? error.message : 'Error fetching notifications',
            });
        }
    };

    // Add a new notification
    const addNotification = async (title: string, message: string) => {
        try {
            const newNotification: Notification = {
                id: Math.random().toString(36).substring(2, 15),
                title,
                message,
                read: false,
                createdAt: new Date().toISOString(),
            };

            // Update state
            dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

            // Update AsyncStorage
            const updatedNotifications = [newNotification, ...state.notifications];
            await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));

            // Show notification if permissions granted
            if (state.isPermissionGranted) {
                await ExpoNotifications.scheduleNotificationAsync({
                    content: {
                        title,
                        body: message,
                    },
                    trigger: null, // Show immediately
                });
            }
        } catch (error) {
            console.error('Error adding notification:', error);
        }
    };

    // Mark a notification as read
    const markAsRead = async (id: string) => {
        try {
            dispatch({ type: 'MARK_AS_READ', payload: id });

            // Update in AsyncStorage
            const updatedNotifications = state.notifications.map(notification =>
                notification.id === id ? { ...notification, read: true } : notification
            );
            await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            dispatch({ type: 'MARK_ALL_AS_READ' });

            // Update in AsyncStorage
            const updatedNotifications = state.notifications.map(notification => ({
                ...notification,
                read: true,
            }));
            await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
        }
    };

    // Delete a notification
    const deleteNotification = async (id: string) => {
        try {
            dispatch({ type: 'DELETE_NOTIFICATION', payload: id });

            // Update in AsyncStorage
            const updatedNotifications = state.notifications.filter(notification => notification.id !== id);
            await AsyncStorage.setItem('notifications', JSON.stringify(updatedNotifications));
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    // Clear all notifications
    const clearAllNotifications = async () => {
        try {
            dispatch({ type: 'CLEAR_ALL_NOTIFICATIONS' });

            // Update in AsyncStorage
            await AsyncStorage.setItem('notifications', JSON.stringify([]));
        } catch (error) {
            console.error('Error clearing notifications:', error);
        }
    };

    // Request notification permissions
    const requestPermissions = async () => {
        try {
            const { status } = await ExpoNotifications.requestPermissionsAsync();
            dispatch({ type: 'SET_PERMISSION_STATUS', payload: status === 'granted' });

            if (status !== 'granted') {
                throw new Error('Notification permissions not granted');
            }
        } catch (error) {
            console.error('Error requesting notification permissions:', error);
            dispatch({
                type: 'FETCH_NOTIFICATIONS_FAILURE',
                payload: error instanceof Error ? error.message : 'Error requesting permissions',
            });
        }
    };

    // Clear error
    const clearError = () => {
        dispatch({ type: 'CLEAR_ERROR' });
    };

    return (
        <NotificationsContext.Provider
            value={{
                state,
                fetchNotifications,
                addNotification,
                markAsRead,
                markAllAsRead,
                deleteNotification,
                clearAllNotifications,
                requestPermissions,
                clearError,
            }}
        >
            {children}
        </NotificationsContext.Provider>
    );
};

// Custom hook to use the notifications context
export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
}; 