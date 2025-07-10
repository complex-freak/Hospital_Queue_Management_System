import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * SecureStorage service for the mobile app
 * Uses expo-secure-store for sensitive data and AsyncStorage for non-sensitive data
 */

// Determine if sensitive data needs secure storage
const isSensitiveKey = (key: string): boolean => {
    const sensitiveKeys = [
        'auth_token',
        'refresh_token',
        'user',
        'password',
        'credentials',
        'biometric'
    ];

    return sensitiveKeys.some(sensitiveKey => key.includes(sensitiveKey));
};

/**
 * Save data to storage
 * Uses SecureStore for sensitive data and AsyncStorage for non-sensitive data
 */
export const saveToStorage = async (key: string, value: string): Promise<void> => {
    try {
        if (isSensitiveKey(key)) {
            // Use secure storage for sensitive data
            await SecureStore.setItemAsync(key, value);
        } else {
            // Use AsyncStorage for non-sensitive data
            await AsyncStorage.setItem(key, value);
        }
    } catch (error) {
        console.error(`Error saving data to storage for key ${key}:`, error);
    }
};

/**
 * Get data from storage
 */
export const getFromStorage = async (key: string): Promise<string | null> => {
    try {
        if (isSensitiveKey(key)) {
            // Get from secure storage
            return await SecureStore.getItemAsync(key);
        } else {
            // Get from AsyncStorage
            return await AsyncStorage.getItem(key);
        }
    } catch (error) {
        console.error(`Error retrieving data from storage for key ${key}:`, error);
        return null;
    }
};

/**
 * Remove data from storage
 */
export const removeFromStorage = async (key: string): Promise<void> => {
    try {
        if (isSensitiveKey(key)) {
            // Remove from secure storage
            await SecureStore.deleteItemAsync(key);
        } else {
            // Remove from AsyncStorage
            await AsyncStorage.removeItem(key);
        }
    } catch (error) {
        console.error(`Error removing data from storage for key ${key}:`, error);
    }
};

/**
 * Clear all app storage
 */
export const clearAllStorage = async (): Promise<void> => {
    try {
        // Clear AsyncStorage data
        await AsyncStorage.clear();

        // We can't clear all SecureStore at once, so we need to know the keys
        const secureKeys = [
            'auth_token',
            'refresh_token',
            'user',
            'expires_at'
        ];

        // Clear each secure key
        await Promise.all(secureKeys.map(key => SecureStore.deleteItemAsync(key)));
    } catch (error) {
        console.error('Error clearing all storage:', error);
    }
};

export default {
    saveToStorage,
    getFromStorage,
    removeFromStorage,
    clearAllStorage
}; 