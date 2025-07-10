import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, Text, Switch, TouchableOpacity, ScrollView } from 'react-native';

// Notification channels and types
export enum NotificationChannel {
    EMAIL = 'email',
    PUSH = 'push',
    SMS = 'sms',
    IN_APP = 'in_app'
}

export enum NotificationCategory {
    APPOINTMENT = 'appointment',
    MEDICATION = 'medication',
    TEST_RESULTS = 'test_results',
    MESSAGES = 'messages',
    RISK_ALERTS = 'risk_alerts',
    SYSTEM = 'system'
}

interface NotificationPreference {
    id: string;
    category: NotificationCategory;
    channel: NotificationChannel;
    enabled: boolean;
    frequency?: 'immediate' | 'daily' | 'weekly';
    timeOfDay?: string; // For daily digests, format: 'HH:MM'
}

interface NotificationPreferencesProps {
    userId: string;
    onSave?: (preferences: NotificationPreference[]) => void;
    isNative?: boolean; // To handle platform-specific styling
    styling?: any; // Platform-specific styling
}

const defaultPreferences: NotificationPreference[] = [
    {
        id: '1',
        category: NotificationCategory.APPOINTMENT,
        channel: NotificationChannel.EMAIL,
        enabled: true,
        frequency: 'immediate'
    },
    {
        id: '2',
        category: NotificationCategory.APPOINTMENT,
        channel: NotificationChannel.PUSH,
        enabled: true,
        frequency: 'immediate'
    },
    {
        id: '3',
        category: NotificationCategory.MEDICATION,
        channel: NotificationChannel.PUSH,
        enabled: true,
        frequency: 'immediate'
    },
    {
        id: '4',
        category: NotificationCategory.MEDICATION,
        channel: NotificationChannel.SMS,
        enabled: false,
        frequency: 'daily',
        timeOfDay: '08:00'
    },
    {
        id: '5',
        category: NotificationCategory.TEST_RESULTS,
        channel: NotificationChannel.EMAIL,
        enabled: true,
        frequency: 'immediate'
    },
    {
        id: '6',
        category: NotificationCategory.TEST_RESULTS,
        channel: NotificationChannel.PUSH,
        enabled: true,
        frequency: 'immediate'
    },
    {
        id: '7',
        category: NotificationCategory.MESSAGES,
        channel: NotificationChannel.PUSH,
        enabled: true,
        frequency: 'immediate'
    },
    {
        id: '8',
        category: NotificationCategory.MESSAGES,
        channel: NotificationChannel.EMAIL,
        enabled: false,
        frequency: 'daily',
        timeOfDay: '18:00'
    },
    {
        id: '9',
        category: NotificationCategory.RISK_ALERTS,
        channel: NotificationChannel.PUSH,
        enabled: true,
        frequency: 'immediate'
    },
    {
        id: '10',
        category: NotificationCategory.RISK_ALERTS,
        channel: NotificationChannel.EMAIL,
        enabled: true,
        frequency: 'immediate'
    },
    {
        id: '11',
        category: NotificationCategory.SYSTEM,
        channel: NotificationChannel.IN_APP,
        enabled: true,
        frequency: 'immediate'
    }
];

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
    userId,
    onSave,
    isNative = false,
    styling = {}
}) => {
    const [preferences, setPreferences] = useState<NotificationPreference[]>([]);
    const [loading, setLoading] = useState(true);
    const [changes, setChanges] = useState(false);

    // Load preferences from storage on component mount
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                setLoading(true);
                const storedPrefs = await AsyncStorage.getItem(`notification_prefs_${userId}`);

                if (storedPrefs) {
                    setPreferences(JSON.parse(storedPrefs));
                } else {
                    // Use defaults if no preferences are stored
                    setPreferences(defaultPreferences);
                }
            } catch (error) {
                console.error('Error loading notification preferences:', error);
                // Fallback to defaults
                setPreferences(defaultPreferences);
            } finally {
                setLoading(false);
            }
        };

        loadPreferences();
    }, [userId]);

    // Save preferences to storage
    const savePreferences = async () => {
        try {
            await AsyncStorage.setItem(`notification_prefs_${userId}`, JSON.stringify(preferences));

            if (onSave) {
                onSave(preferences);
            }

            setChanges(false);
        } catch (error) {
            console.error('Error saving notification preferences:', error);
        }
    };

    // Toggle notification preference
    const togglePreference = (id: string) => {
        const updatedPreferences = preferences.map(pref => {
            if (pref.id === id) {
                return { ...pref, enabled: !pref.enabled };
            }
            return pref;
        });

        setPreferences(updatedPreferences);
        setChanges(true);
    };

    // Update frequency
    const updateFrequency = (id: string, frequency: 'immediate' | 'daily' | 'weekly') => {
        const updatedPreferences = preferences.map(pref => {
            if (pref.id === id) {
                return { ...pref, frequency };
            }
            return pref;
        });

        setPreferences(updatedPreferences);
        setChanges(true);
    };

    // Update time of day for daily digests
    const updateTimeOfDay = (id: string, timeOfDay: string) => {
        const updatedPreferences = preferences.map(pref => {
            if (pref.id === id) {
                return { ...pref, timeOfDay };
            }
            return pref;
        });

        setPreferences(updatedPreferences);
        setChanges(true);
    };

    // Group preferences by category for display
    const getPreferencesByCategory = () => {
        const grouped: Record<string, NotificationPreference[]> = {};

        preferences.forEach(pref => {
            if (!grouped[pref.category]) {
                grouped[pref.category] = [];
            }
            grouped[pref.category].push(pref);
        });

        return grouped;
    };

    // Format category name for display
    const formatCategoryName = (category: string): string => {
        return category
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

    // Format channel name for display
    const formatChannelName = (channel: string): string => {
        switch (channel) {
            case NotificationChannel.EMAIL:
                return 'Email';
            case NotificationChannel.PUSH:
                return 'Push Notification';
            case NotificationChannel.SMS:
                return 'SMS';
            case NotificationChannel.IN_APP:
                return 'In-App';
            default:
                return channel;
        }
    };

    if (loading) {
        return isNative ? (
            <Text style={styling.loadingText}>Loading preferences...</Text>
        ) : (
            <div className="flex justify-center items-center p-4">
                <p className="text-gray-500">Loading preferences...</p>
            </div>
        );
    }

    // For React Native
    if (isNative) {
        // Import Picker conditionally
        let Picker;
        try {
            Picker = require('@react-native-picker/picker').Picker;
        } catch (e) {
            // Fallback if module is not available
            console.warn('Picker component not available');
        }

        return (
            <ScrollView style={styling.container}>
                <Text style={styling.headerText}>Notification Preferences</Text>
                <Text style={styling.subHeaderText}>
                    Choose how and when you want to receive notifications
                </Text>

                {Object.entries(getPreferencesByCategory()).map(([category, prefs]) => (
                    <View key={category} style={styling.categoryContainer}>
                        <Text style={styling.categoryTitle}>{formatCategoryName(category)}</Text>

                        {prefs.map(pref => (
                            <View key={pref.id} style={styling.preferenceItem}>
                                <View style={styling.preferenceHeader}>
                                    <Text style={styling.channelText}>{formatChannelName(pref.channel)}</Text>
                                    <Switch
                                        value={pref.enabled}
                                        onValueChange={() => togglePreference(pref.id)}
                                        trackColor={{ false: '#D1D5DB', true: '#93C5FD' }}
                                        thumbColor={pref.enabled ? '#2563EB' : '#F3F4F6'}
                                    />
                                </View>

                                {pref.enabled && (
                                    <View style={styling.frequencyContainer}>
                                        <Text style={styling.frequencyLabel}>Frequency:</Text>
                                        {Picker ? (
                                            <Picker
                                                selectedValue={pref.frequency}
                                                style={styling.picker}
                                                onValueChange={(value) => updateFrequency(pref.id, value)}
                                            >
                                                <Picker.Item label="Immediate" value="immediate" />
                                                <Picker.Item label="Daily Digest" value="daily" />
                                                <Picker.Item label="Weekly Digest" value="weekly" />
                                            </Picker>
                                        ) : (
                                            <Text>Picker not available</Text>
                                        )}

                                        {pref.frequency === 'daily' && (
                                            <View style={styling.timeContainer}>
                                                <Text style={styling.timeLabel}>Time:</Text>
                                                {Picker ? (
                                                    <Picker
                                                        selectedValue={pref.timeOfDay || '08:00'}
                                                        style={styling.timePicker}
                                                        onValueChange={(value) => updateTimeOfDay(pref.id, value)}
                                                    >
                                                        <Picker.Item label="8:00 AM" value="08:00" />
                                                        <Picker.Item label="12:00 PM" value="12:00" />
                                                        <Picker.Item label="6:00 PM" value="18:00" />
                                                    </Picker>
                                                ) : (
                                                    <Text>Picker not available</Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        ))}
                    </View>
                ))}

                {changes && (
                    <TouchableOpacity style={styling.saveButton} onPress={savePreferences}>
                        <Text style={styling.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        );
    }

    // For React Web
    return (
        <div className="bg-white rounded-lg shadow overflow-hidden max-w-3xl mx-auto">
            <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg font-medium leading-6 text-gray-900">Notification Preferences</h3>
                <p className="mt-1 text-sm text-gray-500">
                    Choose how and when you want to receive notifications
                </p>
            </div>

            <div className="border-t border-gray-200">
                {Object.entries(getPreferencesByCategory()).map(([category, prefs]) => (
                    <div key={category} className="px-4 py-5 sm:p-6 border-b border-gray-200">
                        <h4 className="text-base font-medium text-gray-900 mb-4">
                            {formatCategoryName(category)}
                        </h4>

                        <div className="space-y-4">
                            {prefs.map(pref => (
                                <div key={pref.id} className="bg-gray-50 p-4 rounded-md">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm font-medium text-gray-700">
                                            {formatChannelName(pref.channel)}
                                        </span>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="sr-only peer"
                                                checked={pref.enabled}
                                                onChange={() => togglePreference(pref.id)}
                                            />
                                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                    </div>

                                    {pref.enabled && (
                                        <div className="mt-4 grid grid-cols-1 gap-y-4 sm:grid-cols-2 sm:gap-x-6">
                                            <div>
                                                <label htmlFor={`frequency-${pref.id}`} className="block text-xs font-medium text-gray-700">
                                                    Frequency
                                                </label>
                                                <select
                                                    id={`frequency-${pref.id}`}
                                                    name={`frequency-${pref.id}`}
                                                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                    value={pref.frequency}
                                                    onChange={(e) => updateFrequency(pref.id, e.target.value as any)}
                                                >
                                                    <option value="immediate">Immediate</option>
                                                    <option value="daily">Daily Digest</option>
                                                    <option value="weekly">Weekly Digest</option>
                                                </select>
                                            </div>

                                            {pref.frequency === 'daily' && (
                                                <div>
                                                    <label htmlFor={`time-${pref.id}`} className="block text-xs font-medium text-gray-700">
                                                        Time of Day
                                                    </label>
                                                    <select
                                                        id={`time-${pref.id}`}
                                                        name={`time-${pref.id}`}
                                                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                                        value={pref.timeOfDay || '08:00'}
                                                        onChange={(e) => updateTimeOfDay(pref.id, e.target.value)}
                                                    >
                                                        <option value="08:00">8:00 AM</option>
                                                        <option value="12:00">12:00 PM</option>
                                                        <option value="18:00">6:00 PM</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {changes && (
                <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
                    <button
                        type="button"
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        onClick={savePreferences}
                    >
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
};

export default NotificationPreferences; 