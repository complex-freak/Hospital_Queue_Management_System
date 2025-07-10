import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  // Suppress specific warnings related to Expo Go limitations
  // These warnings only appear in Expo Go, not in development builds
  useEffect(() => {
    // Ignore specific warning messages about notifications in Expo Go
    LogBox.ignoreLogs([
      'expo-notifications: Android Push notifications',
      '`expo-notifications` functionality is not fully supported in Expo Go',
      'The action \'NAVIGATE\' with payload'
    ]);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}

/**
 * NOTE: To resolve the notification warnings permanently:
 * 
 * The warnings about expo-notifications limitations in Expo Go are expected.
 * Starting with SDK 53, push notification functionality is not available in Expo Go.
 * 
 * To test notifications properly, you need to create a development build:
 * 1. Run: `eas build --profile development --platform android` (or ios)
 * 2. Install the resulting build on your device
 * 
 * See: https://docs.expo.dev/develop/development-builds/introduction/
 */
