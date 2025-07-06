import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/context/AuthContext';
import { QueueProvider } from './src/context/QueueContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import Navigation from './src/navigation';
import './src/localization/i18n';
import { connectivityService } from './src/services';

export default function App() {
    // Initialize connectivity service and push notifications
    useEffect(() => {
        connectivityService.initialize();
        
        // Initialize push notifications
        const initializePushNotifications = async () => {
            try {
                // Use the default export instead of creating new instance
                const pushNotificationService = require('./src/services/notifications/pushNotificationService').default;
                
                // Only register for permissions and get token, don't register with backend yet
                await pushNotificationService.registerForPushNotifications();
                console.log('Push notifications initialized successfully');
                
                // Set up notification listeners after successful initialization
                const notificationResponseSubscription = pushNotificationService.addNotificationResponseReceivedListener(
                    (response: Notifications.NotificationResponse) => {
                        console.log('Notification response received:', response);
                        // Handle notification tap - could navigate to specific screen
                        const data = response.notification.request.content.data;
                        if (data?.appointmentId) {
                            // Could navigate to appointment details screen
                            console.log('Navigate to appointment:', data.appointmentId);
                        }
                    }
                );
                
                // Store subscription for cleanup
                return notificationResponseSubscription;
            } catch (error) {
                console.warn('Failed to initialize push notifications:', error);
                return null;
            }
        };
        
        let notificationSubscription: any = null;
        initializePushNotifications().then(subscription => {
            notificationSubscription = subscription;
        });
        
        // Clean up on unmount
        return () => {
            connectivityService.cleanup();
            if (notificationSubscription) {
                notificationSubscription.remove();
            }
        };
    }, []);
    
    return (
        <SafeAreaProvider>
            <StatusBar style="auto" />
            <ThemeProvider>
                <AuthProvider>
                    <NotificationsProvider>
                        <QueueProvider>
                            <Navigation />
                        </QueueProvider>
                    </NotificationsProvider>
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
} 