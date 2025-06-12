import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SIZES } from '../constants/theme';

type Notification = {
    id: string;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
};

const NotificationsScreen = () => {
    const { t } = useTranslation();
    const { colors } = useTheme();

    // Mock notifications data
    const notifications: Notification[] = [
        {
            id: '1',
            title: t('appointmentReminder'),
            message: t('appointmentReminderMessage'),
            timestamp: '2024-03-20 10:00',
            read: false,
        },
        {
            id: '2',
            title: t('queueUpdate'),
            message: t('queueUpdateMessage'),
            timestamp: '2024-03-19 15:30',
            read: true,
        },
    ];

    const renderNotification = ({ item }: { item: Notification }) => (
        <View style={[styles.notificationCard, { backgroundColor: colors.white }]}>
            <View style={styles.notificationHeader}>
                <Text style={[styles.title, { color: colors.black }]}>{item.title}</Text>
                <Text style={[styles.timestamp, { color: colors.gray }]}>{item.timestamp}</Text>
            </View>
            <Text style={[styles.message, { color: colors.black }]}>{item.message}</Text>
            {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </View>
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