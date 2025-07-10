import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Switch,
    TouchableOpacity,
    TextInput,
    Alert,
    ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

type RiskSettingsScreenNavigationProp = StackNavigationProp<any, 'RiskSettings'>;

interface RiskFactorToggle {
    id: string;
    name: string;
    enabled: boolean;
}

interface RiskSettings {
    notificationsEnabled: boolean;
    autoUpdateEnabled: boolean;
    highRiskThreshold: number;
    moderateRiskThreshold: number;
    riskFactors: RiskFactorToggle[];
    reminderFrequency: 'daily' | 'weekly' | 'monthly';
    dataUsageConsent: boolean;
}

const RiskSettingsScreen: React.FC = () => {
    const navigation = useNavigation<RiskSettingsScreenNavigationProp>();
    const [isLoading, setIsLoading] = useState(true);
    const [settings, setSettings] = useState<RiskSettings>({
        notificationsEnabled: true,
        autoUpdateEnabled: true,
        highRiskThreshold: 20,
        moderateRiskThreshold: 10,
        riskFactors: [],
        reminderFrequency: 'weekly',
        dataUsageConsent: true
    });
    const [unsavedChanges, setUnsavedChanges] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    // Set up header buttons
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerRight: () => (
                <TouchableOpacity
                    style={styles.headerButton}
                    onPress={saveSettings}
                    disabled={!unsavedChanges}
                >
                    <Text style={[
                        styles.saveButton, 
                        !unsavedChanges && styles.saveButtonDisabled
                    ]}>
                        Save
                    </Text>
                </TouchableOpacity>
            ),
        });
    }, [navigation, unsavedChanges, settings]);

    const loadSettings = async () => {
        setIsLoading(true);
        try {
            const savedSettings = await AsyncStorage.getItem('riskSettings');
            
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            } else {
                // Mock default settings
                const defaultSettings: RiskSettings = {
                    notificationsEnabled: true,
                    autoUpdateEnabled: true,
                    highRiskThreshold: 20,
                    moderateRiskThreshold: 10,
                    riskFactors: [
                        { id: '1', name: 'Blood Pressure', enabled: true },
                        { id: '2', name: 'Total Cholesterol', enabled: true },
                        { id: '3', name: 'HDL Cholesterol', enabled: true },
                        { id: '4', name: 'Smoking Status', enabled: true },
                        { id: '5', name: 'Physical Activity', enabled: true },
                        { id: '6', name: 'Diabetes', enabled: true },
                        { id: '7', name: 'BMI', enabled: true },
                        { id: '8', name: 'Family History', enabled: true }
                    ],
                    reminderFrequency: 'weekly',
                    dataUsageConsent: true
                };
                setSettings(defaultSettings);
                await AsyncStorage.setItem('riskSettings', JSON.stringify(defaultSettings));
            }
        } catch (error) {
            console.error('Error loading risk settings:', error);
            Alert.alert('Error', 'Failed to load settings');
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async () => {
        try {
            await AsyncStorage.setItem('riskSettings', JSON.stringify(settings));
            setUnsavedChanges(false);
            Alert.alert('Success', 'Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', 'Failed to save settings');
        }
    };

    const handleToggleSetting = (setting: keyof RiskSettings, value: boolean) => {
        setSettings(prev => ({
            ...prev,
            [setting]: value
        }));
        setUnsavedChanges(true);
    };

    const handleRiskFactorToggle = (factorId: string, enabled: boolean) => {
        setSettings(prev => ({
            ...prev,
            riskFactors: prev.riskFactors.map(factor => 
                factor.id === factorId ? { ...factor, enabled } : factor
            )
        }));
        setUnsavedChanges(true);
    };

    const handleThresholdChange = (threshold: 'highRiskThreshold' | 'moderateRiskThreshold', value: string) => {
        const numValue = parseInt(value);
        if (!isNaN(numValue) && numValue >= 0 && numValue <= 100) {
            setSettings(prev => ({
                ...prev,
                [threshold]: numValue
            }));
            setUnsavedChanges(true);
        }
    };

    const handleReminderFrequencyChange = (frequency: 'daily' | 'weekly' | 'monthly') => {
        setSettings(prev => ({
            ...prev,
            reminderFrequency: frequency
        }));
        setUnsavedChanges(true);
    };

    const resetToDefaults = () => {
        Alert.alert(
            'Reset Settings',
            'Are you sure you want to reset all settings to default values?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Reset', 
                    style: 'destructive',
                    onPress: async () => {
                        await loadSettings();
                        setUnsavedChanges(false);
                        Alert.alert('Success', 'Settings have been reset to defaults');
                    }
                }
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
                <Text style={styles.loadingText}>Loading settings...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Risk Score Settings</Text>
                
                <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                        <Text style={styles.settingLabel}>High Risk Threshold</Text>
                        <Text style={styles.settingDescription}>
                            Risk score above this value is considered high risk
                        </Text>
                    </View>
                    <View style={styles.thresholdInputContainer}>
                        <TextInput
                            style={styles.thresholdInput}
                            value={settings.highRiskThreshold.toString()}
                            onChangeText={(value) => handleThresholdChange('highRiskThreshold', value)}
                            keyboardType="numeric"
                            maxLength={3}
                        />
                        <Text style={styles.percentText}>%</Text>
                    </View>
                </View>
                
                <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                        <Text style={styles.settingLabel}>Moderate Risk Threshold</Text>
                        <Text style={styles.settingDescription}>
                            Risk score above this value is considered moderate risk
                        </Text>
                    </View>
                    <View style={styles.thresholdInputContainer}>
                        <TextInput
                            style={styles.thresholdInput}
                            value={settings.moderateRiskThreshold.toString()}
                            onChangeText={(value) => handleThresholdChange('moderateRiskThreshold', value)}
                            keyboardType="numeric"
                            maxLength={3}
                        />
                        <Text style={styles.percentText}>%</Text>
                    </View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Included Risk Factors</Text>
                <Text style={styles.sectionDescription}>
                    Choose which factors to include in your risk calculation
                </Text>
                
                {settings.riskFactors.map(factor => (
                    <View key={factor.id} style={styles.settingRow}>
                        <Text style={styles.settingLabel}>{factor.name}</Text>
                        <Switch
                            value={factor.enabled}
                            onValueChange={(value) => handleRiskFactorToggle(factor.id, value)}
                            trackColor={{ false: '#DFE1E6', true: '#DEEBFF' }}
                            thumbColor={factor.enabled ? '#2684FF' : '#F4F5F7'}
                        />
                    </View>
                ))}
                
                <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={() => Alert.alert(
                        'Risk Factors',
                        'These factors are used to calculate your cardiovascular disease risk score. Disabling a factor will exclude it from your risk calculations.'
                    )}
                >
                    <Text style={styles.infoButtonText}>Learn More About Risk Factors</Text>
                    <Ionicons name="information-circle-outline" size={16} color="#2684FF" />
                </TouchableOpacity>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Notifications</Text>
                
                <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                        <Text style={styles.settingLabel}>Enable Notifications</Text>
                        <Text style={styles.settingDescription}>
                            Receive alerts about changes to your risk score
                        </Text>
                    </View>
                    <Switch
                        value={settings.notificationsEnabled}
                        onValueChange={(value) => handleToggleSetting('notificationsEnabled', value)}
                        trackColor={{ false: '#DFE1E6', true: '#DEEBFF' }}
                        thumbColor={settings.notificationsEnabled ? '#2684FF' : '#F4F5F7'}
                    />
                </View>
                
                {settings.notificationsEnabled && (
                    <View style={styles.frequencyContainer}>
                        <Text style={styles.settingLabel}>Reminder Frequency</Text>
                        <View style={styles.frequencyOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.frequencyOption,
                                    settings.reminderFrequency === 'daily' && styles.selectedFrequency
                                ]}
                                onPress={() => handleReminderFrequencyChange('daily')}
                            >
                                <Text style={[
                                    styles.frequencyText,
                                    settings.reminderFrequency === 'daily' && styles.selectedFrequencyText
                                ]}>
                                    Daily
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[
                                    styles.frequencyOption,
                                    settings.reminderFrequency === 'weekly' && styles.selectedFrequency
                                ]}
                                onPress={() => handleReminderFrequencyChange('weekly')}
                            >
                                <Text style={[
                                    styles.frequencyText,
                                    settings.reminderFrequency === 'weekly' && styles.selectedFrequencyText
                                ]}>
                                    Weekly
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity
                                style={[
                                    styles.frequencyOption,
                                    settings.reminderFrequency === 'monthly' && styles.selectedFrequency
                                ]}
                                onPress={() => handleReminderFrequencyChange('monthly')}
                            >
                                <Text style={[
                                    styles.frequencyText,
                                    settings.reminderFrequency === 'monthly' && styles.selectedFrequencyText
                                ]}>
                                    Monthly
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Data & Privacy</Text>
                
                <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                        <Text style={styles.settingLabel}>Auto-Update Risk Score</Text>
                        <Text style={styles.settingDescription}>
                            Automatically recalculate when new health data is available
                        </Text>
                    </View>
                    <Switch
                        value={settings.autoUpdateEnabled}
                        onValueChange={(value) => handleToggleSetting('autoUpdateEnabled', value)}
                        trackColor={{ false: '#DFE1E6', true: '#DEEBFF' }}
                        thumbColor={settings.autoUpdateEnabled ? '#2684FF' : '#F4F5F7'}
                    />
                </View>
                
                <View style={styles.settingRow}>
                    <View style={styles.settingLabelContainer}>
                        <Text style={styles.settingLabel}>Data Usage Consent</Text>
                        <Text style={styles.settingDescription}>
                            Allow anonymous data to be used for improving risk models
                        </Text>
                    </View>
                    <Switch
                        value={settings.dataUsageConsent}
                        onValueChange={(value) => handleToggleSetting('dataUsageConsent', value)}
                        trackColor={{ false: '#DFE1E6', true: '#DEEBFF' }}
                        thumbColor={settings.dataUsageConsent ? '#2684FF' : '#F4F5F7'}
                    />
                </View>
                
                <TouchableOpacity 
                    style={styles.infoButton}
                    onPress={() => Alert.alert(
                        'Data Privacy',
                        'Your data is private and secure. We only use anonymized data for improving our risk calculation models with your consent. You can withdraw consent at any time.'
                    )}
                >
                    <Text style={styles.infoButtonText}>View Privacy Policy</Text>
                    <Ionicons name="shield-checkmark-outline" size={16} color="#2684FF" />
                </TouchableOpacity>
            </View>

            <TouchableOpacity
                style={styles.resetButton}
                onPress={resetToDefaults}
            >
                <Text style={styles.resetButtonText}>Reset to Defaults</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F4F5F7',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#5E6C84',
    },
    headerButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    saveButton: {
        fontSize: 16,
        fontWeight: '500',
        color: '#2684FF',
    },
    saveButtonDisabled: {
        color: '#97A0AF',
    },
    section: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#172B4D',
        marginBottom: 12,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 16,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    settingLabelContainer: {
        flex: 1,
        paddingRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        color: '#172B4D',
    },
    settingDescription: {
        fontSize: 12,
        color: '#5E6C84',
        marginTop: 4,
    },
    thresholdInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    thresholdInput: {
        width: 50,
        height: 40,
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 4,
        paddingHorizontal: 8,
        textAlign: 'center',
        fontSize: 16,
        color: '#172B4D',
    },
    percentText: {
        marginLeft: 4,
        fontSize: 16,
        color: '#172B4D',
    },
    infoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 8,
    },
    infoButtonText: {
        fontSize: 14,
        color: '#2684FF',
        marginRight: 4,
    },
    frequencyContainer: {
        marginVertical: 8,
    },
    frequencyOptions: {
        flexDirection: 'row',
        marginTop: 8,
    },
    frequencyOption: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    selectedFrequency: {
        backgroundColor: '#DEEBFF',
        borderColor: '#2684FF',
    },
    frequencyText: {
        fontSize: 14,
        color: '#5E6C84',
    },
    selectedFrequencyText: {
        color: '#2684FF',
        fontWeight: '500',
    },
    resetButton: {
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 24,
        backgroundColor: '#FFEBE6',
        borderRadius: 4,
        alignItems: 'center',
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#FF5630',
    },
});

export default RiskSettingsScreen; 