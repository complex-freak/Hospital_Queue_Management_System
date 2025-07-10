import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Switch,
    Alert,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
    }),
});

interface HealthMetric {
    id: string;
    name: string;
    value: number | null;
    unit: string;
    date: Date;
    normalRange?: { min: number; max: number };
}

interface Reminder {
    id: string;
    title: string;
    body: string;
    time: string; // format: 'HH:MM'
    days: Array<0 | 1 | 2 | 3 | 4 | 5 | 6>; // days of week (0 = Sunday)
    enabled: boolean;
    notificationIds: string[];
}

const HealthTrackingDashboardScreen: React.FC = () => {
    const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
    const [reminders, setReminders] = useState<Reminder[]>([]);
    const [chartTimeframe, setChartTimeframe] = useState<'week' | 'month'>('week');

    // Sample data - in a real app, this would come from your backend
    const mockBloodPressureData = [
        { date: '2023-04-01', systolic: 120, diastolic: 80 },
        { date: '2023-04-02', systolic: 122, diastolic: 78 },
        { date: '2023-04-03', systolic: 118, diastolic: 76 },
        { date: '2023-04-04', systolic: 123, diastolic: 82 },
        { date: '2023-04-05', systolic: 120, diastolic: 79 },
        { date: '2023-04-06', systolic: 118, diastolic: 75 },
        { date: '2023-04-07', systolic: 121, diastolic: 80 },
    ];

    const mockGlucoseData = [
        { date: '2023-04-01', value: 102 },
        { date: '2023-04-02', value: 98 },
        { date: '2023-04-03', value: 105 },
        { date: '2023-04-04', value: 110 },
        { date: '2023-04-05', value: 104 },
        { date: '2023-04-06', value: 100 },
        { date: '2023-04-07', value: 99 },
    ];

    // Load health metrics and reminders on component mount
    useEffect(() => {
        loadHealthMetrics();
        loadReminders();
        registerForPushNotifications();
    }, []);

    // Register for push notifications
    const registerForPushNotifications = async () => {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        // Only ask if permissions have not already been determined
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        // Show alert if user declined permission
        if (finalStatus !== 'granted') {
            Alert.alert(
                'Notification Permission Required',
                'Please enable notifications to receive medication and health check reminders.',
                [{ text: 'OK' }]
            );
            return;
        }
    };

    // Load health metrics from local storage (would connect to API in real app)
    const loadHealthMetrics = async () => {
        try {
            const savedMetrics = await AsyncStorage.getItem('healthMetrics');
            if (savedMetrics) {
                const parsedMetrics = JSON.parse(savedMetrics);
                setHealthMetrics(parsedMetrics);
            } else {
                // Initialize with sample data if none exists
                setHealthMetrics([
                    {
                        id: '1',
                        name: 'Blood Pressure',
                        value: 120,
                        unit: 'mmHg',
                        date: new Date(),
                        normalRange: { min: 90, max: 120 },
                    },
                    {
                        id: '2',
                        name: 'Heart Rate',
                        value: 72,
                        unit: 'bpm',
                        date: new Date(),
                        normalRange: { min: 60, max: 100 },
                    },
                    {
                        id: '3',
                        name: 'Blood Glucose',
                        value: 98,
                        unit: 'mg/dL',
                        date: new Date(),
                        normalRange: { min: 70, max: 100 },
                    },
                    {
                        id: '4',
                        name: 'Weight',
                        value: 70,
                        unit: 'kg',
                        date: new Date(),
                    },
                ]);
            }
        } catch (error) {
            console.error('Error loading health metrics:', error);
        }
    };

    // Load reminders from local storage (would connect to API in real app)
    const loadReminders = async () => {
        try {
            const savedReminders = await AsyncStorage.getItem('reminders');
            if (savedReminders) {
                const parsedReminders = JSON.parse(savedReminders);
                setReminders(parsedReminders);
            } else {
                // Initialize with sample reminders if none exist
                setReminders([
                    {
                        id: '1',
                        title: 'Blood Pressure',
                        body: 'Time to measure your blood pressure',
                        time: '08:00',
                        days: [1, 3, 5], // Monday, Wednesday, Friday
                        enabled: true,
                        notificationIds: [],
                    },
                    {
                        id: '2',
                        title: 'Medication Reminder',
                        body: 'Take your blood pressure medication',
                        time: '09:00',
                        days: [0, 1, 2, 3, 4, 5, 6], // Every day
                        enabled: true,
                        notificationIds: [],
                    },
                    {
                        id: '3',
                        title: 'Blood Glucose Check',
                        body: 'Remember to check your blood glucose level',
                        time: '18:00',
                        days: [0, 3, 6], // Sunday, Wednesday, Saturday
                        enabled: false,
                        notificationIds: [],
                    },
                ]);
            }
        } catch (error) {
            console.error('Error loading reminders:', error);
        }
    };

    // Schedule notification for a reminder
    const scheduleReminder = async (reminder: Reminder) => {
        // Cancel any existing notifications for this reminder
        if (reminder.notificationIds.length > 0) {
            for (const notificationId of reminder.notificationIds) {
                await Notifications.cancelScheduledNotificationAsync(notificationId);
            }
        }

        if (!reminder.enabled) return [];

        const notificationIds: string[] = [];

        // Schedule notification for each enabled day
        for (const day of reminder.days) {
            const [hours, minutes] = reminder.time.split(':').map(Number);

            const trigger = {
                hour: hours,
                minute: minutes,
                weekday: day + 1, // expo uses 1-7 for weekdays, our data uses 0-6
                repeats: true,
            };

            try {
                const id = await Notifications.scheduleNotificationAsync({
                    content: {
                        title: reminder.title,
                        body: reminder.body,
                        sound: true,
                    },
                    trigger,
                });
                notificationIds.push(id);
            } catch (error) {
                console.error('Error scheduling notification:', error);
            }
        }

        return notificationIds;
    };

    // Toggle reminder enabled state
    const toggleReminder = async (id: string, enabled: boolean) => {
        const updatedReminders = reminders.map(reminder => {
            if (reminder.id === id) {
                const updatedReminder = { ...reminder, enabled };

                // Schedule or cancel notifications based on new state
                if (enabled) {
                    scheduleReminder(updatedReminder).then(notificationIds => {
                        updatedReminder.notificationIds = notificationIds;
                    });
                } else {
                    // Cancel notifications
                    reminder.notificationIds.forEach(async (notificationId) => {
                        await Notifications.cancelScheduledNotificationAsync(notificationId);
                    });
                    updatedReminder.notificationIds = [];
                }

                return updatedReminder;
            }
            return reminder;
        });

        setReminders(updatedReminders);
        await AsyncStorage.setItem('reminders', JSON.stringify(updatedReminders));
    };

    // Add a new reminder (would open a form in a real app)
    const addReminder = () => {
        Alert.alert(
            'Add Reminder',
            'In a complete app, this would open a form to create a new health reminder.'
        );
    };

    // Get weekday name from index
    const getDayName = (index: number) => {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[index];
    };

    // Render health metrics cards
    const renderHealthMetricCards = () => {
        return healthMetrics.map(metric => (
            <TouchableOpacity
                key={metric.id}
                style={styles.metricCard}
                onPress={() => {
                    // Navigate to detailed view (would implement in a complete app)
                }}
            >
                <View style={styles.metricHeader}>
                    <Text style={styles.metricName}>{metric.name}</Text>
                    <Text style={styles.metricDate}>
                        {new Date(metric.date).toLocaleDateString()}
                    </Text>
                </View>

                <View style={styles.metricValueContainer}>
                    <Text style={styles.metricValue}>
                        {metric.value}
                        <Text style={styles.metricUnit}> {metric.unit}</Text>
                    </Text>

                    {metric.normalRange && (
                        <View style={[
                            styles.statusIndicator,
                            metric.value && metric.value > metric.normalRange.max
                                ? styles.highStatus
                                : metric.value && metric.value < metric.normalRange.min
                                    ? styles.lowStatus
                                    : styles.normalStatus
                        ]} />
                    )}
                </View>

                {metric.normalRange && (
                    <Text style={styles.normalRange}>
                        Normal range: {metric.normalRange.min}-{metric.normalRange.max} {metric.unit}
                    </Text>
                )}
            </TouchableOpacity>
        ));
    };

    // Render reminders list
    const renderReminders = () => {
        return (
            <View style={styles.remindersContainer}>
                <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionTitle}>Daily Reminders</Text>
                    <TouchableOpacity onPress={addReminder}>
                        <Ionicons name="add-circle" size={24} color="#2684FF" />
                    </TouchableOpacity>
                </View>

                {reminders.map(reminder => (
                    <View key={reminder.id} style={styles.reminderItem}>
                        <View style={styles.reminderInfo}>
                            <Text style={styles.reminderTitle}>{reminder.title}</Text>
                            <Text style={styles.reminderTime}>{reminder.time}</Text>
                            <View style={styles.reminderDays}>
                                {[0, 1, 2, 3, 4, 5, 6].map((day) => (
                                    <View
                                        key={day}
                                        style={[
                                            styles.dayIndicator,
                                            reminder.days.includes(day as 0 | 1 | 2 | 3 | 4 | 5 | 6) ? styles.dayActive : styles.dayInactive
                                        ]}
                                    >
                                        <Text style={[
                                            styles.dayText,
                                            reminder.days.includes(day as 0 | 1 | 2 | 3 | 4 | 5 | 6) ? styles.dayTextActive : styles.dayTextInactive
                                        ]}>
                                            {getDayName(day).charAt(0)}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                        <Switch
                            value={reminder.enabled}
                            onValueChange={(value) => toggleReminder(reminder.id, value)}
                            trackColor={{ false: '#DFE1E6', true: '#DEEBFF' }}
                            thumbColor={reminder.enabled ? '#2684FF' : '#97A0AF'}
                        />
                    </View>
                ))}
            </View>
        );
    };

    // Render charts section
    const renderHealthCharts = () => {
        const screenWidth = Dimensions.get('window').width - 40;

        return (
            <View style={styles.chartsContainer}>
                <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionTitle}>Health Trends</Text>
                    <View style={styles.timeframeToggle}>
                        <TouchableOpacity
                            style={[
                                styles.timeframeButton,
                                chartTimeframe === 'week' ? styles.activeTimeframe : null
                            ]}
                            onPress={() => setChartTimeframe('week')}
                        >
                            <Text style={chartTimeframe === 'week' ? styles.activeTimeframeText : styles.timeframeText}>
                                Week
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.timeframeButton,
                                chartTimeframe === 'month' ? styles.activeTimeframe : null
                            ]}
                            onPress={() => setChartTimeframe('month')}
                        >
                            <Text style={chartTimeframe === 'month' ? styles.activeTimeframeText : styles.timeframeText}>
                                Month
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Blood pressure chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Blood Pressure</Text>
                    <LineChart
                        data={{
                            labels: mockBloodPressureData.map(d => d.date.substring(8, 10)), // get day only
                            datasets: [
                                {
                                    data: mockBloodPressureData.map(d => d.systolic),
                                    color: () => '#FF5630',
                                    strokeWidth: 2,
                                },
                                {
                                    data: mockBloodPressureData.map(d => d.diastolic),
                                    color: () => '#2684FF',
                                    strokeWidth: 2,
                                },
                            ],
                            legend: ['Systolic', 'Diastolic'],
                        }}
                        width={screenWidth - 32}
                        height={180}
                        chartConfig={{
                            backgroundColor: '#FFFFFF',
                            backgroundGradientFrom: '#FFFFFF',
                            backgroundGradientTo: '#FFFFFF',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(94, 108, 132, ${opacity})`,
                            style: {
                                borderRadius: 16,
                            },
                            propsForDots: {
                                r: '4',
                                strokeWidth: '1',
                            },
                            propsForBackgroundLines: {
                                stroke: '#DFE1E6',
                                strokeDasharray: '',
                            },
                        }}
                        bezier
                        style={{
                            marginVertical: 8,
                            borderRadius: 8,
                        }}
                    />
                    <View style={styles.legendContainer}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#FF5630' }]} />
                            <Text style={styles.legendText}>Systolic</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendColor, { backgroundColor: '#2684FF' }]} />
                            <Text style={styles.legendText}>Diastolic</Text>
                        </View>
                    </View>
                </View>

                {/* Glucose chart */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Blood Glucose</Text>
                    <LineChart
                        data={{
                            labels: mockGlucoseData.map(d => d.date.substring(8, 10)), // get day only
                            datasets: [
                                {
                                    data: mockGlucoseData.map(d => d.value),
                                    color: () => '#36B37E',
                                    strokeWidth: 2,
                                },
                            ],
                        }}
                        width={screenWidth - 32}
                        height={180}
                        chartConfig={{
                            backgroundColor: '#FFFFFF',
                            backgroundGradientFrom: '#FFFFFF',
                            backgroundGradientTo: '#FFFFFF',
                            decimalPlaces: 0,
                            color: (opacity = 1) => `rgba(54, 179, 126, ${opacity})`,
                            labelColor: (opacity = 1) => `rgba(94, 108, 132, ${opacity})`,
                            style: {
                                borderRadius: 16,
                            },
                            propsForDots: {
                                r: '4',
                                strokeWidth: '1',
                                stroke: '#36B37E',
                            },
                            propsForBackgroundLines: {
                                stroke: '#DFE1E6',
                                strokeDasharray: '',
                            },
                        }}
                        bezier
                        style={{
                            marginVertical: 8,
                            borderRadius: 8,
                        }}
                    />
                </View>
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Health Dashboard</Text>
            <Text style={styles.subtitle}>Track your health metrics and stay on top of daily reminders</Text>

            <View style={styles.metricsContainer}>
                <View style={styles.sectionHeaderContainer}>
                    <Text style={styles.sectionTitle}>Latest Metrics</Text>
                    <TouchableOpacity onPress={() => {
                        // Navigate to input form (would implement in a complete app)
                    }}>
                        <Text style={styles.updateLink}>Update</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.metricsScrollContainer}
                >
                    {renderHealthMetricCards()}
                </ScrollView>
            </View>

            {renderReminders()}
            {renderHealthCharts()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginBottom: 24,
    },
    metricsContainer: {
        marginBottom: 24,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
    },
    updateLink: {
        fontSize: 14,
        color: '#2684FF',
        fontWeight: '500',
    },
    metricsScrollContainer: {
        paddingRight: 16,
    },
    metricCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginRight: 12,
        width: 160,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    metricHeader: {
        marginBottom: 8,
    },
    metricName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 4,
    },
    metricDate: {
        fontSize: 12,
        color: '#97A0AF',
    },
    metricValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    metricValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
    },
    metricUnit: {
        fontSize: 14,
        fontWeight: 'normal',
        color: '#5E6C84',
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    highStatus: {
        backgroundColor: '#FF5630',
    },
    lowStatus: {
        backgroundColor: '#FFAB00',
    },
    normalStatus: {
        backgroundColor: '#36B37E',
    },
    normalRange: {
        fontSize: 12,
        color: '#97A0AF',
    },
    remindersContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    reminderItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    reminderInfo: {
        flex: 1,
    },
    reminderTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#091E42',
        marginBottom: 4,
    },
    reminderTime: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 8,
    },
    reminderDays: {
        flexDirection: 'row',
    },
    dayIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 4,
    },
    dayActive: {
        backgroundColor: '#DEEBFF',
    },
    dayInactive: {
        backgroundColor: '#F4F5F7',
    },
    dayText: {
        fontSize: 10,
        fontWeight: '500',
    },
    dayTextActive: {
        color: '#2684FF',
    },
    dayTextInactive: {
        color: '#97A0AF',
    },
    chartsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    timeframeToggle: {
        flexDirection: 'row',
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
    },
    timeframeButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    activeTimeframe: {
        backgroundColor: '#2684FF',
    },
    timeframeText: {
        fontSize: 12,
        color: '#5E6C84',
    },
    activeTimeframeText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#FFFFFF',
    },
    chartCard: {
        marginBottom: 16,
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#091E42',
        marginBottom: 8,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 8,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    legendColor: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 4,
    },
    legendText: {
        fontSize: 12,
        color: '#5E6C84',
    },
});

export default HealthTrackingDashboardScreen; 