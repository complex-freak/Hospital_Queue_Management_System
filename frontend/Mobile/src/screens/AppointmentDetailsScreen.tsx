import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    RefreshControl,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { format, parseISO } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, SIZES } from '../constants/theme';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../context/AuthContext';
import { useQueue } from '../context/QueueContext';
import { appointmentService } from '../services/api/appointments';
import useAuthenticatedAPI from '../hooks/useAuthenticatedAPI';
import { Appointment } from '../types';

// Add this interface near the top of the file
interface AppointmentResponseWithQueue {
    queue_position?: number;
    estimated_wait_time?: number;
    queue_number?: number;
    [key: string]: any;
}

type AppointmentDetailsRouteProp = RouteProp<RootStackParamList, 'AppointmentDetails'>;
type AppointmentDetailsNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AppointmentDetailsScreen: React.FC = () => {
    const { t } = useTranslation();
    const route = useRoute<AppointmentDetailsRouteProp>();
    const navigation = useNavigation<AppointmentDetailsNavigationProp>();
    const { appointmentId } = route.params;
    const { cancelAppointment } = useQueue();
    const { makeAuthenticatedRequest, verifyToken } = useAuthenticatedAPI();
    const { state: authState } = useAuth();

    const [appointment, setAppointment] = useState<Appointment | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch appointment details
    const fetchAppointmentDetails = async () => {
        try {
            setLoading(true);
            
            // First check if we have a user in the auth state
            if (!authState?.user) {
                console.log('No user in auth state, cannot fetch appointment details');
                setLoading(false);
                return;
            }
            
            // Check authentication properly
            const isTokenValid = await verifyToken();
            
            if (!isTokenValid) {
                console.log('Not authenticated, cannot fetch appointment details');
                setLoading(false);
                return;
            }
            
            await makeAuthenticatedRequest(async () => {
                try {
                    const response = await appointmentService.getAppointmentById(appointmentId);
                    
                    if (response.isSuccess && response.data) {
                        const appointmentData = appointmentService.transformAppointmentData(
                            response.data,
                            (response.data as AppointmentResponseWithQueue).queue_position ? {
                                queue_position: (response.data as AppointmentResponseWithQueue).queue_position!,
                                estimated_wait_time: (response.data as AppointmentResponseWithQueue).estimated_wait_time || null,
                                current_serving: null,
                                total_in_queue: 0,
                                your_number: (response.data as AppointmentResponseWithQueue).queue_number || 0,
                                status: 'WAITING'
                            } : undefined
                        );
                        setAppointment(appointmentData);
                    } else {
                        Alert.alert(
                            t('error'),
                            t('failedToLoadAppointmentDetails'),
                            [{ text: t('ok') }]
                        );
                    }
                } catch (error) {
                    console.error('Error in getAppointmentById:', error);
                    Alert.alert(
                        t('error'),
                        t('failedToLoadAppointmentDetails'),
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
            console.error('Error fetching appointment details:', error);
            Alert.alert(
                t('error'),
                t('failedToLoadAppointmentDetails'),
                [{ text: t('ok') }]
            );
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Load appointment details on screen mount
    useEffect(() => {
        fetchAppointmentDetails();
    }, [appointmentId]);

    // Handle pull-to-refresh
    const onRefresh = () => {
        setRefreshing(true);
        fetchAppointmentDetails();
    };

    // Format date
    const formatAppointmentDate = (dateString: string) => {
        try {
            return format(parseISO(dateString), 'dd MMM yyyy, HH:mm');
        } catch {
            return dateString;
        }
    };

    // Handle appointment cancellation
    const handleCancelAppointment = () => {
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
                            await cancelAppointment(appointmentId);
                            // Update the appointment status locally
                            if (appointment) {
                                setAppointment({
                                    ...appointment,
                                    status: 'cancelled'
                                });
                            }
                            Alert.alert(
                                t('success'),
                                t('appointmentCancelled'),
                                [{ text: t('ok') }]
                            );
                        } catch (error) {
                            console.error('Error cancelling appointment:', error);
                            Alert.alert(t('error'), t('cancelAppointmentError'));
                        }
                    }
                }
            ]
        );
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

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('appointmentDetails')}</Text>
                <View style={styles.headerRight} />
            </View>

            {loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={[COLORS.primary]}
                        />
                    }
                >
                    {appointment ? (
                        <>
                            {/* Status Badge */}
                            <View style={styles.statusContainer}>
                                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(appointment.status) + '20' }]}>
                                    <Text style={[styles.statusText, { color: getStatusColor(appointment.status) }]}>
                                        {getStatusText(appointment.status)}
                                    </Text>
                                </View>
                            </View>

                            {/* Appointment Details Card */}
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>{t('appointmentInformation')}</Text>
                                
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('date')}:</Text>
                                    <Text style={styles.detailValue}>
                                        {formatAppointmentDate(appointment.createdAt)}
                                    </Text>
                                </View>

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('patientName')}:</Text>
                                    <Text style={styles.detailValue}>{appointment.patientName}</Text>
                                </View>

                                {appointment.doctorName && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>{t('doctor')}:</Text>
                                        <Text style={styles.detailValue}>{appointment.doctorName}</Text>
                                    </View>
                                )}

                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>{t('urgency')}:</Text>
                                    <Text style={styles.detailValue}>{appointment.conditionType}</Text>
                                </View>

                                {appointment.reasonForVisit && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>{t('reasonForVisit')}:</Text>
                                        <Text style={styles.detailValue}>{appointment.reasonForVisit}</Text>
                                    </View>
                                )}

                                {appointment.additionalInformation && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>{t('additionalInfo')}:</Text>
                                        <Text style={styles.detailValue}>{appointment.additionalInformation}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Queue Information Card - Show only for waiting appointments */}
                            {appointment.status === 'waiting' && (
                                <View style={styles.card}>
                                    <Text style={styles.cardTitle}>{t('queueInformation')}</Text>
                                    
                                    <View style={styles.queueInfo}>
                                        <View style={styles.queueItem}>
                                            <Text style={styles.queueLabel}>{t('queueNumber')}</Text>
                                            <Text style={styles.queueValue}>{appointment.queueNumber}</Text>
                                        </View>
                                        <View style={styles.queueItem}>
                                            <Text style={styles.queueLabel}>{t('position')}</Text>
                                            <Text style={styles.queueValue}>{appointment.currentPosition}</Text>
                                        </View>
                                        <View style={styles.queueItem}>
                                            <Text style={styles.queueLabel}>{t('estimatedWait')}</Text>
                                            <Text style={styles.queueValue}>{appointment.estimatedTime} {t('mins')}</Text>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Actions */}
                            {appointment.status === 'waiting' && (
                                <TouchableOpacity
                                    style={styles.cancelButton}
                                    onPress={handleCancelAppointment}
                                >
                                    <Ionicons name="close-circle-outline" size={20} color={COLORS.white} />
                                    <Text style={styles.cancelButtonText}>{t('cancelAppointment')}</Text>
                                </TouchableOpacity>
                            )}
                        </>
                    ) : (
                        <View style={styles.notFoundContainer}>
                            <Ionicons name="alert-circle-outline" size={60} color={COLORS.gray} />
                            <Text style={styles.notFoundText}>{t('appointmentNotFound')}</Text>
                        </View>
                    )}
                </ScrollView>
            )}
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
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding,
        paddingTop: SIZES.padding * 1.5 + SIZES.topSpacing,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...FONTS.h2,
        color: COLORS.white,
    },
    headerRight: {
        width: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: SIZES.padding,
        paddingBottom: SIZES.padding * 3,
    },
    statusContainer: {
        alignItems: 'center',
        marginBottom: SIZES.padding,
    },
    statusBadge: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
    },
    statusText: {
        ...FONTS.h3,
        fontWeight: '600',
    },
    card: {
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
    cardTitle: {
        ...FONTS.h3,
        marginBottom: SIZES.padding,
        color: COLORS.primary,
    },
    detailRow: {
        flexDirection: 'row',
        marginBottom: SIZES.base,
    },
    detailLabel: {
        ...FONTS.body3,
        color: COLORS.gray,
        width: 120,
    },
    detailValue: {
        ...FONTS.body3,
        flex: 1,
    },
    queueInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: COLORS.lightGray + '50',
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
    },
    queueItem: {
        alignItems: 'center',
    },
    queueLabel: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginBottom: 2,
    },
    queueValue: {
        ...FONTS.h2,
        color: COLORS.primary,
    },
    cancelButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.error,
        paddingVertical: SIZES.padding,
        borderRadius: SIZES.radius,
        marginTop: SIZES.padding,
    },
    cancelButtonText: {
        ...FONTS.body3,
        color: COLORS.white,
        marginLeft: SIZES.base,
    },
    notFoundContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: SIZES.padding * 2,
    },
    notFoundText: {
        ...FONTS.body2,
        color: COLORS.gray,
        textAlign: 'center',
        marginTop: SIZES.padding,
    },
});

export default AppointmentDetailsScreen; 