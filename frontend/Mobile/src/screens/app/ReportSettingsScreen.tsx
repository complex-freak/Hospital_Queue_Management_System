import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import reportStorage from '../../services/storage/reportStorage';
import reportNotifications from '../../services/notifications/reportNotifications';

type ReportSettingsScreenNavigationProp = StackNavigationProp<any, 'ReportSettings'>;

const ReportSettingsScreen: React.FC = () => {
    const navigation = useNavigation<ReportSettingsScreenNavigationProp>();
    const [isLoading, setIsLoading] = useState(false);
    const [storedReportsSize, setStoredReportsSize] = useState<string>('0 Bytes');
    const [notificationSettings, setNotificationSettings] = useState({
        newReports: true,
        sharedReports: true,
        updatedReports: true,
        reminderFrequency: 'daily'
    });
    const [autoDownload, setAutoDownload] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);

        try {
            // Get stored reports size
            const totalSize = await reportStorage.getStoredReportsSize();
            setStoredReportsSize(reportStorage.formatBytes(totalSize));

            // Get notification settings
            const settings = await reportNotifications.getNotificationSettings();
            setNotificationSettings(settings);

            // Get auto-download setting (would be implemented in a real app)
            setAutoDownload(false);
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
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

    const handleToggleAutoDownload = async (value: boolean) => {
        setAutoDownload(value);
        // In a real app, save this setting to AsyncStorage or another storage mechanism
    };

    const handleClearStoredReports = async () => {
        Alert.alert(
            'Clear Stored Reports',
            'Are you sure you want to delete all offline reports? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            await reportStorage.clearAllStoredReports();
                            setStoredReportsSize('0 Bytes');
                            Alert.alert('Success', 'All stored reports have been deleted.');
                        } catch (error) {
                            console.error('Error clearing reports:', error);
                            Alert.alert('Error', 'Failed to clear stored reports. Please try again.');
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Storage</Text>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Stored Reports Size</Text>
                    <Text style={styles.infoValue}>{storedReportsSize}</Text>
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={handleClearStoredReports}
                >
                    <Ionicons name="trash-outline" size={20} color="#DE350B" />
                    <Text style={[styles.actionButtonText, styles.deleteText]}>Clear All Stored Reports</Text>
                </TouchableOpacity>

                <View style={styles.settingItem}>
                    <Text style={styles.settingLabel}>Auto-download New Reports</Text>
                    <Switch
                        value={autoDownload}
                        onValueChange={handleToggleAutoDownload}
                        trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                        thumbColor={autoDownload ? '#2684FF' : '#F4F5F7'}
                    />
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notifications</Text>

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

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>About</Text>

                <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Version</Text>
                    <Text style={styles.infoValue}>1.0.0</Text>
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {/* Would open privacy policy */ }}
                >
                    <Ionicons name="shield-checkmark-outline" size={20} color="#2684FF" />
                    <Text style={styles.actionButtonText}>Privacy Policy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {/* Would open terms of service */ }}
                >
                    <Ionicons name="document-text-outline" size={20} color="#2684FF" />
                    <Text style={styles.actionButtonText}>Terms of Service</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7'
    },
    contentContainer: {
        padding: 16,
        paddingBottom: 32
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7'
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
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
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7'
    },
    infoLabel: {
        fontSize: 16,
        color: '#172B4D'
    },
    infoValue: {
        fontSize: 16,
        color: '#5E6C84',
        fontWeight: '500'
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
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7'
    },
    actionButtonText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#172B4D'
    },
    deleteText: {
        color: '#DE350B'
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

export default ReportSettingsScreen; 