import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../../config/env';
// Import notification service with error handling
let notificationService: any = null;
try {
  const notificationsModule = require('../api/notifications');
  notificationService = notificationsModule.notificationService || notificationsModule.default;
} catch (error) {
  console.warn('Could not import notification service:', error);
}

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

class PushNotificationService {
  /**
   * Register for push notifications (permissions and token only)
   * Note: Device token registration with backend happens after user authentication
   */
  async registerForPushNotifications(): Promise<string | null> {
    // Check if this is a physical device (push notifications don't work on simulators)
    if (!Device.isDevice) {
      console.log('Push Notifications are not available on simulator');
      return null;
    }

    // Check for existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If we don't have permission yet, ask for it
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    // If we still don't have permission, return null
    if (finalStatus !== 'granted') {
      console.log('Failed to get push notification permissions');
      return null;
    }

    try {
      // Get the token
      const token = await this.getExpoPushToken();
      
      // Save token to local storage
      if (token) {
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATION_TOKEN, token);
        console.log('Push notification token saved to local storage');
      }
      
      return token;
    } catch (error) {
      console.error('Error registering for push notifications:', error);
      return null;
    }
  }
  
  /**
   * Get the Expo push token
   */
  async getExpoPushToken(): Promise<string | null> {
    try {
      // Check if we have a stored token
      const storedToken = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATION_TOKEN);
      if (storedToken) {
        return storedToken;
      }
      
      // For development, we can use a mock token if running in development
      if (__DEV__) {
        console.log('Using mock push token for development');
        const mockToken = 'ExponentPushToken[dev-mock-token]';
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATION_TOKEN, mockToken);
        return mockToken;
      }
      
      // Get a new token (only works in production with proper setup)
      try {
        const { data: token } = await Notifications.getExpoPushTokenAsync({
          projectId: Constants.expoConfig?.extra?.eas?.projectId,
        });
        return token;
      } catch (tokenError) {
        console.warn('Could not get push token, using mock token instead', tokenError);
        const mockToken = 'ExponentPushToken[mock-token-fallback]';
        await AsyncStorage.setItem(STORAGE_KEYS.PUSH_NOTIFICATION_TOKEN, mockToken);
        return mockToken;
      }
    } catch (error) {
      console.error('Error getting Expo push token:', error);
      return null;
    }
  }
  
  /**
   * Register device token with backend (call this when user is authenticated)
   */
  async registerTokenWithBackend(): Promise<boolean> {
    try {
      // Get the stored token
      const token = await AsyncStorage.getItem(STORAGE_KEYS.PUSH_NOTIFICATION_TOKEN);
      if (!token) {
        console.warn('No push notification token found in storage');
        return false;
      }

      // Check if notification service is available
      if (!notificationService) {
        console.warn('Notification service not available, skipping backend registration');
        return false;
      }

      // Convert the platform OS to the expected backend format
      let deviceType: string;
      
      if (Platform.OS === 'ios') {
        deviceType = 'ios';
      } else if (Platform.OS === 'android') {
        deviceType = 'android';
      } else {
        deviceType = 'web';
      }
      
      console.log('Registering device token with backend:', { token, device_type: deviceType });
      
      // Register the token with backend
      const response = await notificationService.registerDeviceToken({
        token,
        device_type: deviceType as 'ios' | 'android' | 'web'
      });
      
      // Check for success and log
      if (response.isSuccess) {
        console.log('✅ Successfully registered device token with backend');
        return true;
      } else {
        console.error('❌ Failed to register device token:', response);
        
        // Log specific validation errors if any
        if (response.errors) {
          console.error('Validation errors:', response.errors);
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Error registering token with backend:', error);
      return false;
    }
  }
  
  /**
   * Set badge count
   */
  async setBadgeCount(count: number): Promise<void> {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Error setting badge count:', error);
    }
  }
  
  /**
   * Schedule a local notification
   */
  async scheduleLocalNotification(
    title: string,
    body: string,
    data: any = {},
    trigger: Notifications.NotificationTriggerInput = null
  ): Promise<string> {
    try {
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
        },
        trigger,
      });
      
      return notificationId;
    } catch (error) {
      console.error('Error scheduling local notification:', error);
      return '';
    }
  }

  /**
   * Send an immediate local notification
   */
  async sendImmediateNotification(
    title: string,
    body: string,
    data: any = {}
  ): Promise<string> {
    return this.scheduleLocalNotification(title, body, data, null);
  }
  
  /**
   * Add a notification listener
   */
  addNotificationReceivedListener(
    listener: (notification: Notifications.Notification) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationReceivedListener(listener);
  }
  
  /**
   * Add a notification response listener (when user taps a notification)
   */
  addNotificationResponseReceivedListener(
    listener: (response: Notifications.NotificationResponse) => void
  ): Notifications.Subscription {
    return Notifications.addNotificationResponseReceivedListener(listener);
  }
  
  /**
   * Remove notification subscription
   */
  removeNotificationSubscription(subscription: Notifications.Subscription): void {
    Notifications.removeNotificationSubscription(subscription);
  }
  
  /**
   * Check notification permissions
   */
  async checkPermissions(): Promise<Notifications.PermissionResponse> {
    return await Notifications.getPermissionsAsync();
  }
  
  /**
   * Request notification permissions
   */
  async requestPermissions(): Promise<Notifications.PermissionResponse> {
    return await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  }
  
  /**
   * Dismiss all notifications
   */
  async dismissAllNotifications(): Promise<void> {
    await Notifications.dismissAllNotificationsAsync();
  }
}

export const pushNotificationService = new PushNotificationService();
export default pushNotificationService; 