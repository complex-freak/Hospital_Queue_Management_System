import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { authService } from '../services';

type OnboardingScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const OnboardingScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<OnboardingScreenNavigationProp>();
    const { updateProfile, state } = useAuth();

    const [email, setEmail] = useState('');
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
    const [gender, setGender] = useState('');
    const [address, setAddress] = useState('');
    const [emergencyContact, setEmergencyContact] = useState('');
    const [emergencyContactName, setEmergencyContactName] = useState('');
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [errors, setErrors] = useState({
        email: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        emergencyContact: '',
        emergencyContactName: '',
        emergencyContactRelationship: '',
    });

    const handleInputChange = (field: string, value: string) => {
        switch (field) {
            case 'email':
                setEmail(value);
                if (errors.email) setErrors({ ...errors, email: '' });
                break;
            case 'gender':
                setGender(value);
                if (errors.gender) setErrors({ ...errors, gender: '' });
                break;
            case 'address':
                setAddress(value);
                if (errors.address) setErrors({ ...errors, address: '' });
                break;
            case 'emergencyContact':
                // Only allow numbers
                const filtered = value.replace(/[^0-9]/g, '');
                setEmergencyContact(filtered);
                if (errors.emergencyContact) setErrors({ ...errors, emergencyContact: '' });
                break;
            case 'emergencyContactName':
                setEmergencyContactName(value);
                if (errors.emergencyContactName) setErrors({ ...errors, emergencyContactName: '' });
                break;
            case 'emergencyContactRelationship':
                setEmergencyContactRelationship(value);
                if (errors.emergencyContactRelationship) setErrors({ ...errors, emergencyContactRelationship: '' });
                break;
        }
    };

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDateOfBirth(selectedDate);
            if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
        }
    };

    const showDatepicker = () => {
        setShowDatePicker(true);
    };

    const validateForm = () => {
        let valid = true;
        const newErrors = {
            email: '',
            dateOfBirth: '',
            gender: '',
            address: '',
            emergencyContact: '',
            emergencyContactName: '',
            emergencyContactRelationship: '',
        };

        // Simple email validation
        if (email && !/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = t('invalidEmail');
            valid = false;
        }

        if (!dateOfBirth) {
            newErrors.dateOfBirth = t('dateOfBirthRequired');
            valid = false;
        }

        if (!gender.trim()) {
            newErrors.gender = t('genderRequired');
            valid = false;
        } else if (!['male', 'female', 'other'].includes(gender.toLowerCase())) {
            newErrors.gender = t('invalidGender');
            valid = false;
        }

        if (!address.trim()) {
            newErrors.address = t('addressRequired');
            valid = false;
        }

        if (!emergencyContact.trim()) {
            newErrors.emergencyContact = t('emergencyContactRequired');
            valid = false;
        }

        if (!emergencyContactName.trim()) {
            newErrors.emergencyContactName = t('emergencyContactNameRequired');
            valid = false;
        }

        if (!emergencyContactRelationship.trim()) {
            newErrors.emergencyContactRelationship = t('relationshipRequired');
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleSubmit = async () => {
        if (validateForm()) {
            try {
                // Use authService directly to complete profile
                const response = await authService.completeProfile({
                    email,
                    date_of_birth: dateOfBirth ? dateOfBirth.toISOString() : null,  // Send as ISO string
                    gender: gender.toLowerCase(),
                    address,
                    emergency_contact: emergencyContact,
                    emergency_contact_name: emergencyContactName,
                    emergency_contact_relationship: emergencyContactRelationship,
                });

                if (response.isSuccess) {
                    // Get updated profile
                    const profileResponse = await authService.getProfile();
                    const userResponse = profileResponse.data;
                    
                    // Transform to frontend User model
                    const updatedUser = authService.transformUserResponse(userResponse);
                    
                    // Update user in context
                    await updateProfile({
                        email,
                        dateOfBirth: dateOfBirth?.toISOString(),
                        gender: gender.toLowerCase() as 'male' | 'female' | 'other',
                        address,
                        emergencyContact,
                        emergencyContactName,
                        emergencyContactRelationship,
                    });
                    
                    // Navigate to main app
                    navigation.navigate('MainTabs', { screen: 'Home' });
                } else {
                    Alert.alert(
                        t('Error'),
                        t('Failed to update profile. Please try again.'),
                        [{ text: t('OK') }]
                    );
                }
            } catch (error) {
                console.error('Onboarding error:', error);
                Alert.alert(
                    t('Error'),
                    t('Failed to update profile. Please try again.'),
                    [{ text: t('OK') }]
                );
            }
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={COLORS.background} barStyle="dark-content" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardAvoidingView}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerContainer}>
                        <Ionicons name="person-circle" size={60} color={COLORS.primary} />
                        <Text style={styles.headerTitle}>{t('Complete Your Profile')}</Text>
                        <Text style={styles.headerSubtitle}>
                            {t('Please provide the following information to complete your registration')}
                        </Text>
                    </View>

                    <View style={styles.formCard}>
                        {/* Email Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('email')}
                                value={email}
                                onChangeText={(text) => handleInputChange('email', text)}
                                keyboardType="email-address"
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}

                        {/* Date of Birth Input */}
                        <TouchableOpacity style={styles.inputContainer} onPress={showDatepicker}>
                            <Text style={[styles.input, !dateOfBirth && { color: COLORS.gray }]}>
                                {dateOfBirth ? dateOfBirth.toLocaleDateString() : t('dateOfBirth')}
                            </Text>
                        </TouchableOpacity>
                        {errors.dateOfBirth ? <Text style={styles.errorText}>{errors.dateOfBirth}</Text> : null}
                        
                        {showDatePicker && (
                            <DateTimePicker
                                value={dateOfBirth || new Date()}
                                mode="date"
                                display="default"
                                onChange={onDateChange}
                                maximumDate={new Date()}
                            />
                        )}

                        {/* Gender Input */}
                        <View style={styles.genderContainer}>
                            {['Male', 'Female', 'Other'].map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.genderOption,
                                        gender.toLowerCase() === item.toLowerCase() && styles.genderOptionSelected
                                    ]}
                                    onPress={() => handleInputChange('gender', item.toLowerCase())}
                                >
                                    <Text
                                        style={[
                                            styles.genderText,
                                            gender.toLowerCase() === item.toLowerCase() && styles.genderTextSelected
                                        ]}
                                    >
                                        {t(item)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {errors.gender ? <Text style={styles.errorText}>{errors.gender}</Text> : null}

                        {/* Address Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('address')}
                                value={address}
                                onChangeText={(text) => handleInputChange('address', text)}
                                multiline
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}

                        {/* Emergency Contact Section */}
                        <Text style={styles.sectionTitle}>{t('Emergency Contact Information')}</Text>

                        {/* Emergency Contact Phone */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('emergencyContactNumber')}
                                value={emergencyContact}
                                onChangeText={(text) => handleInputChange('emergencyContact', text)}
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {errors.emergencyContact ? <Text style={styles.errorText}>{errors.emergencyContact}</Text> : null}

                        {/* Emergency Contact Name */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('emergencyContactName')}
                                value={emergencyContactName}
                                onChangeText={(text) => handleInputChange('emergencyContactName', text)}
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {errors.emergencyContactName ? <Text style={styles.errorText}>{errors.emergencyContactName}</Text> : null}

                        {/* Emergency Contact Relationship */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('relationship')}
                                value={emergencyContactRelationship}
                                onChangeText={(text) => handleInputChange('emergencyContactRelationship', text)}
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {errors.emergencyContactRelationship ? <Text style={styles.errorText}>{errors.emergencyContactRelationship}</Text> : null}

                        <TouchableOpacity
                            style={[styles.submitButton, state.loading && styles.submitButtonDisabled]}
                            onPress={handleSubmit}
                            disabled={state.loading}
                        >
                            {state.loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.submitButtonText}>{t('Complete Registration')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    sectionTitle: {
        ...FONTS.h4,
        color: COLORS.primary,
        marginTop: SIZES.padding,
        marginBottom: SIZES.base,
    },
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        padding: SIZES.padding * 1.5,
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: SIZES.padding * 2,
        marginTop: SIZES.padding,
    },
    headerTitle: {
        ...FONTS.h2,
        color: COLORS.black,
        marginTop: SIZES.base,
        textAlign: 'center',
    },
    headerSubtitle: {
        ...FONTS.body4,
        color: COLORS.gray,
        textAlign: 'center',
        marginTop: SIZES.base,
    },
    formCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding * 1.5,
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 3,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4.65,
        elevation: 5,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SIZES.radius / 1.5,
        height: 55,
        marginBottom: SIZES.base,
        backgroundColor: COLORS.white,
    },
    input: {
        flex: 1,
        height: '100%',
        paddingHorizontal: SIZES.padding,
        ...FONTS.body3,
        color: COLORS.black,
    },
    errorText: {
        ...FONTS.body5,
        color: COLORS.error,
        marginBottom: SIZES.base,
        marginLeft: SIZES.base,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: SIZES.base,
    },
    genderOption: {
        flex: 1,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SIZES.radius / 1.5,
        marginHorizontal: 2,
    },
    genderOptionSelected: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    genderText: {
        ...FONTS.body4,
        color: COLORS.black,
    },
    genderTextSelected: {
        color: COLORS.white,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius / 1.5,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SIZES.padding,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitButtonText: {
        ...FONTS.h3,
        color: COLORS.white,
    },
});

export default OnboardingScreen; 