import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    StatusBar,
    ScrollView,
    Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, SIZES } from '../constants/theme';
import { RootStackParamList } from '../navigation';
import { useQueue } from '../context/QueueContext';
import { useAuth } from '../context/AuthContext';
import { Appointment } from '../types';
import { useAuthenticatedAPI } from '../hooks/useAuthenticatedAPI';

type AppointmentsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AppointmentsScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<AppointmentsScreenNavigationProp>();
    const { getAppointments, cancelAppointment } = useQueue();
    const { isAuthenticated, makeAuthenticatedRequest, verifyToken } = useAuthenticatedAPI();
    const { state: authState } = useAuth(); // Get auth state directly from AuthContext

    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // 'all', 'upcoming', 'completed', 'cancelled'

    // Fetch appointments when screen is focused
    useFocusEffect(
        useCallback(() => {
            // Verify token first, then fetch appointments
            verifyToken().then(isValid => {
                console.log('Token verification result:', isValid);
                fetchAppointments();
            });
        }, [])
    );

    // Fetch appointments from API
    const fetchAppointments = async () => {
        try {
            setLoading(true);
            
            // First check if we have a user in the auth state
            if (!authState?.user) {
                console.log('No user in auth state, cannot fetch appointments');
                setLoading(false);
                return;
            }
            
            // Check authentication properly by calling verifyToken explicitly
            // instead of just accessing the isAuthenticated state value
            const isTokenValid = await verifyToken();
            
            if (!isTokenValid) {
                console.log('Not authenticated, cannot fetch appointments');
                // Don't show alert immediately - let's try to recover the session first
                setLoading(false);
                return;
            }
            
            // Now use makeAuthenticatedRequest which will handle token validation again
            await makeAuthenticatedRequest(async () => {
                try {
                    const fetchedAppointments = await getAppointments();
                    setAppointments(fetchedAppointments);
                } catch (error) {
                    console.error('Error in getAppointments:', error);
                    Alert.alert(
                        t('error'),
                        t('failedToLoadAppointments'),
                        [{ text: t('ok') }]
                    );
                }
            }, () => {
                // Handle authentication error
                Alert.alert(
                    t('authError'),
                    t('pleaseLogInAgain'),
                    [{ text: t('ok') }]
                );
            });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            Alert.alert(
                t('error'),
                t('failedToLoadAppointments'),
                [{ text: t('ok') }]
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Handle pull-to-refresh
    const onRefresh = () => {
        setRefreshing(true);
        fetchAppointments();
    };

    // Format date
    const formatAppointmentDate = (dateString: string) => {
        try {
            return format(parseISO(dateString), 'dd MMM yyyy');
        } catch {
            return dateString;
        }
    };

    // Handle appointment cancellation
    const handleCancelAppointment = (id: string) => {
        // Show confirmation dialog
        Alert.alert(
            t('cancelAppointmentTitle'),
            t('cancelAppointmentMessage'),
            [
                {
                    text: t('no'),
                    style: 'cancel'
                },
                {
                    text: t('yes'),
                    onPress: async () => {
                        try {
                            await cancelAppointment(id);
                            // Update the local list without refetching
                            const updatedAppointments = appointments.map(appointment => 
                                appointment.id === id 
                                    ? { ...appointment, status: 'cancelled' as const } 
                                    : appointment
                            );
                            setAppointments(updatedAppointments);
                        } catch (error) {
                            console.error('Error cancelling appointment:', error);
                            Alert.alert(t('error'), t('cancelAppointmentError'));
                        }
                    }
                }
            ]
        );
    };

    // Get filtered appointments
    const getFilteredAppointments = () => {
        switch(filter) {
            case 'upcoming':
                return appointments.filter(appointment => 
                    appointment.status === 'waiting' || appointment.status === 'ongoing'
                );
            case 'completed':
                return appointments.filter(appointment => appointment.status === 'completed');
            case 'cancelled':
                return appointments.filter(appointment => appointment.status === 'cancelled');
            default:
                return appointments;
        }
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch(status) {
            case 'waiting':
                return COLORS.warning;
            case 'ongoing':
                return COLORS.info;
            case 'completed':
                return COLORS.success;
            case 'cancelled':
                return COLORS.error;
            default:
                return COLORS.gray;
        }
    };

    // Get status text from key
    const getStatusText = (status: string) => {
        switch(status) {
            case 'waiting':
                return t('waiting');
            case 'ongoing':
                return t('ongoing');
            case 'completed':
                return t('completed');
            case 'cancelled':
                return t('cancelled');
            default:
                return status;
        }
    };

    // Navigate to appointment details
    const goToAppointmentDetails = (appointment: Appointment) => {
        // Implementation will depend on your navigation setup
        // navigation.navigate('AppointmentDetails', { appointmentId: appointment.id });
    };

    // Render appointment card
    const renderAppointmentCard = ({ item }: { item: Appointment }) => {
        const canCancel = item.status === 'waiting';
        
        return (
            <TouchableOpacity 
                style={styles.appointmentCard}
                onPress={() => goToAppointmentDetails(item)}
            >
                <View style={styles.appointmentHeader}>
                    <View style={styles.dateContainer}>
                        <Ionicons name="calendar" size={16} color={COLORS.primary} />
                        <Text style={styles.appointmentDate}>
                            {formatAppointmentDate(item.dateOfBirth)}
                        </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                        <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                            {getStatusText(item.status)}
                        </Text>
                    </View>
                </View>

                <Text style={styles.appointmentTitle}>
                    {item.doctorName ? t('appointmentWithDr', { doctor: item.doctorName }) : t('hospitalAppointment')}
                </Text>

                {item.conditionType && (
                    <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>{t('reason')}:</Text>
                        <Text style={styles.detailValue}>{item.conditionType}</Text>
                    </View>
                )}

                {item.status === 'waiting' && (
                    <View style={styles.queueInfo}>
                        <View style={styles.queueItem}>
                            <Text style={styles.queueLabel}>{t('queueNumber')}</Text>
                            <Text style={styles.queueValue}>{item.queueNumber}</Text>
                        </View>
                        <View style={styles.queueItem}>
                            <Text style={styles.queueLabel}>{t('position')}</Text>
                            <Text style={styles.queueValue}>{item.currentPosition}</Text>
                        </View>
                        <View style={styles.queueItem}>
                            <Text style={styles.queueLabel}>{t('estimatedWait')}</Text>
                            <Text style={styles.queueValue}>{item.estimatedTime} {t('mins')}</Text>
                        </View>
                    </View>
                )}

                {canCancel && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={() => handleCancelAppointment(item.id)}
                    >
                        <Ionicons name="close-circle-outline" size={16} color={COLORS.error} />
                        <Text style={styles.cancelButtonText}>{t('cancelAppointment')}</Text>
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );
    };

    // Render filter tabs
    const renderFilterTabs = () => (
        <View style={styles.filterContainer}>
            <ScrollableTab
                tabs={[
                    { key: 'all', label: t('allAppointments') },
                    { key: 'upcoming', label: t('upcoming') },
                    { key: 'completed', label: t('completed') },
                    { key: 'cancelled', label: t('cancelled') },
                ]}
                activeTab={filter}
                onChangeTab={setFilter}
            />
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('appointments')}</Text>
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('Appointment')}
                >
                    <Ionicons name="add" size={24} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            {/* Filter tabs */}
            {renderFilterTabs()}

            {/* Appointments list */}
            {loading && !refreshing ? (
                <View style={styles.loaderContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={getFilteredAppointments()}
                    keyExtractor={(item) => item.id}
                    renderItem={renderAppointmentCard}
                    contentContainerStyle={styles.listContainer}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="calendar-outline" size={60} color={COLORS.lightGray} />
                            <Text style={styles.emptyText}>{t('noAppointmentsFound')}</Text>
                            <TouchableOpacity
                                style={styles.newAppointmentButton}
                                onPress={() => navigation.navigate('Appointment')}
                            >
                                <Text style={styles.newAppointmentButtonText}>{t('createNewAppointment')}</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

// Scrollable tab component
interface Tab {
    key: string;
    label: string;
}

const ScrollableTab: React.FC<{
    tabs: Tab[];
    activeTab: string;
    onChangeTab: (key: string) => void;
}> = ({ tabs, activeTab, onChangeTab }) => {
    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollableTabs}
        >
            {tabs.map(tab => (
                <TouchableOpacity
                    key={tab.key}
                    style={[
                        styles.tabItem,
                        activeTab === tab.key && styles.activeTab
                    ]}
                    onPress={() => onChangeTab(tab.key)}
                >
                    <Text 
                        style={[
                            styles.tabText,
                            activeTab === tab.key && styles.activeTabText
                        ]}
                    >
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding,
        paddingTop: SIZES.padding * 1.5 + SIZES.topSpacing,
    },
    headerTitle: {
        ...FONTS.h2,
        color: COLORS.white,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    filterContainer: {
        backgroundColor: COLORS.white,
        paddingVertical: SIZES.padding / 2,
    },
    scrollableTabs: {
        flexDirection: 'row',
        paddingHorizontal: SIZES.padding,
    },
    tabItem: {
        paddingVertical: SIZES.base,
        paddingHorizontal: SIZES.padding,
        marginRight: SIZES.base,
        borderRadius: SIZES.radius,
    },
    activeTab: {
        backgroundColor: COLORS.primary + '15',
    },
    tabText: {
        ...FONTS.body4,
        color: COLORS.gray,
    },
    activeTabText: {
        ...FONTS.h4,
        color: COLORS.primary,
    },
    listContainer: {
        padding: SIZES.padding,
        paddingBottom: SIZES.padding * 2,
    },
    appointmentCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    appointmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.base,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    appointmentDate: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginLeft: SIZES.base / 2,
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: 12,
    },
    statusText: {
        ...FONTS.body5,
        fontWeight: '500',
    },
    appointmentTitle: {
        ...FONTS.h3,
        marginBottom: SIZES.base,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: 4,
    },
    detailLabel: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginRight: 4,
    },
    detailValue: {
        ...FONTS.body4,
    },
    queueInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.lightGray + '50',
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginTop: SIZES.base,
    },
    queueItem: {
        alignItems: 'center',
    },
    queueLabel: {
        ...FONTS.body5,
        color: COLORS.gray,
        marginBottom: 2,
    },
    queueValue: {
        ...FONTS.h3,
        color: COLORS.primary,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: SIZES.base,
        marginTop: SIZES.padding,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
    },
    cancelButtonText: {
        ...FONTS.body4,
        color: COLORS.error,
        marginLeft: SIZES.base / 2,
    },
    loaderContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SIZES.padding * 2,
    },
    emptyText: {
        ...FONTS.body3,
        color: COLORS.gray,
        textAlign: 'center',
        marginVertical: SIZES.padding,
    },
    newAppointmentButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: SIZES.base,
        paddingHorizontal: SIZES.padding,
        borderRadius: SIZES.radius,
        marginTop: SIZES.base,
    },
    newAppointmentButtonText: {
        ...FONTS.body4,
        color: COLORS.white,
    },
});

export default AppointmentsScreen; 