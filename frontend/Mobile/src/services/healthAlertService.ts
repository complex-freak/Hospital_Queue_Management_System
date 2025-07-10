import * as Notifications from 'expo-notifications';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define task names
const HEALTH_ALERTS_BACKGROUND_TASK = 'HEALTH_ALERTS_BACKGROUND_TASK';

// Alert types
export enum AlertType {
    CRITICAL = 'CRITICAL',
    WARNING = 'WARNING',
    REMINDER = 'REMINDER',
    INFO = 'INFO',
}

// Alert status
export enum AlertStatus {
    UNREAD = 'UNREAD',
    READ = 'READ',
    ACTED_UPON = 'ACTED_UPON',
    DISMISSED = 'DISMISSED'
}

// Alert categories
export enum AlertCategory {
    BLOOD_PRESSURE = 'BLOOD_PRESSURE',
    CHOLESTEROL = 'CHOLESTEROL',
    MEDICATIONS = 'MEDICATIONS',
    EXERCISE = 'EXERCISE',
    DIET = 'DIET',
    APPOINTMENT = 'APPOINTMENT',
    GENERAL = 'GENERAL'
}

// Alert interface
export interface HealthAlert {
    id: string;
    title: string;
    body: string;
    type: AlertType;
    category: AlertCategory;
    status: AlertStatus;
    createdAt: string;
    expiresAt?: string;
    actionable: boolean;
    actionText?: string;
    actionRoute?: string;
    actionParams?: Record<string, any>;
    riskFactorId?: string;
}

// Notification settings
export interface NotificationSettings {
    enabled: boolean;
    criticalAlertsEnabled: boolean;
    warningsEnabled: boolean;
    remindersEnabled: boolean;
    infoEnabled: boolean;
    quietHoursEnabled: boolean;
    quietHoursStart: string; // Format: "HH:MM"
    quietHoursEnd: string; // Format: "HH:MM"
    categories: {
        [key in AlertCategory]: boolean;
    };
}

// Default settings
const DEFAULT_SETTINGS: NotificationSettings = {
    enabled: true,
    criticalAlertsEnabled: true,
    warningsEnabled: true,
    remindersEnabled: true,
    infoEnabled: true,
    quietHoursEnabled: false,
    quietHoursStart: '22:00',
    quietHoursEnd: '08:00',
    categories: {
        BLOOD_PRESSURE: true,
        CHOLESTEROL: true,
        MEDICATIONS: true,
        EXERCISE: true,
        DIET: true,
        APPOINTMENT: true,
        GENERAL: true,
    }
};

// Storage keys
const ALERTS_STORAGE_KEY = '@health_alerts';
const SETTINGS_STORAGE_KEY = '@notification_settings';
const LAST_CHECK_KEY = '@last_alert_check';

/**
 * Configure notification settings
 */
export const configureNotifications = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('health-alerts', {
            name: 'Health Alerts',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF5630',
        });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // If we don't have permission yet, ask for it
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        // Store that the user has denied permissions
        await AsyncStorage.setItem('notification_permission_denied', 'true');
        return false;
    }

    // Set notification handler
    Notifications.setNotificationHandler({
        handleNotification: async () => ({
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
        }),
    });

    return true;
};

/**
 * Register background task for health alerts
 */
export const registerBackgroundTask = async (): Promise<boolean> => {
    try {
        // Register the task
        TaskManager.defineTask(HEALTH_ALERTS_BACKGROUND_TASK, async () => {
            try {
                const result = await checkForNewAlerts();
                return result ? BackgroundFetch.BackgroundFetchResult.NewData : BackgroundFetch.BackgroundFetchResult.NoData;
            } catch (error) {
                console.error('Error checking for alerts in background:', error);
                return BackgroundFetch.BackgroundFetchResult.Failed;
            }
        });

        // Register the background fetch
        await BackgroundFetch.registerTaskAsync(HEALTH_ALERTS_BACKGROUND_TASK, {
            minimumInterval: 900, // 15 minutes (in seconds)
            stopOnTerminate: false,
            startOnBoot: true,
        });

        return true;
    } catch (error) {
        console.error('Failed to register background task:', error);
        return false;
    }
};

/**
 * Check if within quiet hours
 */
