import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { QueueProvider } from './src/context/QueueContext';
import { ThemeProvider } from './src/context/ThemeContext';
import Navigation from './src/navigation';
import './src/localization/i18n';

export default function App() {
    return (
        <SafeAreaProvider>
            <StatusBar style="auto" />
            <ThemeProvider>
                <AuthProvider>
                    <QueueProvider>
                        <Navigation />
                    </QueueProvider>
                </AuthProvider>
            </ThemeProvider>
        </SafeAreaProvider>
    );
} 