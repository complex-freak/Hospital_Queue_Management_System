import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notification handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
});

// Storage keys
const NOTIFICATION_TOKEN_KEY = '@report_notification_token';
const NOTIFICATION_SETTINGS_KEY = '@report_notification_settings';

// Default notification settings
const DEFAULT_NOTIFICATION_SETTINGS = {
    newReports: true,
    sharedReports: true,
    updatedReports: true,
    reminderFrequency: 'daily', // 'none', 'daily', 'weekly'
};

// Register for push notifications
export async function registerForPushNotificationsAsync() {
    let token;

    if (Constants.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }

        token = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId,
        })).data;

        // Store the token
        await AsyncStorage.setItem(NOTIFICATION_TOKEN_KEY, token);
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('report-notifications', {
            name: 'Report Notifications',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#2684FF',
        });
    }

    return token;
}

// Get notification settings
export async function getNotificationSettings() {
    try {
        const settings = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        return settings ? JSON.parse(settings) : DEFAULT_NOTIFICATION_SETTINGS;
    } catch (error) {
        console.error('Error getting notification settings:', error);
        return DEFAULT_NOTIFICATION_SETTINGS;
    }
}

// Update notification settings
export async function updateNotificationSettings(settings: any) {
    try {
        await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify({
            ...DEFAULT_NOTIFICATION_SETTINGS,
            ...settings,
        }));
        return true;
    } catch (error) {
        console.error('Error updating notification settings:', error);
        return false;
    }
}

// Schedule a local notification for a new report
export async function scheduleNewReportNotification(reportTitle: string, reportId: string) {
    const settings = await getNotificationSettings();
    if (!settings.newReports) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'New Report Available',
            body: `Your healthcare provider has shared "${reportTitle}" with you.`,
            data: { reportId },
        },
        trigger: { seconds: 1 },
    });
}

// Schedule a local notification for a shared report
export async function scheduleSharedReportNotification(reportTitle: string, sharedBy: string, reportId: string) {
    const settings = await getNotificationSettings();
    if (!settings.sharedReports) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Report Shared With You',
            body: `${sharedBy} has shared "${reportTitle}" with you.`,
            data: { reportId },
        },
        trigger: { seconds: 1 },
    });
}

// Schedule a local notification for an updated report
export async function scheduleUpdatedReportNotification(reportTitle: string, reportId: string) {
    const settings = await getNotificationSettings();
    if (!settings.updatedReports) return;

    await Notifications.scheduleNotificationAsync({
        content: {
            title: 'Report Updated',
            body: `"${reportTitle}" has been updated with new information.`,
            data: { reportId },
        },
        trigger: { seconds: 1 },
    });
}

// Schedule a reminder notification based on frequency
export async function scheduleReminderNotification() {
    const settings = await getNotificationSettings();

    if (settings.reminderFrequency === 'none') return;

    // Cancel any existing reminders
    await cancelAllReminderNotifications();

    let trigger;

    if (settings.reminderFrequency === 'daily') {
        // Schedule for 9 AM daily
        const now = new Date();
        trigger = {
            hour: 9,
            minute: 0,
            repeats: true,
        };
    } else if (settings.reminderFrequency === 'weekly') {
        // Schedule for 9 AM Monday
        trigger = {
            weekday: 1, // Monday
            hour: 9,
            minute: 0,
            repeats: true,
        };
    }

    if (trigger) {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Health Reports Reminder',
                body: 'Don\'t forget to check your latest health reports.',
                data: { type: 'reminder' },
            },
            trigger,
        });
    }
}

// Cancel all reminder notifications
export async function cancelAllReminderNotifications() {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();

    for (const notification of scheduledNotifications) {
        if (notification.content.data?.type === 'reminder') {
            await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        }
    }
}

// Add a notification listener
export function addNotificationResponseListener(handler: (response: Notifications.NotificationResponse) => void) {
    return Notifications.addNotificationResponseReceivedListener(handler);
}

// Remove a notification listener
export function removeNotificationListener(listener: any) {
    Notifications.removeNotificationSubscription(listener);
}

export default {
    registerForPushNotificationsAsync,
    getNotificationSettings,
    updateNotificationSettings,
    scheduleNewReportNotification,
    scheduleSharedReportNotification,
    scheduleUpdatedReportNotification,
    scheduleReminderNotification,
    cancelAllReminderNotifications,
    addNotificationResponseListener,
    removeNotificationListener,
}; 