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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { AuthStackParamList } from '../navigation';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type RegisterScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

const RegisterScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<RegisterScreenNavigationProp>();
    const { register, state } = useAuth();

    const [fullName, setFullName] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({
        fullName: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
    });
    const [secureTextEntry, setSecureTextEntry] = useState(true);
    const [secureConfirmTextEntry, setSecureConfirmTextEntry] = useState(true);

    const handlePhoneInput = (text: string) => {
        // Only allow numbers and plus sign
        const filtered = text.replace(/[^0-9+]/g, '');
        setPhoneNumber(filtered);

        // Clear error when user types
        if (errors.phoneNumber) {
            setErrors({ ...errors, phoneNumber: '' });
        }
    };

    // Format phone number for backend validation
    const formatPhoneNumberForBackend = (phoneNumber: string): string => {
        // Remove all non-digit characters except +
        let cleaned = phoneNumber.replace(/[^0-9+]/g, '');
        
        // If it starts with 0, replace with +255 (Tanzania country code)
        if (cleaned.startsWith('0')) {
            cleaned = '+255' + cleaned.substring(1);
        }
        // If it starts with 255 without +, add +
        else if (cleaned.startsWith('255') && !cleaned.startsWith('+')) {
            cleaned = '+' + cleaned;
        }
        // If it doesn't start with + and doesn't start with 0, add +255
        else if (!cleaned.startsWith('+') && !cleaned.startsWith('0')) {
            cleaned = '+255' + cleaned;
        }
        
        return cleaned;
    };

    const handleInputChange = (field: string, value: string) => {
        switch (field) {
            case 'fullName':
                setFullName(value);
                if (errors.fullName) setErrors({ ...errors, fullName: '' });
                break;
            case 'password':
                setPassword(value);
                if (errors.password) setErrors({ ...errors, password: '' });
                break;
            case 'confirmPassword':
                setConfirmPassword(value);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                break;
        }
    };

    const validateForm = () => {
        let valid = true;
        const newErrors = {
            fullName: '',
            phoneNumber: '',
            password: '',
            confirmPassword: '',
        };

        if (!fullName.trim()) {
            newErrors.fullName = t('fullNameRequired');
            valid = false;
        }

        if (!phoneNumber.trim()) {
            newErrors.phoneNumber = t('phoneNumberRequired');
            valid = false;
        }

        if (!password.trim()) {
            newErrors.password = t('passwordRequired');
            valid = false;
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = t('passwordsDoNotMatch');
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleRegister = async () => {
        if (validateForm()) {
            try {
                // Split fullName into first_name and last_name
                const nameParts = fullName.trim().split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
                
                // Format phone number for backend validation
                const formattedPhoneNumber = formatPhoneNumberForBackend(phoneNumber);
                
                await register(firstName, lastName, formattedPhoneNumber, password);
            } catch (error) {
                console.error('Registration error:', error);
            }
        }
    };

    const togglePasswordVisibility = () => {
        setSecureTextEntry(!secureTextEntry);
    };

    const toggleConfirmPasswordVisibility = () => {
        setSecureConfirmTextEntry(!secureConfirmTextEntry);
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
                    <View style={styles.logoContainer}>
                        <Ionicons name="medkit" size={60} color={COLORS.primary} />
                        <Text style={styles.appName}>Doctor Queue Compass</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.welcomeText}>{t('createAccount')}</Text>
                        <Text style={styles.subtitleText}>{t('Register to access our medical services')}</Text>

                        {/* Full Name Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('fullName')}
                                value={fullName}
                                onChangeText={(text) => handleInputChange('fullName', text)}
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {errors.fullName ? <Text style={styles.errorText}>{errors.fullName}</Text> : null}

                        {/* Phone Number Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('phoneNumber')}
                                value={phoneNumber}
                                onChangeText={handlePhoneInput}
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}

                        {/* Password Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('password')}
                                value={password}
                                onChangeText={(text) => handleInputChange('password', text)}
                                secureTextEntry={secureTextEntry}
                                placeholderTextColor={COLORS.gray}
                            />
                            <TouchableOpacity onPress={togglePasswordVisibility} style={styles.passwordToggle}>
                                <Ionicons
                                    name={secureTextEntry ? "eye-outline" : "eye-off-outline"}
                                    size={22}
                                    color={COLORS.gray}
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}

                        {/* Confirm Password Input */}
                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('confirmPassword')}
                                value={confirmPassword}
                                onChangeText={(text) => handleInputChange('confirmPassword', text)}
                                secureTextEntry={secureConfirmTextEntry}
                                placeholderTextColor={COLORS.gray}
                            />
                            <TouchableOpacity onPress={toggleConfirmPasswordVisibility} style={styles.passwordToggle}>
                                <Ionicons
                                    name={secureConfirmTextEntry ? "eye-outline" : "eye-off-outline"}
                                    size={22}
                                    color={COLORS.gray}
                                />
                            </TouchableOpacity>
                        </View>
                        {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}

                        <TouchableOpacity
                            style={[styles.registerButton, state.loading && styles.registerButtonDisabled]}
                            onPress={handleRegister}
                            disabled={state.loading}
                        >
                            {state.loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.registerButtonText}>{t('createAccount')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.loginContainer}>
                        <Text style={styles.haveAccountText}>{t('alreadyHaveAccount')}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginText}>{t('login')}</Text>
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
    keyboardAvoidingView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SIZES.padding * 1.5,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: SIZES.padding * 2,
    },
    appName: {
        ...FONTS.h2,
        color: COLORS.primary,
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
        marginBottom: SIZES.padding * 2,
    },
    welcomeText: {
        ...FONTS.h2,
        textAlign: 'center',
        color: COLORS.black,
        marginBottom: SIZES.base,
    },
    subtitleText: {
        ...FONTS.body4,
        textAlign: 'center',
        color: COLORS.gray,
        marginBottom: SIZES.padding * 1.5,
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
    passwordToggle: {
        paddingHorizontal: SIZES.padding,
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorText: {
        ...FONTS.body5,
        color: COLORS.error,
        marginBottom: SIZES.base,
        marginLeft: SIZES.base,
    },
    registerButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius / 1.5,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SIZES.padding,
    },
    registerButtonDisabled: {
        opacity: 0.7,
    },
    registerButtonText: {
        ...FONTS.h3,
        color: COLORS.white,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    haveAccountText: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginRight: SIZES.base,
    },
    loginText: {
        ...FONTS.h4,
        color: COLORS.primary,
    },
});

export default RegisterScreen;
