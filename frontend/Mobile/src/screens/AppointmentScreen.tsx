import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isBefore, startOfDay } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, SIZES } from '../constants/theme';
import { RootStackParamList } from '../navigation';
import { useQueue } from '../context/QueueContext';
import { useAuth } from '../context/AuthContext';
import { ConditionType } from '../types';

import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';

type AppointmentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AppointmentScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<AppointmentScreenNavigationProp>();
    const { createAppointment, state: queueState } = useQueue();
    const { state: authState } = useAuth();

    // Form state
    const [appointmentDate, setAppointmentDate] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [reasonForVisit, setReasonForVisit] = useState('');
    const [conditionExplanation, setConditionExplanation] = useState('');
    const [errors, setErrors] = useState({
        appointmentDate: '',
        reasonForVisit: '',
    });

    // Common reasons for visit
    const commonReasons = [
        { id: 'checkup', label: t('generalCheckup') },
        { id: 'followup', label: t('followUp') },
        { id: 'consultation', label: t('consultation') },
        { id: 'fever', label: t('fever') },
        { id: 'cold', label: t('cold') },
        { id: 'headache', label: t('headache') },
        { id: 'prescription', label: t('prescription') },
    ];

    // Handle date change
    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setAppointmentDate(selectedDate);
        }
    };

    // Handle quick reason selection
    const handleReasonSelect = (reason: string) => {
        setReasonForVisit(reason);
    };

    // Format date for display
    const formatDateString = (date: Date) => {
        return format(date, 'dd/MM/yyyy');
    };

    // Validate form
    const validateForm = () => {
        let valid = true;
        const newErrors = {
            appointmentDate: '',
            reasonForVisit: ''
        };

        // Check if appointment date is valid (same day or future)
        const today = startOfDay(new Date());
        if (isBefore(appointmentDate, today)) {
            newErrors.appointmentDate = t('appointmentDateMustBeFutureOrToday');
            valid = false;
        }

        // Check if reason for visit is provided
        if (!reasonForVisit.trim()) {
            newErrors.reasonForVisit = t('reasonForVisitRequired');
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    // Handle appointment submission
    const handleSubmit = async () => {
        if (validateForm()) {
            try {
                // Use normal priority for all patient-created appointments
                const conditionType: ConditionType = 'normal';
                
                // Only add to queue if appointment is for today
                const isToday = format(appointmentDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                const success = await createAppointment(
                    authState.user?.gender || 'other',
                    formatDateString(appointmentDate),
                    conditionType,
                    isToday
                );
                
                // Only show success message if appointment was actually created
                if (success) {
                    Alert.alert(
                        t('success'),
                        isToday 
                            ? t('appointmentSuccessToday') 
                            : t('appointmentSuccessFuture'),
                        [{ text: 'OK', onPress: () => navigation.navigate('Appointments') }]
                    );
                } else if (queueState.error) {
                    // Show error from queue context
                    Alert.alert(
                        t('error'),
                        queueState.error || t('appointmentFailed')
                    );
                }
            } catch (error: any) {
                // Fallback error handling
                Alert.alert(
                    t('error'),
                    error?.message || t('appointmentFailed')
                );
            }
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerContent}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('appointmentReg')}</Text>
                    <View style={{ width: 24 }} />
                </View>
            </View>

            <KeyboardAvoidingView
                style={styles.keyboardAvoidingContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.infoCard}>
                        <View style={styles.infoIcon}>
                            <Ionicons name="information-circle" size={24} color={COLORS.primary} />
                        </View>
                        <Text style={styles.infoText}>
                            {t('registerAppointmentInfo')}
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
                        {queueState.error && (
                            <View style={styles.errorCard}>
                                <Ionicons name="warning" size={20} color={COLORS.error} />
                                <Text style={styles.errorText}>{queueState.error}</Text>
                            </View>
                        )}

                        {/* Patient Information Section */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="person" size={20} color={COLORS.primary} />
                                <Text style={styles.sectionTitle}>{t('patientInformation')}</Text>
                            </View>

                            {/* Patient Name */}
                            <AppInput
                                label={t('fullName')}
                                value={authState.user?.fullName || ''}
                                onChangeText={() => { }}
                                editable={false}
                                containerStyle={styles.inputContainer}
                            />

                            {/* Patient Phone Number */}
                            <AppInput
                                label={t('phoneNumber')}
                                value={authState.user?.phoneNumber || ''}
                                onChangeText={() => { }}
                                keyboardType="phone-pad"
                                editable={false}
                                containerStyle={styles.inputContainer}
                            />
                        </View>

                        {/* Appointment Details Section */}
                        <View style={styles.sectionContainer}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="calendar" size={20} color={COLORS.primary} />
                                <Text style={styles.sectionTitle}>{t('appointmentDetails')}</Text>
                            </View>

                            {/* Appointment Date Picker */}
                            <View style={styles.datePickerContainer}>
                                <Text style={styles.label}>{t('appointmentDate')}</Text>
                                <TouchableOpacity
                                    style={[styles.datePickerButton, errors.appointmentDate ? styles.inputError : null]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.datePickerText}>
                                        {formatDateString(appointmentDate)}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                                </TouchableOpacity>
                                {errors.appointmentDate ? (
                                    <Text style={styles.fieldErrorText}>{errors.appointmentDate}</Text>
                                ) : null}
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={appointmentDate}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                    maximumDate={new Date(Date.now() + 1000 * 60 * 60 * 24 * 60)} // 60 days ahead
                                />
                            )}

                            {/* Common Reasons Selection */}
                            <View style={styles.reasonsContainer}>
                                <Text style={styles.label}>{t('commonReasons')}</Text>
                                <View style={styles.reasonsGrid}>
                                    {commonReasons.map((reason) => (
                                        <TouchableOpacity
                                            key={reason.id}
                                            style={[
                                                styles.reasonButton,
                                                reasonForVisit === reason.label && styles.selectedReasonButton
                                            ]}
                                            onPress={() => handleReasonSelect(reason.label)}
                                        >
                                            <Text 
                                                style={[
                                                    styles.reasonButtonText,
                                                    reasonForVisit === reason.label && styles.selectedReasonButtonText
                                                ]}
                                            >
                                                {reason.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Reason for Visit */}
                            <AppInput
                                label={t('reasonForVisit')}
                                value={reasonForVisit}
                                onChangeText={(text) => setReasonForVisit(text)}
                                placeholder={t('reasonForVisitPlaceholder')}
                                error={errors.reasonForVisit}
                                containerStyle={styles.inputContainer}
                                multiline={true}
                                numberOfLines={3}
                                inputStyle={styles.multilineInput}
                            />

                            {/* Additional Information */}
                            <AppInput
                                label={t('additionalInformation')}
                                value={conditionExplanation}
                                onChangeText={(text) => setConditionExplanation(text)}
                                placeholder={t('additionalInformationPlaceholder')}
                                containerStyle={styles.inputContainer}
                                multiline={true}
                                numberOfLines={4}
                                inputStyle={styles.multilineInput}
                            />
                        </View>

                        {/* Info about appointment scheduling */}
                        <View style={styles.priorityInfo}>
                            <Text style={styles.priorityTitle}>{t('appointmentInfo')}</Text>
                            <Text style={styles.priorityText}>
                                {t('futureAppointmentExplanation')}
                            </Text>
                        </View>

                        {/* Submit Button */}
                        <AppButton
                            title={t('confirm')}
                            onPress={handleSubmit}
                            loading={queueState.loading}
                            containerStyle={styles.submitButton}
                        />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingTop: SIZES.padding * 1.5 + SIZES.topSpacing,
        paddingBottom: SIZES.padding,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SIZES.padding,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        ...FONTS.h3,
        color: COLORS.white,
    },
    keyboardAvoidingContainer: {
        flex: 1,
    },
    scrollContainer: {
        padding: SIZES.padding,
    },
    infoCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary + '15',
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        alignItems: 'center',
    },
    infoIcon: {
        marginRight: SIZES.base,
    },
    infoText: {
        ...FONTS.body4,
        color: COLORS.primary,
        flex: 1,
    },
    formContainer: {
        width: '100%',
    },
    errorCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.error + '15',
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        alignItems: 'center',
    },
    errorText: {
        ...FONTS.body4,
        color: COLORS.error,
        marginLeft: SIZES.base,
        flex: 1,
    },
    sectionContainer: {
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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SIZES.padding,
    },
    sectionTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginLeft: SIZES.base,
    },
    inputContainer: {
        marginBottom: SIZES.base,
    },
    datePickerContainer: {
        marginBottom: SIZES.margin,
        width: '100%',
    },
    label: {
        ...FONTS.h4,
        color: COLORS.black,
        marginBottom: 8,
    },
    datePickerButton: {
        height: 50,
        borderWidth: 1,
        borderColor: COLORS.lightGray,
        borderRadius: SIZES.radius,
        paddingHorizontal: SIZES.padding,
        justifyContent: 'space-between',
        alignItems: 'center',
        flexDirection: 'row',
    },
    datePickerText: {
        ...FONTS.body3,
        color: COLORS.black,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    fieldErrorText: {
        color: COLORS.error,
        ...FONTS.body5,
        marginTop: 4,
    },
    reasonsContainer: {
        marginBottom: SIZES.base,
    },
    reasonsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginHorizontal: -SIZES.base / 2,
    },
    reasonButton: {
        backgroundColor: COLORS.lightGray + '50',
        borderRadius: SIZES.radius,
        paddingVertical: SIZES.base,
        paddingHorizontal: SIZES.padding,
        margin: SIZES.base / 2,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedReasonButton: {
        backgroundColor: COLORS.primary + '20',
        borderColor: COLORS.primary,
    },
    reasonButtonText: {
        ...FONTS.body4,
        color: COLORS.gray,
    },
    selectedReasonButtonText: {
        color: COLORS.primary,
        fontWeight: '500',
    },
    priorityInfo: {
        backgroundColor: COLORS.info + '15',
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding * 1.5,
    },
    priorityTitle: {
        ...FONTS.h4,
        color: COLORS.info,
        marginBottom: SIZES.base,
    },
    priorityText: {
        ...FONTS.body5,
        color: COLORS.black,
    },
    submitButton: {
        marginBottom: SIZES.padding * 2,
    },
    multilineInput: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: SIZES.padding,
    },
});

export default AppointmentScreen; 