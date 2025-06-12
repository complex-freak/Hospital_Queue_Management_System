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
import { format } from 'date-fns';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, SIZES } from '../constants/theme';
import { RootStackParamList } from '../navigation';
import { useQueue } from '../context/QueueContext';
import { useAuth } from '../context/AuthContext';
import { ConditionType, Gender } from '../types';

import AppInput from '../components/AppInput';
import AppButton from '../components/AppButton';
import AppDropdown from '../components/AppDropdown';

type AppointmentScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const AppointmentScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<AppointmentScreenNavigationProp>();
    const { createAppointment, state: queueState } = useQueue();
    const { state: authState } = useAuth();

    // Form state
    const [gender, setGender] = useState<Gender>('male');
    const [dateOfBirth, setDateOfBirth] = useState<Date>(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [conditionType, setConditionType] = useState<ConditionType>('normal');
    const [reasonForVisit, setReasonForVisit] = useState('');
    const [conditionExplanation, setConditionExplanation] = useState('');
    const [errors, setErrors] = useState({
        gender: '',
        dateOfBirth: '',
        conditionType: '',
        reasonForVisit: '',
    });

    // Gender options
    const genderOptions = [
        { label: t('male'), value: 'male' },
        { label: t('female'), value: 'female' },
    ];

    // Condition type options
    const conditionOptions = [
        { label: t('emergency'), value: 'emergency' },
        { label: t('elderly'), value: 'elderly' },
        { label: t('child'), value: 'child' },
        { label: t('normal'), value: 'normal' },
    ];

    // Handle date change
    const handleDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDateOfBirth(selectedDate);
        }
    };

    // Format date for display
    const formatDateString = (date: Date) => {
        return format(date, 'dd/MM/yyyy');
    };

    // Validate form
    const validateForm = () => {
        let valid = true;
        const newErrors = {
            gender: '',
            dateOfBirth: '',
            conditionType: '',
            reasonForVisit: ''
        };

        // Check if date of birth is valid
        const today = new Date();
        if (dateOfBirth > today) {
            newErrors.dateOfBirth = 'Tarehe ya kuzaliwa haiwezi kuwa baadaye';
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
                const appointmentData = {
                    patientName: authState.user?.fullName || '',
                    phoneNumber: authState.user?.phoneNumber || '',
                    gender,
                    dateOfBirth: formatDateString(dateOfBirth),
                    conditionType,
                    reasonForVisit,
                    conditionExplanation,
                };

                await createAppointment(
                    gender,
                    formatDateString(dateOfBirth),
                    conditionType
                );
                Alert.alert(
                    t('success'),
                    t('appointmentSuccess'),
                    [{ text: 'OK', onPress: () => navigation.goBack() }]
                );
            } catch (error) {
                Alert.alert(
                    t('error'),
                    t('appointmentFailed')
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

                            {/* Gender Dropdown */}
                            <AppDropdown
                                label={t('gender')}
                                options={genderOptions}
                                selectedValue={gender}
                                onValueChange={(value) => setGender(value as Gender)}
                                error={errors.gender}
                            />

                            {/* Date of Birth Picker */}
                            <View style={styles.datePickerContainer}>
                                <Text style={styles.label}>{t('dateOfBirth')}</Text>
                                <TouchableOpacity
                                    style={[styles.datePickerButton, errors.dateOfBirth ? styles.inputError : null]}
                                    onPress={() => setShowDatePicker(true)}
                                >
                                    <Text style={styles.datePickerText}>
                                        {formatDateString(dateOfBirth)}
                                    </Text>
                                    <Ionicons name="calendar-outline" size={20} color={COLORS.gray} />
                                </TouchableOpacity>
                                {errors.dateOfBirth ? (
                                    <Text style={styles.fieldErrorText}>{errors.dateOfBirth}</Text>
                                ) : null}
                            </View>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={dateOfBirth}
                                    mode="date"
                                    display="default"
                                    onChange={handleDateChange}
                                    minimumDate={new Date()}
                                    maximumDate={new Date(Date.now() + 1000 * 60 * 60 * 24 * 365)}
                                />
                            )}

                            {/* Condition Type Dropdown */}
                            <AppDropdown
                                label={t('conditionType')}
                                options={conditionOptions}
                                selectedValue={conditionType}
                                onValueChange={(value) => setConditionType(value as ConditionType)}
                                error={errors.conditionType}
                            />

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

                            {/* Condition Explanation */}
                            <AppInput
                                label={t('additionalInformation')}
                                value={conditionExplanation}
                                onChangeText={(text) => setConditionExplanation(text)}
                                placeholder={t('conditionExplanationPlaceholder')}
                                containerStyle={styles.inputContainer}
                                multiline={true}
                                numberOfLines={4}
                                inputStyle={styles.multilineInput}
                            />
                        </View>

                        {/* Priority Information */}
                        <View style={styles.priorityInfo}>
                            <Text style={styles.priorityTitle}>{t('priorityInformation')}</Text>
                            <Text style={styles.priorityText}>
                                {t('priorityExplanation')}
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
    priorityInfo: {
        backgroundColor: COLORS.warning + '15',
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding * 1.5,
    },
    priorityTitle: {
        ...FONTS.h4,
        color: COLORS.warning,
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