import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Switch
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import reportNotifications from '../../services/notifications/reportNotifications';

type NotificationsScreenNavigationProp = StackNavigationProp<any, 'Notifications'>;

interface Notification {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    type: 'report' | 'health' | 'system';
    data?: any;
}

const NotificationsScreen: React.FC = () => {
    const navigation = useNavigation<NotificationsScreenNavigationProp>();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [notificationSettings, setNotificationSettings] = useState({
        newReports: true,
        sharedReports: true,
        updatedReports: true,
        reminderFrequency: 'daily'
    });

    useEffect(() => {
        fetchNotifications();
        loadNotificationSettings();
    }, []);

    const loadNotificationSettings = async () => {
        const settings = await reportNotifications.getNotificationSettings();
        setNotificationSettings(settings);
    };

    const fetchNotifications = async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setIsLoading(true);

        try {
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            // Mock data for development
            const mockNotifications: Notification[] = [
                {
                    id: '1',
                    title: 'New Report Available',
                    message: 'Your Monthly Risk Assessment report is now available to view.',
                    timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
                    read: false,
                    type: 'report',
                    data: { reportId: '1' }
                },
                {
                    id: '2',
                    title: 'Report Shared With You',
                    message: 'Dr. Smith has shared a Quarterly Progress Report with you.',
                    timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
                    read: true,
                    type: 'report',
                    data: { reportId: '2' }
                },
                {
                    id: '3',
                    title: 'Health Data Updated',
                    message: 'Your health metrics have been updated based on your latest readings.',
                    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                    read: false,
                    type: 'health',
                    data: {}
                },
                {
                    id: '4',
                    title: 'System Maintenance',
                    message: 'The app will be undergoing maintenance tonight from 2-4 AM.',
                    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                    read: true,
                    type: 'system',
                    data: {}
                }
            ];

            setNotifications(mockNotifications);
        } catch (error) {
            console.error('Error fetching notifications:', error);
        } finally {
            setIsLoading(false);
            if (showRefreshing) setRefreshing(false);
        }
    };

    const onRefresh = () => {
        fetchNotifications(true);
    };

    const markAsRead = (id: string) => {
        setNotifications(prevNotifications =>
            prevNotifications.map(notification =>
                notification.id === id ? { ...notification, read: true } : notification
            )
        );
    };

    const handleNotificationPress = (notification: Notification) => {
        markAsRead(notification.id);

        // Navigate based on notification type
        if (notification.type === 'report' && notification.data?.reportId) {
            navigation.navigate('ReportDetail', { reportId: notification.data.reportId });
        }
        // Handle other notification types as needed
    };

    const handleToggleNotificationSetting = async (setting: string, value: boolean) => {
        const updatedSettings = { ...notificationSettings, [setting]: value };
        setNotificationSettings(updatedSettings);
        await reportNotifications.updateNotificationSettings(updatedSettings);
    };

    const handleChangeReminderFrequency = async (frequency: string) => {
        const updatedSettings = { ...notificationSettings, reminderFrequency: frequency };
        setNotificationSettings(updatedSettings);
        await reportNotifications.updateNotificationSettings(updatedSettings);

        // Schedule or cancel reminders based on new frequency
        await reportNotifications.scheduleReminderNotification();
    };

    const renderNotificationItem = ({ item }: { item: Notification }) => {
        // Format the timestamp
        const date = new Date(item.timestamp);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        let timeAgo;
        if (diffMins < 60) {
            timeAgo = `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            timeAgo = `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else {
            timeAgo = `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }

        // Determine icon based on notification type
        let icon;
        let iconColor;
        switch (item.type) {
            case 'report':
                icon = 'document-text';
                iconColor = '#2684FF';
                break;
            case 'health':
                icon = 'heart';
                iconColor = '#FF5630';
                break;
            case 'system':
                icon = 'information-circle';
                iconColor = '#6554C0';
                break;
            default:
                icon = 'notifications';
                iconColor = '#5E6C84';
        }

        return (
            <TouchableOpacity
                style={[styles.notificationItem, item.read ? styles.notificationRead : {}]}
                onPress={() => handleNotificationPress(item)}
            >
                <View style={styles.notificationIcon}>
                    <Ionicons name={icon as any} size={24} color={iconColor} />
                </View>
                <View style={styles.notificationContent}>
                    <Text style={styles.notificationTitle}>{item.title}</Text>
                    <Text style={styles.notificationMessage}>{item.message}</Text>
                    <Text style={styles.notificationTime}>{timeAgo}</Text>
                </View>
                {!item.read && <View style={styles.unreadIndicator} />}
            </TouchableOpacity>
        );
    };

    const renderSettingsSection = () => (
        <View style={styles.settingsSection}>
            <Text style={styles.sectionTitle}>Notification Settings</Text>

            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>New Reports</Text>
                <Switch
                    value={notificationSettings.newReports}
                    onValueChange={(value) => handleToggleNotificationSetting('newReports', value)}
                    trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                    thumbColor={notificationSettings.newReports ? '#2684FF' : '#F4F5F7'}
                />
            </View>

            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Shared Reports</Text>
                <Switch
                    value={notificationSettings.sharedReports}
                    onValueChange={(value) => handleToggleNotificationSetting('sharedReports', value)}
                    trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                    thumbColor={notificationSettings.sharedReports ? '#2684FF' : '#F4F5F7'}
                />
            </View>

            <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Updated Reports</Text>
                <Switch
                    value={notificationSettings.updatedReports}
                    onValueChange={(value) => handleToggleNotificationSetting('updatedReports', value)}
                    trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                    thumbColor={notificationSettings.updatedReports ? '#2684FF' : '#F4F5F7'}
                />
            </View>

            <Text style={styles.sectionSubtitle}>Report Reminders</Text>

            <View style={styles.reminderOptions}>
                <TouchableOpacity
                    style={[
                        styles.reminderOption,
                        notificationSettings.reminderFrequency === 'none' && styles.reminderOptionSelected
                    ]}
                    onPress={() => handleChangeReminderFrequency('none')}
                >
                    <Text style={[
                        styles.reminderOptionText,
                        notificationSettings.reminderFrequency === 'none' && styles.reminderOptionTextSelected
                    ]}>None</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.reminderOption,
                        notificationSettings.reminderFrequency === 'daily' && styles.reminderOptionSelected
                    ]}
                    onPress={() => handleChangeReminderFrequency('daily')}
                >
                    <Text style={[
                        styles.reminderOptionText,
                        notificationSettings.reminderFrequency === 'daily' && styles.reminderOptionTextSelected
                    ]}>Daily</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.reminderOption,
                        notificationSettings.reminderFrequency === 'weekly' && styles.reminderOptionSelected
                    ]}
                    onPress={() => handleChangeReminderFrequency('weekly')}
                >
                    <Text style={[
                        styles.reminderOptionText,
                        notificationSettings.reminderFrequency === 'weekly' && styles.reminderOptionTextSelected
                    ]}>Weekly</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Notifications</Text>
                    <Text style={styles.subtitle}>
                        Stay updated with your health reports
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => {}}
                >
                    <Ionicons name="options-outline" size={24} color="#2684FF" />
                </TouchableOpacity>
            </View>

            <FlatList
                data={notifications}
                renderItem={renderNotificationItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={renderSettingsSection}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No notifications</Text>
                        <Text style={styles.emptySubtext}>You're all caught up!</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#2684FF"]}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 70,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
    },
    subtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginTop: 4,
    },
    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7'
    },
    listContent: {
        padding: 16,
        paddingBottom: 24
    },
    notificationItem: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    notificationRead: {
        opacity: 0.7
    },
    notificationIcon: {
        marginRight: 16
    },
    notificationContent: {
        flex: 1
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 4
    },
    notificationMessage: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 8
    },
    notificationTime: {
        fontSize: 12,
        color: '#5E6C84'
    },
    unreadIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#2684FF'
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        marginTop: 48
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginTop: 16,
        marginBottom: 8
    },
    emptySubtext: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center'
    },
    settingsSection: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 16
    },
    sectionSubtitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#172B4D',
        marginTop: 16,
        marginBottom: 12
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7'
    },
    settingLabel: {
        fontSize: 16,
        color: '#172B4D'
    },
    reminderOptions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8
    },
    reminderOption: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 4,
        backgroundColor: '#F4F5F7',
        alignItems: 'center',
        marginHorizontal: 4
    },
    reminderOptionSelected: {
        backgroundColor: '#2684FF'
    },
    reminderOptionText: {
        fontSize: 14,
        color: '#172B4D'
    },
    reminderOptionTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600'
    }
});

export default NotificationsScreen; 