export const isInQuietHours = (settings: NotificationSettings): boolean => {
    if (!settings.quietHoursEnabled) {
        return false;
    }

    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const [startHour, startMinute] = settings.quietHoursStart.split(':').map(Number);
    const [endHour, endMinute] = settings.quietHoursEnd.split(':').map(Number);

    // Convert to minutes since midnight for easier comparison
    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    // Check if we're in quiet hours
    if (startTime <= endTime) {
        // Simple case: quiet hours are contained within a single day
        return currentTime >= startTime && currentTime <= endTime;
    } else {
        // Complex case: quiet hours span across midnight
        return currentTime >= startTime || currentTime <= endTime;
    }
};

/**
 * Check for new alerts from the server
 */
export const checkForNewAlerts = async (): Promise<boolean> => {
    try {
        // Load notification settings
        const settings = await getNotificationSettings();
        if (!settings.enabled) {
            return false;
        }

        // Check if we're in quiet hours
        if (isInQuietHours(settings) && !settings.criticalAlertsEnabled) {
            return false;
        }

        // Get the time of last check
        const lastCheckString = await AsyncStorage.getItem(LAST_CHECK_KEY);
        const lastCheck = lastCheckString ? new Date(lastCheckString) : new Date(0);

        // Simulate fetching alerts from server (replace with actual API call)
        // Normally would include lastCheck in the API request to only get new alerts
        // For this example, we'll simulate with mock data
        const mockNewAlerts: HealthAlert[] = [
            {
                id: `alert-${Date.now()}`,
                title: 'High Blood Pressure Alert',
                body: 'Your last blood pressure reading was above your target range. Consider contacting your healthcare provider.',
                type: AlertType.WARNING,
                category: AlertCategory.BLOOD_PRESSURE,
                status: AlertStatus.UNREAD,
                createdAt: new Date().toISOString(),
                actionable: true,
                actionText: 'View Details',
                actionRoute: 'RiskFactorDetail',
                actionParams: { factorId: '1' },
                riskFactorId: '1'
            }
        ];

        // Update last check time
        await AsyncStorage.setItem(LAST_CHECK_KEY, new Date().toISOString());

        // No new alerts
        if (mockNewAlerts.length === 0) {
            return false;
        }

        // Filter alerts based on settings
        const filteredAlerts = mockNewAlerts.filter(alert => {
            // Check if this category is enabled
            if (!settings.categories[alert.category]) {
                return false;
            }

            // Check if this alert type is enabled
            switch (alert.type) {
                case AlertType.CRITICAL:
                    return settings.criticalAlertsEnabled;
                case AlertType.WARNING:
                    return settings.warningsEnabled;
                case AlertType.REMINDER:
                    return settings.remindersEnabled;
                case AlertType.INFO:
                    return settings.infoEnabled;
                default:
                    return true;
            }
        });

        // Save new alerts
        await saveAlerts(filteredAlerts);

        // Schedule notifications for each alert
        for (const alert of filteredAlerts) {
            await scheduleAlertNotification(alert);
        }

        return filteredAlerts.length > 0;
    } catch (error) {
        console.error('Error checking for new alerts:', error);
        return false;
    }
};

/**
 * Schedule a notification for a health alert
 */
export const scheduleAlertNotification = async (alert: HealthAlert): Promise<string> => {
    // Get notification color and priority based on alert type
    let priority = Notifications.AndroidNotificationPriority.DEFAULT;
    let color = '#2684FF';

    switch (alert.type) {
        case AlertType.CRITICAL:
            priority = Notifications.AndroidNotificationPriority.MAX;
            color = '#FF5630';
            break;
        case AlertType.WARNING:
            priority = Notifications.AndroidNotificationPriority.HIGH;
            color = '#FFAB00';
            break;
        case AlertType.REMINDER:
            priority = Notifications.AndroidNotificationPriority.DEFAULT;
            color = '#00B8D9';
            break;
        default:
            priority = Notifications.AndroidNotificationPriority.LOW;
            color = '#2684FF';
    }

    // Build the notification content
    const notificationContent: Notifications.NotificationContentInput = {
        title: alert.title,
        body: alert.body,
        data: {
            alertId: alert.id,
            actionable: alert.actionable,
            actionRoute: alert.actionRoute,
            actionParams: alert.actionParams
        },
        color,
    };

    // For Android, add the category and priority
    if (Platform.OS === 'android') {
        (notificationContent as any).android = {
            channelId: 'health-alerts',
            priority,
        };
    }

    // Schedule the notification to appear immediately
    const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // null means show immediately
    });

    return notificationId;
};

