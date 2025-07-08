import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    RefreshControl,
    TouchableOpacity,
    StatusBar,
    ActivityIndicator,
    Alert
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useQueue } from '../context/QueueContext';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { appointmentService } from '../services';
import { useAuthenticatedAPI } from '../hooks/useAuthenticatedAPI';

const QueueStatusScreen = () => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { state: queueState, refreshQueueStatus } = useQueue();
    const { state: authState } = useAuth();
    const { makeAuthenticatedRequest, isAuthenticated } = useAuthenticatedAPI();
    const [refreshing, setRefreshing] = useState(false);
    const [queueData, setQueueData] = useState({
        queueNumber: 0,
        queueIdentifier: '',
        currentPosition: 0,
        totalInQueue: 0,
        doctorName: '',
        estimatedTime: 0,
        department: t('generalPractice'),
        appointmentTime: '',
        status: t('waiting')
    });
    const [loading, setLoading] = useState(true);
    const [timeSinceCreation, setTimeSinceCreation] = useState(0);

    // Load queue data when screen mounts or when the queue state changes
    useEffect(() => {
        fetchQueueData();
    }, [queueState.appointment, isAuthenticated]);

    // Update time since appointment creation every minute
    useEffect(() => {
        if (queueState.appointment?.createdAt) {
            const updateTime = () => {
                if (!queueState.appointment?.createdAt) return;
                const createdAt = new Date(queueState.appointment.createdAt);
                const now = new Date();
                const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
                setTimeSinceCreation(diffInMinutes);
            };
            
            updateTime(); // Initial calculation
            const interval = setInterval(updateTime, 60000); // Update every minute
            
            return () => clearInterval(interval);
        }
    }, [queueState.appointment?.createdAt]);

    // Fetch real queue data from the API
    const fetchQueueData = async () => {
        try {
            setLoading(true);
            
            if (!queueState.appointment) {
                // No active appointment, no queue to display
                setLoading(false);
                return;
            }

            if (!isAuthenticated) {
                console.log('Not authenticated, cannot fetch queue data');
                setLoading(false);
                return;
            }

            // Make authenticated API calls
            await makeAuthenticatedRequest(async () => {
                // Get queue status directly from the queue-status endpoint
                const queueStatusResponse = await appointmentService.getQueueStatus();
                
                console.log('Queue Status Response:', JSON.stringify(queueStatusResponse, null, 2));
                
                if (queueStatusResponse.isSuccess && queueStatusResponse.data) {
                    const queueData = queueStatusResponse.data;
                    
                    const finalQueueData = {
                        queueNumber: queueData.your_number || 0,
                        queueIdentifier: queueData.queue_identifier || '',
                        currentPosition: queueData.queue_position || 0,
                        totalInQueue: queueData.total_in_queue || 0,
                        doctorName: queueData.doctor_name || t('awaitingDoctor'),
                        estimatedTime: queueData.estimated_wait_time || 0,
                        department: t('generalPractice'),
                        appointmentTime: queueState.appointment?.createdAt ? new Date(queueState.appointment.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '',
                        status: getStatusText(queueData.status)
                    };
                    
                    console.log('Final Queue Data:', JSON.stringify(finalQueueData, null, 2));
                    
                    setQueueData(finalQueueData);
                } else {
                    console.log('Queue status response not successful:', queueStatusResponse);
                }
            }, () => {
                // Handle auth error
                Alert.alert(
                    t('authError'),
                    t('pleaseLogInAgain'),
                    [{ text: t('ok') }]
                );
            });
        } catch (error) {
            console.error('Error fetching queue data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Convert API status to display text
    const getStatusText = (status: string) => {
        switch(status) {
            case 'waiting':
                return t('waiting');
            case 'called':
                return t('called');
            case 'in_progress':
            case 'ongoing':
                return t('inProgress');
            case 'completed':
                return t('completed');
            case 'cancelled':
                return t('cancelled');
            case 'skipped':
                return t('skipped');
            default:
                return t('waiting');
        }
    };

    // Format position number with ordinal suffix
    const formatPosition = (position: number): string => {
        if (position === 0) return '0';
        
        const j = position % 10;
        const k = position % 100;
        
        if (j === 1 && k !== 11) {
            return position + 'st';
        }
        if (j === 2 && k !== 12) {
            return position + 'nd';
        }
        if (j === 3 && k !== 13) {
            return position + 'rd';
        }
        return position + 'th';
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch(status) {
            case t('waiting'):
                return COLORS.warning;
            case t('called'):
                return COLORS.primary;
            case t('inProgress'):
                return COLORS.info;
            case t('completed'):
                return COLORS.success;
            case t('cancelled'):
            case t('skipped'):
                return COLORS.error;
            default:
                return COLORS.warning;
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchQueueData();
        setRefreshing(false);
    };

    // Show message if no active appointment
    if (!queueState.appointment) {
        return (
            <View style={styles.container}>
                <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />
                
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>{t('queueStatus')}</Text>
                </View>
                
                <View style={styles.emptyContainer}>
                    <Ionicons name="time-outline" size={60} color={COLORS.lightGray} />
                    <Text style={styles.emptyText}>{t('noActiveAppointment')}</Text>
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => {/* Navigate to appointment booking */}}
                    >
                        <Text style={styles.actionButtonText}>{t('bookAppointment')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

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

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
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
                            <Text style={styles.queueNumberValue}>
                                {queueData.queueNumber}
                                {queueData.queueIdentifier && (
                                    <Text style={styles.queueIdentifier}> ({queueData.queueIdentifier})</Text>
                                )}
                            </Text>
                        </View>

                        <View style={styles.positionContainer}>
                            <Text style={styles.positionValue}>{formatPosition(queueData.currentPosition)}</Text>
                            <Text style={styles.positionLabel}>{t('currentPosition')}</Text>
                        </View>
                    </View>

                    {/* Estimated Time Card */}
                    <View style={styles.card}>
                        {/* <View style={styles.cardHeader}>
                            <Ionicons name="time-outline" size={22} color={COLORS.primary} />
                            <Text style={styles.cardTitle}>{t('estimatedTime')}</Text>
                        </View>

                        <View style={styles.timeContainer}>
                            <Text style={styles.timeValue}>{queueData.estimatedTime}</Text>
                            <Text style={styles.timeUnit}>{t('minutes')}</Text>
                        </View> */}

                        {/* Time since appointment creation */}
                        <View style={styles.timeSinceContainer}>
                            <Text style={styles.timeSinceLabel}>{t('timeSinceCreation')}:</Text>
                            <Text style={styles.timeSinceValue}>{timeSinceCreation} {t('minutes')}</Text>
                        </View>

                        <View style={styles.progressBarContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${(queueData.totalInQueue > 0
                                                ? Math.max(0, (queueData.totalInQueue - queueData.currentPosition) / queueData.totalInQueue * 100)
                                                : 0)}%`
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressLabel}>
                                {queueData.currentPosition > 0 
                                    ? `${queueData.currentPosition} of ${queueData.totalInQueue} in queue`
                                    : t('noQueueData')
                                }
                            </Text>
                        </View>
                    </View>

                    {/* Queue Information Card */}
                    {queueData.totalInQueue > 0 && (
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="people-outline" size={22} color={COLORS.primary} />
                                <Text style={styles.cardTitle}>{t('queueInformation')}</Text>
                            </View>

                            <View style={styles.queueInfoContainer}>
                                <View style={styles.queueInfoItem}>
                                    <Text style={styles.queueInfoLabel}>{t('totalInQueue')}</Text>
                                    <Text style={styles.queueInfoValue}>{queueData.totalInQueue}</Text>
                                </View>
                                <View style={styles.queueInfoItem}>
                                    <Text style={styles.queueInfoLabel}>{t('yourPosition')}</Text>
                                    <Text style={styles.queueInfoValue}>{formatPosition(queueData.currentPosition)}</Text>
                                </View>
                            </View>
                        </View>
                    )}

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
                            <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(queueData.status) }]} />
                            <Text style={styles.statusText}>{queueData.status}</Text>
                        </View>

                        <Text style={styles.statusMessage}>
                            {queueData.status === t('waiting') 
                                ? t('waitForNumber')
                                : queueData.status === t('called')
                                ? t('proceedToReception')
                                : queueData.status === t('inProgress')
                                ? t('meetingWithDoctor')
                                : queueData.status === t('completed')
                                ? t('appointmentCompleted')
                                : t('appointmentCancelled')
                            }
                        </Text>
                    </View>

                    {/* Action Button */}
                    <TouchableOpacity style={styles.actionButton} onPress={onRefresh}>
                        <Text style={styles.actionButtonText}>{t('refresh')}</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}
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
    queueIdentifier: {
        ...FONTS.body4,
        color: COLORS.gray,
        fontWeight: 'normal',
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
    timeSinceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: SIZES.base,
        paddingHorizontal: SIZES.base,
        backgroundColor: COLORS.lightGray + '30',
        borderRadius: SIZES.radius,
        padding: SIZES.base,
    },
    timeSinceLabel: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginRight: 8,
    },
    timeSinceValue: {
        ...FONTS.body4,
        color: COLORS.primary,
        fontWeight: 'bold',
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
    progressLabel: {
        ...FONTS.body5,
        color: COLORS.gray,
        marginTop: 4,
        textAlign: 'center',
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
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SIZES.padding,
    },
    emptyText: {
        ...FONTS.h3,
        color: COLORS.gray,
        marginBottom: SIZES.padding,
    },
    queueInfoContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: SIZES.base,
    },
    queueInfoItem: {
        alignItems: 'center',
    },
    queueInfoLabel: {
        ...FONTS.body5,
        color: COLORS.gray,
        marginBottom: 4,
    },
    queueInfoValue: {
        ...FONTS.h2,
        color: COLORS.primary,
        fontWeight: 'bold',
    },
});

export default QueueStatusScreen; 