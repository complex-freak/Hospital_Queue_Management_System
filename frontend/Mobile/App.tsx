import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { QueueProvider } from './src/context/QueueContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { NotificationsProvider } from './src/context/NotificationsContext';
import Navigation from './src/navigation';
import './src/localization/i18n';
import { connectivityService } from './src/services';

export default function App() {
    // Initialize connectivity service
    useEffect(() => {
        connectivityService.initialize();
        
        // Clean up on unmount
        return () => {
            connectivityService.cleanup();
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