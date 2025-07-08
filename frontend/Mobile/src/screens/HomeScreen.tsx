import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Image,
    TouchableOpacity,
    StatusBar,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, SIZES } from '../constants/theme';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';
import { useNotifications } from '../context/NotificationsContext';
import { Appointment } from '../types';
import { useAuthenticatedAPI } from '../hooks/useAuthenticatedAPI';
import { appointmentService } from '../services';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const { state: authState } = useAuth();
    const { getAppointments } = useQueue();
    const { state: notificationState } = useNotifications();
    const { makeAuthenticatedRequest, isAuthenticated } = useAuthenticatedAPI();
    
    const [stats, setStats] = useState({
        appointments: '0',
        queuePosition: '0',
        notifications: '0',
    });
    const [queueStats, setQueueStats] = useState({
        queueNumber: '-',
        queueIdentifier: '',
        currentPosition: '-',
        totalInQueue: '-',
        doctorName: '',
        estimatedTime: '-',
        status: '',
    });
    const [loading, setLoading] = useState(true);

    // Load real data on component mount
    useEffect(() => {
        loadData();
    }, [isAuthenticated]);

    const loadData = async () => {
        try {
            setLoading(true);
            
            if (!isAuthenticated) {
                console.log('Not authenticated, cannot load home data');
                setLoading(false);
                return;
            }
            
            await makeAuthenticatedRequest(async () => {
                const appointments = await getAppointments();
                
                // Calculate stats
                const activeAppointments = appointments.filter(
                    a => a.status === 'waiting' || a.status === 'in_progress' || a.status === 'scheduled'
                );
                
                // Fetch queue status from backend
                let queueStatsData = {
                    queueNumber: '-',
                    queueIdentifier: '',
                    currentPosition: '-',
                    totalInQueue: '-',
                    doctorName: '',
                    estimatedTime: '-',
                    status: '',
                };
                try {
                    const queueStatusResponse = await appointmentService.getQueueStatus();
                    if (queueStatusResponse.isSuccess && queueStatusResponse.data) {
                        const q = queueStatusResponse.data;
                        queueStatsData = {
                            queueNumber: q.your_number?.toString() ?? '-',
                            queueIdentifier: q.queue_identifier ?? '',
                            currentPosition: q.queue_position?.toString() ?? '-',
                            totalInQueue: q.total_in_queue?.toString() ?? '-',
                            doctorName: q.doctor_name ?? '',
                            estimatedTime: q.estimated_wait_time?.toString() ?? '-',
                            status: q.status ?? '',
                        };
                    }
                } catch (e) {
                    console.log('Failed to fetch queue status:', e);
                }
                setQueueStats(queueStatsData);
                
                // Count unread notifications
                const unreadNotifications = notificationState.notifications.filter(n => !n.read).length;
                
                // Update stats
                setStats({
                    appointments: activeAppointments.length.toString(),
                    queuePosition: queueStatsData.currentPosition,
                    notifications: unreadNotifications.toString(),
                });
            }, () => {
                // Handle authentication error
                Alert.alert(
                    t('authError'),
                    t('pleaseLogInAgain'),
                    [{ text: t('ok') }]
                );
            });
        } catch (error) {
            console.error('Error loading home data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Define menu options for the home screen
    const menuOptions = [
        {
            id: 'appointment',
            title: t('appointmentReg'),
            icon: 'calendar-outline',
            color: COLORS.primary,
            description: t('bookAppointment'),
            onPress: () => navigation.navigate('Appointment'),
        },
        {
            id: 'appointments',
            title: t('appointments'),
            icon: 'list-outline',
            color: COLORS.success,
            description: t('viewAppointments'),
            onPress: () => navigation.navigate('Appointments'),
        },
        {
            id: 'queue',
            title: t('queueStatus'),
            icon: 'time-outline',
            color: COLORS.warning,
            description: t('checkQueuePosition'),
            onPress: () => {
                const parent = navigation.getParent();
                if (parent) {
                    parent.navigate('MainTabs', { screen: 'QueueStatus' });
                }
            },
        },
        {
            id: 'notifications',
            title: t('notifications'),
            icon: 'notifications-outline',
            color: COLORS.info,
            description: t('viewNotifications'),
            onPress: () => {
                const parent = navigation.getParent();
                if (parent) {
                    parent.navigate('MainTabs', { screen: 'Notifications' });
                }
            },
        },
        {
            id: 'help',
            title: t('help'),
            icon: 'help-circle-outline',
            color: COLORS.secondary,
            description: t('getAssistance'),
            onPress: () => navigation.navigate('Help'),
        },
    ];

    // Stats for dashboard
    const statsItems = [
        {
            id: 'appointments',
            title: t('appointments'),
            value: stats.appointments,
            icon: 'calendar',
            color: COLORS.primary,
        },
        {
            id: 'queue',
            title: t('queuePosition'),
            value: stats.queuePosition === '0' ? '-' : stats.queuePosition,
            icon: 'time',
            color: COLORS.warning,
        },
        {
            id: 'notifications',
            title: t('notifications'),
            value: stats.notifications,
            icon: 'notifications',
            color: COLORS.info,
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

            {/* Dashboard Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>
                        {t('greeting')}
                    </Text>
                    <Text style={styles.name}>
                        {authState.user ? authState.user.fullName : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' })}
                >
                    <Ionicons name="person-circle-outline" size={40} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Stats Dashboard */}
                <View style={styles.statsContainer}>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.primary + '15' }]}> 
                            <Ionicons name={'calendar'} size={22} color={COLORS.primary} />
                        </View>
                        <Text style={styles.statValue}>{stats.appointments}</Text>
                        <Text style={styles.statTitle}>{t('appointments')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.warning + '15' }]}> 
                            <Ionicons name={'time'} size={22} color={COLORS.warning} />
                        </View>
                        <Text style={styles.statValue}>{queueStats.currentPosition}</Text>
                        <Text style={styles.statTitle}>{t('queuePosition')}</Text>
                        {/* {queueStats.queueIdentifier ? (
                            <Text style={styles.statTitle}>{t('queueIdentifier')}: {queueStats.queueIdentifier}</Text>
                        ) : null}
                        {queueStats.totalInQueue !== '-' ? (
                            <Text style={styles.statTitle}>{t('totalInQueue')}: {queueStats.totalInQueue}</Text>
                        ) : null} */}
                    </View>
                    <View style={styles.statCard}>
                        <View style={[styles.statIconContainer, { backgroundColor: COLORS.info + '15' }]}> 
                            <Ionicons name={'notifications'} size={22} color={COLORS.info} />
                        </View>
                        <Text style={styles.statValue}>{stats.notifications}</Text>
                        <Text style={styles.statTitle}>{t('notifications')}</Text>
                    </View>
                </View>

                {/* Main cards */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{t('services')}</Text>

                    {menuOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.serviceCard}
                            onPress={option.onPress}
                            accessible={true}
                            accessibilityLabel={option.title}
                            accessibilityRole="button"
                        >
                            <View style={styles.serviceContent}>
                                <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                                    <Ionicons name={option.icon as any} size={24} color={option.color} />
                                </View>
                                <View style={styles.serviceTextContainer}>
                                    <Text style={styles.serviceTitle}>{option.title}</Text>
                                    <Text style={styles.serviceDescription}>{option.description}</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* We'll remove the static Recent Activity section since we're using real data */}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding * 1.2,
        paddingTop: SIZES.padding * 1.5 + SIZES.topSpacing,
    },
    greeting: {
        ...FONTS.body4,
        color: COLORS.white,
        opacity: 0.9,
    },
    name: {
        ...FONTS.h3,
        color: COLORS.white,
    },
    profileButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        padding: SIZES.padding,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -SIZES.padding, // Overlap with header
        marginBottom: SIZES.padding,
    },
    statCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        width: '31%',
        alignItems: 'center',
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        ...FONTS.h2,
        color: COLORS.black,
    },
    statTitle: {
        ...FONTS.body5,
        color: COLORS.gray,
        textAlign: 'center',
    },
    sectionContainer: {
        marginBottom: SIZES.padding * 1.5,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.black,
        marginBottom: SIZES.padding,
    },
    serviceCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    serviceContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.padding,
    },
    serviceTextContainer: {
        flex: 1,
    },
    serviceTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginBottom: 4,
    },
    serviceDescription: {
        ...FONTS.body5,
        color: COLORS.gray,
    },
});

export default HomeScreen; 