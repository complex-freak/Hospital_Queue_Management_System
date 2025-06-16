import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

const ProfileScreen = () => {
    const { t } = useTranslation();
    const { updateProfile, state: authState } = useAuth();
    const user = authState.user;

    const [isEditing, setIsEditing] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Form fields
    const [fullName, setFullName] = useState(user?.fullName || '');
    const [firstName, setFirstName] = useState(user?.firstName || '');
    const [lastName, setLastName] = useState(user?.lastName || '');
    const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
    const [email, setEmail] = useState(user?.email || '');
    const [dateOfBirth, setDateOfBirth] = useState<Date | null>(
        user?.dateOfBirth ? new Date(user.dateOfBirth) : null
    );
    const [gender, setGender] = useState(user?.gender || '');
    const [address, setAddress] = useState(user?.address || '');
    const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact || '');
    const [emergencyContactName, setEmergencyContactName] = useState(user?.emergencyContactName || '');
    const [emergencyContactRelationship, setEmergencyContactRelationship] = useState(user?.emergencyContactRelationship || '');

    // Form validation errors
    const [errors, setErrors] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        email: '',
        dateOfBirth: '',
        gender: '',
        address: '',
        emergencyContact: '',
        emergencyContactName: '',
        emergencyContactRelationship: '',
    });

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            setDateOfBirth(selectedDate);
            if (errors.dateOfBirth) setErrors({ ...errors, dateOfBirth: '' });
        }
    };

    const validateForm = () => {
        let valid = true;
        const newErrors = {
            firstName: '',
            lastName: '',
            phoneNumber: '',
            email: '',
            dateOfBirth: '',
            gender: '',
            address: '',
            emergencyContact: '',
            emergencyContactName: '',
            emergencyContactRelationship: '',
        };

        if (!firstName.trim()) {
            newErrors.firstName = t('firstNameRequired');
            valid = false;
        }

        if (!lastName.trim()) {
            newErrors.lastName = t('lastNameRequired');
            valid = false;
        }

        if (!phoneNumber.trim()) {
            newErrors.phoneNumber = t('phoneNumberRequired');
            valid = false;
        }

        if (email && !/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = t('invalidEmail');
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

    const handleSave = async () => {
        if (validateForm()) {
            setIsLoading(true);
            try {
                await updateProfile({
                    fullName: `${firstName} ${lastName}`,
                    phoneNumber,
                    email,
                    dateOfBirth: dateOfBirth?.toISOString(),
                    gender: gender.toLowerCase() as 'male' | 'female' | 'other',
                    address,
                    emergencyContact,
                    emergencyContactName,
                    emergencyContactRelationship,
                });
                
                setIsEditing(false);
                Alert.alert(
                    t('success'),
                    t('profileUpdateSuccess'),
                    [{ text: 'OK' }]
                );
            } catch (error) {
                Alert.alert(
                    t('error'),
                    error instanceof Error ? error.message : 'Profile update failed'
                );
            } finally {
                setIsLoading(false);
            }
        }
    };

    const renderProfileInfo = () => {
        if (!user) return null;

        if (isEditing) {
            return (
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <ScrollView style={styles.formContainer}>
                        {/* Personal Information Section */}
                        <Text style={styles.sectionTitle}>{t('personalInformation')}</Text>
                        
                        {/* First Name */}
                        <Text style={styles.inputLabel}>{t('firstName')}</Text>
                        <TextInput
                            style={[styles.input, errors.firstName ? styles.inputError : null]}
                            value={firstName}
                            onChangeText={(text) => {
                                setFirstName(text);
                                if (errors.firstName) setErrors({ ...errors, firstName: '' });
                            }}
                            placeholder={t('firstName')}
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.firstName ? <Text style={styles.errorText}>{errors.firstName}</Text> : null}
                        
                        {/* Last Name */}
                        <Text style={styles.inputLabel}>{t('lastName')}</Text>
                        <TextInput
                            style={[styles.input, errors.lastName ? styles.inputError : null]}
                            value={lastName}
                            onChangeText={(text) => {
                                setLastName(text);
                                if (errors.lastName) setErrors({ ...errors, lastName: '' });
                            }}
                            placeholder={t('lastName')}
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.lastName ? <Text style={styles.errorText}>{errors.lastName}</Text> : null}
                        
                        {/* Phone Number */}
                        <Text style={styles.inputLabel}>{t('phoneNumber')}</Text>
                        <TextInput
                            style={[styles.input, errors.phoneNumber ? styles.inputError : null]}
                            value={phoneNumber}
                            onChangeText={(text) => {
                                setPhoneNumber(text);
                                if (errors.phoneNumber) setErrors({ ...errors, phoneNumber: '' });
                            }}
                            placeholder={t('phoneNumber')}
                            keyboardType="phone-pad"
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}
                        
                        {/* Email */}
                        <Text style={styles.inputLabel}>{t('email')}</Text>
                        <TextInput
                            style={[styles.input, errors.email ? styles.inputError : null]}
                            value={email}
                            onChangeText={(text) => {
                                setEmail(text);
                                if (errors.email) setErrors({ ...errors, email: '' });
                            }}
                            placeholder={t('email')}
                            keyboardType="email-address"
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                        
                        {/* Date of Birth */}
                        <Text style={styles.inputLabel}>{t('dateOfBirth')}</Text>
                        <TouchableOpacity 
                            style={[styles.input, errors.dateOfBirth ? styles.inputError : null]} 
                            onPress={() => setShowDatePicker(true)}
                        >
                            <Text style={dateOfBirth ? styles.inputText : styles.placeholderText}>
                                {dateOfBirth ? dateOfBirth.toLocaleDateString() : t('selectDateOfBirth')}
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
                        
                        {/* Gender */}
                        <Text style={styles.inputLabel}>{t('gender')}</Text>
                        <View style={styles.genderContainer}>
                            {['Male', 'Female', 'Other'].map((item) => (
                                <TouchableOpacity
                                    key={item}
                                    style={[
                                        styles.genderOption,
                                        gender.toLowerCase() === item.toLowerCase() && styles.genderOptionSelected
                                    ]}
                                    onPress={() => {
                                        setGender(item.toLowerCase());
                                        if (errors.gender) setErrors({ ...errors, gender: '' });
                                    }}
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
                        
                        {/* Address */}
                        <Text style={styles.inputLabel}>{t('address')}</Text>
                        <TextInput
                            style={[styles.input, styles.multilineInput, errors.address ? styles.inputError : null]}
                            value={address}
                            onChangeText={(text) => {
                                setAddress(text);
                                if (errors.address) setErrors({ ...errors, address: '' });
                            }}
                            placeholder={t('address')}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.address ? <Text style={styles.errorText}>{errors.address}</Text> : null}
                        
                        {/* Emergency Contact Section */}
                        <Text style={styles.sectionTitle}>{t('emergencyContact')}</Text>
                        
                        {/* Emergency Contact Name */}
                        <Text style={styles.inputLabel}>{t('emergencyContactName')}</Text>
                        <TextInput
                            style={[styles.input, errors.emergencyContactName ? styles.inputError : null]}
                            value={emergencyContactName}
                            onChangeText={(text) => {
                                setEmergencyContactName(text);
                                if (errors.emergencyContactName) setErrors({ ...errors, emergencyContactName: '' });
                            }}
                            placeholder={t('emergencyContactName')}
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.emergencyContactName ? <Text style={styles.errorText}>{errors.emergencyContactName}</Text> : null}
                        
                        {/* Emergency Contact Number */}
                        <Text style={styles.inputLabel}>{t('emergencyContactNumber')}</Text>
                        <TextInput
                            style={[styles.input, errors.emergencyContact ? styles.inputError : null]}
                            value={emergencyContact}
                            onChangeText={(text) => {
                                setEmergencyContact(text);
                                if (errors.emergencyContact) setErrors({ ...errors, emergencyContact: '' });
                            }}
                            placeholder={t('emergencyContactNumber')}
                            keyboardType="phone-pad"
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.emergencyContact ? <Text style={styles.errorText}>{errors.emergencyContact}</Text> : null}
                        
                        {/* Relationship */}
                        <Text style={styles.inputLabel}>{t('relationship')}</Text>
                        <TextInput
                            style={[styles.input, errors.emergencyContactRelationship ? styles.inputError : null]}
                            value={emergencyContactRelationship}
                            onChangeText={(text) => {
                                setEmergencyContactRelationship(text);
                                if (errors.emergencyContactRelationship) setErrors({ ...errors, emergencyContactRelationship: '' });
                            }}
                            placeholder={t('relationship')}
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.emergencyContactRelationship ? <Text style={styles.errorText}>{errors.emergencyContactRelationship}</Text> : null}
                        
                        {/* Action Buttons */}
                        <View style={styles.buttonContainer}>
                            <TouchableOpacity 
                                style={[styles.button, styles.cancelButton]} 
                                onPress={() => setIsEditing(false)}
                                disabled={isLoading}
                            >
                                <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.button, styles.saveButton]} 
                                onPress={handleSave}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator color={COLORS.white} />
                                ) : (
                                    <Text style={styles.saveButtonText}>{t('save')}</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            );
        }
        
        return (
            <ScrollView style={styles.container}>
                <View style={styles.profileHeader}>
                    <View style={styles.avatarContainer}>
                        <Ionicons name="person" size={60} color={COLORS.white} />
                    </View>
                    <Text style={styles.profileName}>{user.fullName}</Text>
                </View>
                
                {/* Personal Information Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.sectionTitle}>{t('personalInformation')}</Text>
                    
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>{t('phoneNumber')}:</Text>
                        <Text style={styles.infoValue}>{user.phoneNumber}</Text>
                    </View>
                    
                    {user.email && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('email')}:</Text>
                            <Text style={styles.infoValue}>{user.email}</Text>
                        </View>
                    )}
                    
                    {user.dateOfBirth && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('dateOfBirth')}:</Text>
                            <Text style={styles.infoValue}>
                                {new Date(user.dateOfBirth).toLocaleDateString()}
                            </Text>
                        </View>
                    )}
                    
                    {user.gender && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('gender')}:</Text>
                            <Text style={styles.infoValue}>{user.gender}</Text>
                        </View>
                    )}
                    
                    {user.address && (
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('address')}:</Text>
                            <Text style={styles.infoValue}>{user.address}</Text>
                        </View>
                    )}
                </View>
                
                {/* Emergency Contact Section */}
                {user.emergencyContact && (
                    <View style={styles.infoSection}>
                        <Text style={styles.sectionTitle}>{t('emergencyContact')}</Text>
                        
                        {user.emergencyContactName && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t('name')}:</Text>
                                <Text style={styles.infoValue}>{user.emergencyContactName}</Text>
                            </View>
                        )}
                        
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>{t('phoneNumber')}:</Text>
                            <Text style={styles.infoValue}>{user.emergencyContact}</Text>
                        </View>
                        
                        {user.emergencyContactRelationship && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>{t('relationship')}:</Text>
                                <Text style={styles.infoValue}>{user.emergencyContactRelationship}</Text>
                            </View>
                        )}
                    </View>
                )}
                
                {/* Edit Button */}
                <TouchableOpacity 
                    style={styles.editButton} 
                    onPress={() => setIsEditing(true)}
                >
                    <Ionicons name="create-outline" size={20} color={COLORS.white} />
                    <Text style={styles.editButtonText}>{t('editProfile')}</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            {renderProfileInfo()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    profileHeader: {
        backgroundColor: COLORS.primary,
        padding: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
    },
    avatarContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10,
    },
    profileName: {
        ...FONTS.h2,
        color: COLORS.white,
        marginBottom: 5,
    },
    infoSection: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 15,
        margin: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.primary,
        marginBottom: 15,
    },
    infoRow: {
        flexDirection: 'row',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    infoLabel: {
        ...FONTS.body4,
        fontWeight: 'bold',
        color: COLORS.gray,
        width: '30%',
    },
    infoValue: {
        ...FONTS.body4,
        color: COLORS.black,
        width: '70%',
    },
    editButton: {
        flexDirection: 'row',
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
        justifyContent: 'center',
        margin: 15,
    },
    editButtonText: {
        ...FONTS.h4,
        color: COLORS.white,
        marginLeft: 8,
    },
    formContainer: {
        flex: 1,
        padding: 15,
    },
    inputLabel: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        ...FONTS.body3,
        color: COLORS.black,
    },
    inputText: {
        color: COLORS.black,
    },
    placeholderText: {
        color: COLORS.gray,
    },
    multilineInput: {
        minHeight: 80,
        textAlignVertical: 'top',
    },
    inputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        ...FONTS.body5,
        color: COLORS.error,
        marginTop: 5,
    },
    genderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 10,
    },
    genderOption: {
        flex: 1,
        height: 45,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
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
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 20,
        marginBottom: 30,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        backgroundColor: COLORS.primary,
        marginLeft: 10,
    },
    saveButtonText: {
        ...FONTS.h4,
        color: COLORS.white,
    },
    cancelButton: {
        backgroundColor: COLORS.lightGray,
        marginRight: 10,
    },
    cancelButtonText: {
        ...FONTS.h4,
        color: COLORS.black,
    },
});

export default ProfileScreen; 