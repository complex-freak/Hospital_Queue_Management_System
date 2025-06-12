import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useQueue } from '../context/QueueContext';
import { Ionicons } from '@expo/vector-icons';

const QueueStatusScreen = () => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { state: queueState, refreshQueueStatus } = useQueue();
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = async () => {
        setRefreshing(true);
        await refreshQueueStatus();
        setRefreshing(false);
    };

    // Mock data for estimated times
    const queueData = {
        queueNumber: queueState.appointment?.queueNumber || 'A45',
        currentPosition: queueState.appointment?.currentPosition || 4,
        doctorName: queueState.appointment?.doctorName || 'Dr. Sarah Johnson',
        estimatedTime: queueState.appointment?.estimatedTime || 25,
        department: t('generalPractice'),
        appointmentTime: '10:30 AM',
        status: t('waiting')
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('queueStatus')}</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={onRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? (
                        <ActivityIndicator color={COLORS.white} size="small" />
                    ) : (
                        <Ionicons name="refresh" size={24} color={COLORS.white} />
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                showsVerticalScrollIndicator={false}
            >
                {/* Queue Overview Card */}
                <View style={styles.overviewCard}>
                    <View style={styles.queueNumberContainer}>
                        <Text style={styles.queueNumberLabel}>{t('queueNumber')}</Text>
                        <Text style={styles.queueNumberValue}>{queueData.queueNumber}</Text>
                    </View>

                    <View style={styles.positionContainer}>
                        <Text style={styles.positionValue}>{queueData.currentPosition}</Text>
                        <Text style={styles.positionLabel}>{t('currentPosition')}</Text>
                    </View>
                </View>

                {/* Estimated Time Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="time-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.cardTitle}>{t('estimatedTime')}</Text>
                    </View>

                    <View style={styles.timeContainer}>
                        <Text style={styles.timeValue}>{queueData.estimatedTime}</Text>
                        <Text style={styles.timeUnit}>{t('minutes')}</Text>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${(queueData.currentPosition <= 5
                                            ? (5 - queueData.currentPosition) / 5 * 100
                                            : 0)}%`
                                    }
                                ]}
                            />
                        </View>
                    </View>
                </View>

                {/* Doctor Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.cardTitle}>{t('doctorName')}</Text>
                    </View>

                    <Text style={styles.doctorName}>{queueData.doctorName}</Text>
                    <Text style={styles.department}>{queueData.department}</Text>

                    <View style={styles.appointmentInfo}>
                        <View style={styles.appointmentInfoItem}>
                            <Ionicons name="calendar-outline" size={16} color={COLORS.gray} />
                            <Text style={styles.appointmentInfoText}>{t('today')}</Text>
                        </View>
                        <View style={styles.appointmentInfoItem}>
                            <Ionicons name="time-outline" size={16} color={COLORS.gray} />
                            <Text style={styles.appointmentInfoText}>{queueData.appointmentTime}</Text>
                        </View>
                    </View>
                </View>

                {/* Status Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.cardTitle}>{t('status')}</Text>
                    </View>

                    <View style={styles.statusContainer}>
                        <View style={[styles.statusIndicator, { backgroundColor: COLORS.warning }]} />
                        <Text style={styles.statusText}>{queueData.status}</Text>
                    </View>

                    <Text style={styles.statusMessage}>
                        {t('waitForNumber')}
                    </Text>
                </View>

                {/* Action Button */}
                <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
                    <Text style={styles.actionButtonText}>{t('refresh')}</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding * 1.2,
        paddingTop: SIZES.padding * 1.2 + SIZES.topSpacing,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        ...FONTS.h3,
        color: COLORS.white,
    },
    refreshButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    content: {
        padding: SIZES.padding,
        paddingBottom: SIZES.padding * 2,
    },
    overviewCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 3,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    queueNumberContainer: {
        alignItems: 'flex-start',
    },
    queueNumberLabel: {
        ...FONTS.body5,
        color: COLORS.gray,
        marginBottom: 4,
    },
    queueNumberValue: {
        ...FONTS.h1,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    positionContainer: {
        alignItems: 'center',
        backgroundColor: COLORS.primary + '15',
        padding: SIZES.padding,
        borderRadius: SIZES.radius,
    },
    positionValue: {
        ...FONTS.h1,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    positionLabel: {
        ...FONTS.body5,
        color: COLORS.gray,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SIZES.base,
    },
    cardTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginLeft: 8,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        marginVertical: SIZES.base,
    },
    timeValue: {
        ...FONTS.h1,
        color: COLORS.black,
        fontWeight: 'bold',
    },
    timeUnit: {
        ...FONTS.body3,
        color: COLORS.gray,
        marginLeft: 4,
        marginBottom: 4,
    },
    progressBarContainer: {
        marginTop: SIZES.base,
    },
    progressBar: {
        height: 8,
        backgroundColor: COLORS.lightGray,
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: COLORS.primary,
    },
    doctorName: {
        ...FONTS.h3,
        color: COLORS.black,
        marginVertical: 4,
    },
    department: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginBottom: SIZES.base,
    },
    appointmentInfo: {
        flexDirection: 'row',
        marginTop: SIZES.base,
    },
    appointmentInfoItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: SIZES.padding,
    },
    appointmentInfoText: {
        ...FONTS.body5,
        color: COLORS.gray,
        marginLeft: 4,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SIZES.base,
    },
    statusIndicator: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 8,
    },
    statusText: {
        ...FONTS.h3,
        color: COLORS.black,
    },
    statusMessage: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginTop: 4,
    },
    actionButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius,
        paddingVertical: SIZES.padding,
        alignItems: 'center',
        marginTop: SIZES.base,
    },
    actionButtonText: {
        ...FONTS.h4,
        color: COLORS.white,
    },
});

export default QueueStatusScreen; 