import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Notification, NotificationState } from '../types';
import * as ExpoNotifications from 'expo-notifications';
import { Platform } from 'react-native';
import { notificationService } from '../services';
import { pushNotificationService } from '../services/notifications/pushNotificationService';
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
    registerForPushNotifications: () => Promise<string | null>;
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
    
    // References to notification listeners
    const notificationListener = useRef<ExpoNotifications.Subscription | null>(null);
    const responseListener = useRef<ExpoNotifications.Subscription | null>(null);

    // Register for push notifications when authenticated
    useEffect(() => {
        const setupPushNotifications = async () => {
            if (authState.user) {
                await registerForPushNotifications();
            }
        };
        
        setupPushNotifications();
        
        // Cleanup function
        return () => {
            if (notificationListener.current) {
                pushNotificationService.removeNotificationSubscription(notificationListener.current);
            }
            if (responseListener.current) {
                pushNotificationService.removeNotificationSubscription(responseListener.current);
            }
        };
    }, [authState.user]);

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
    
    // Update badge count when notifications change
    useEffect(() => {
        const updateBadgeCount = async () => {
            if (Platform.OS === 'ios' || Platform.OS === 'android') {
                const unreadCount = state.notifications.filter(n => !n.read).length;
                await pushNotificationService.setBadgeCount(unreadCount);
            }
        };
        
        updateBadgeCount();
    }, [state.notifications]);

    // Register for push notifications
    const registerForPushNotifications = async (): Promise<string | null> => {
        try {
            // Register for push notifications
            const token = await pushNotificationService.registerForPushNotifications();
            
            if (token) {
                console.log('Push notification token:', token);
                
                // Set up notification listeners
                notificationListener.current = pushNotificationService.addNotificationReceivedListener(
                    handleNotificationReceived
                );
                
                responseListener.current = pushNotificationService.addNotificationResponseReceivedListener(
                    handleNotificationResponse
                );
            }
            
            return token;
        } catch (error) {
            console.error('Error registering for push notifications:', error);
            return null;
        }
    };
    
    // Handle received notification
    const handleNotificationReceived = (notification: ExpoNotifications.Notification) => {
        try {
            console.log('Notification received:', notification);
            
            // Extract notification data
            const { title, body, data } = notification.request.content;
            
            // If there's a notification ID in the data, we can use it to create a notification object
            if (data?.id) {
                const newNotification: Notification = {
                    id: data.id as string,
                    title: title || 'New Notification',
                    message: body || '',
                    read: false,
                    createdAt: new Date().toISOString(),
                    // Add any other data from the notification payload
                    ...data,
                };
                
                // Add notification to state
                dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });
            }
            
            // Refresh notifications from server
            fetchNotifications();
        } catch (error) {
            console.error('Error handling notification:', error);
        }
    };
    
    // Handle notification response (user tapped on notification)
    const handleNotificationResponse = async (response: ExpoNotifications.NotificationResponse) => {
        try {
            console.log('Notification response:', response);
            
            const { data } = response.notification.request.content;
            
            // If the notification has an ID, mark it as read
            if (data?.id) {
                await markAsRead(data.id as string);
            }
            
            // Refresh notifications
            fetchNotifications();
        } catch (error) {
            console.error('Error handling notification response:', error);
        }
    };

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
                
                // Update badge count
                if (Platform.OS === 'ios' || Platform.OS === 'android') {
                    const unreadCount = transformedNotifications.filter(n => !n.read).length;
                    await pushNotificationService.setBadgeCount(unreadCount);
                }
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
                
                // Update badge count
                const unreadCount = state.notifications
                    .filter(n => n.id !== notificationId && !n.read)
                    .length;
                    
                await pushNotificationService.setBadgeCount(unreadCount);
            }
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    };

    return (
        <NotificationsContext.Provider value={{ 
            state, 
            fetchNotifications, 
            markAsRead, 
            registerForPushNotifications 
        }}>
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