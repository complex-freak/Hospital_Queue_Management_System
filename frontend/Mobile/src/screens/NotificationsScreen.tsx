import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

type Notification = {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    type: 'appointment' | 'queue' | 'system';
    relatedId?: string;
};

const NotificationsScreen = () => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const navigation = useNavigation<NotificationsScreenNavigationProp>();

    // Format date for display
    const formatDate = (dateStr: string) => {
        try {
            return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm');
        } catch {
            return dateStr;
        }
    };

    // Mock notifications data
    const notifications: Notification[] = [
        {
            id: '1',
            title: t('upcomingAppointment'),
            message: t('upcomingAppointmentMessage', { time: '30', date: format(addDays(new Date(), 1), 'dd MMM yyyy') }),
            timestamp: new Date().toISOString(),
            read: false,
            type: 'appointment',
            relatedId: 'appt-003',
        },
        {
            id: '2',
            title: t('appointmentReminder'),
            message: t('appointmentReminderMessage'),
            timestamp: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
            read: false,
            type: 'appointment',
        },
        {
            id: '3',
            title: t('queueUpdate'),
            message: t('queueUpdateMessage'),
            timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(), // 2 hours ago
            read: true,
            type: 'queue',
        },
        {
            id: '4',
            title: t('appointmentConfirmed'),
            message: t('appointmentConfirmedMessage', { date: format(addDays(new Date(), 5), 'dd MMM yyyy') }),
            timestamp: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // 1 day ago
            read: true,
            type: 'appointment',
            relatedId: 'appt-003',
        },
    ];

    // Handle notification press
    const handleNotificationPress = (notification: Notification) => {
        if (notification.type === 'appointment' && notification.relatedId) {
            navigation.navigate('MainTabs', { screen: 'Appointments' });
        } else if (notification.type === 'queue') {
            navigation.navigate('MainTabs', { screen: 'QueueStatus' });
        }
    };

    // Get icon for notification type
    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'appointment':
                return 'calendar';
            case 'queue':
                return 'time';
            default:
                return 'information-circle';
        }
    };

    const renderNotification = ({ item }: { item: Notification }) => (
        <TouchableOpacity 
            style={[styles.notificationCard, { backgroundColor: colors.white }]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.notificationHeader}>
                <View style={styles.titleContainer}>
                    <Ionicons 
                        name={getNotificationIcon(item.type)} 
                        size={18} 
                        color={
                            item.type === 'appointment' 
                                ? COLORS.primary 
                                : item.type === 'queue' 
                                ? COLORS.warning 
                                : COLORS.info
                        } 
                        style={styles.notificationIcon}
                    />
                    <Text style={[styles.title, { color: colors.black }]}>{item.title}</Text>
                </View>
                <Text style={[styles.timestamp, { color: colors.gray }]}>{formatDate(item.timestamp)}</Text>
            </View>
            <Text style={[styles.message, { color: colors.black }]}>{item.message}</Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <FlatList
                data={notifications}
                renderItem={renderNotification}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    listContainer: {
        padding: SIZES.padding,
    },
    notificationCard: {
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.margin,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.base,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    notificationIcon: {
        marginRight: 8,
    },
    title: {
        ...FONTS.h4,
        flex: 1,
    },
    timestamp: {
        ...FONTS.body5,
    },
    message: {
        ...FONTS.body4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        position: 'absolute',
        top: SIZES.padding,
        right: SIZES.padding,
    },
});

export default NotificationsScreen; 