/**
 * Save alerts to local storage
 */
export const saveAlerts = async (newAlerts: HealthAlert[]): Promise<void> => {
    try {
        // Get existing alerts
        const existingAlerts = await getAlerts();

        // Combine alerts, ensuring no duplicates by ID
        const alertMap = new Map<string, HealthAlert>();

        // Add existing alerts to the map
        existingAlerts.forEach(alert => {
            alertMap.set(alert.id, alert);
        });

        // Add new alerts to the map (this will overwrite any existing alert with the same ID)
        newAlerts.forEach(alert => {
            alertMap.set(alert.id, alert);
        });

        // Convert map back to array and sort by creation date (newest first)
        const allAlerts = Array.from(alertMap.values()).sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        // Save to AsyncStorage
        await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(allAlerts));
    } catch (error) {
        console.error('Error saving alerts:', error);
    }
};

/**
 * Get all health alerts
 */
export const getAlerts = async (): Promise<HealthAlert[]> => {
    try {
        const alertsJson = await AsyncStorage.getItem(ALERTS_STORAGE_KEY);
        return alertsJson ? JSON.parse(alertsJson) : [];
    } catch (error) {
        console.error('Error getting alerts:', error);
        return [];
    }
};

/**
 * Update alert status
 */
export const updateAlertStatus = async (alertId: string, status: AlertStatus): Promise<boolean> => {
    try {
        const alerts = await getAlerts();
        const alertIndex = alerts.findIndex(alert => alert.id === alertId);

        if (alertIndex === -1) {
            return false;
        }

        alerts[alertIndex].status = status;
        await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
        return true;
    } catch (error) {
        console.error('Error updating alert status:', error);
        return false;
    }
};

/**
 * Delete alert
 */
export const deleteAlert = async (alertId: string): Promise<boolean> => {
    try {
        const alerts = await getAlerts();
        const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
        await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(updatedAlerts));
        return true;
    } catch (error) {
        console.error('Error deleting alert:', error);
        return false;
    }
};

/**
 * Clear all alerts
 */
export const clearAllAlerts = async (): Promise<boolean> => {
    try {
        await AsyncStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify([]));
        return true;
    } catch (error) {
        console.error('Error clearing alerts:', error);
        return false;
    }
};

/**
 * Get notification settings
 */
export const getNotificationSettings = async (): Promise<NotificationSettings> => {
    try {
        const settingsJson = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        return settingsJson ? JSON.parse(settingsJson) : DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Error getting notification settings:', error);
        return DEFAULT_SETTINGS;
    }
};

/**
 * Update notification settings
 */
export const updateNotificationSettings = async (settings: Partial<NotificationSettings>): Promise<boolean> => {
    try {
        const currentSettings = await getNotificationSettings();
        const updatedSettings = { ...currentSettings, ...settings };
        await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updatedSettings));
        return true;
    } catch (error) {
        console.error('Error updating notification settings:', error);
        return false;
    }
};

/**
 * Check if we have notification permissions
 */
export const checkNotificationPermission = async (): Promise<boolean> => {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
};

/**
 * Initialize health alerts system
 */
export const initializeHealthAlerts = async (): Promise<boolean> => {
    try {
        // Configure notifications
        const notificationsConfigured = await configureNotifications();

        if (!notificationsConfigured) {
            console.warn('Failed to configure notifications');
            return false;
        }

        // Register background task
        const taskRegistered = await registerBackgroundTask();

        if (!taskRegistered) {
            console.warn('Failed to register background task');
            return false;
        }

        // Do an initial check for alerts
        await checkForNewAlerts();

        return true;
    } catch (error) {
        console.error('Error initializing health alerts:', error);
        return false;
    }
};

export default {
    configureNotifications,
    registerBackgroundTask,
    checkForNewAlerts,
    scheduleAlertNotification,
    getAlerts,
    updateAlertStatus,
    deleteAlert,
    clearAllAlerts,
    getNotificationSettings,
    updateNotificationSettings,
    initializeHealthAlerts,
    checkNotificationPermission,
}; 