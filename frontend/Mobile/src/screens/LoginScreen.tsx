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
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { AuthStackParamList } from '../navigation';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const LoginScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<LoginScreenNavigationProp>();
    const { login, state: authState } = useAuth();

    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [errors, setErrors] = useState({
        phoneNumber: '',
        password: '',
    });
    const [secureTextEntry, setSecureTextEntry] = useState(true);

    const handleInputChange = (field: 'phoneNumber' | 'password', value: string) => {
        if (field === 'phoneNumber') {
            setPhoneNumber(value);
        } else {
            setPassword(value);
        }

        // Clear error when user types
        if (errors[field]) {
            setErrors({ ...errors, [field]: '' });
        }
    };

    const validateForm = () => {
        let valid = true;
        const newErrors = { phoneNumber: '', password: '' };

        if (!phoneNumber.trim()) {
            newErrors.phoneNumber = t('phoneNumberRequired');
            valid = false;
        }

        if (!password.trim()) {
            newErrors.password = t('passwordRequired');
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleLogin = async () => {
        if (validateForm()) {
            try {
                await login(phoneNumber, password);
            } catch (error) {
                console.error('Login error:', error);
            }
        }
    };

    const togglePasswordVisibility = () => {
        setSecureTextEntry(!secureTextEntry);
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
                        <Text style={styles.welcomeText}>{t('welcome')}</Text>
                        <Text style={styles.subtitleText}>{t('loginSubtitle')}</Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('phoneNumber')}
                                value={phoneNumber}
                                onChangeText={(text) => handleInputChange('phoneNumber', text)}
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {errors.phoneNumber ? <Text style={styles.errorText}>{errors.phoneNumber}</Text> : null}

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

                        <TouchableOpacity
                            style={styles.forgotPasswordLink}
                            onPress={() => navigation.navigate('ForgotPassword')}
                        >
                            <Text style={styles.forgotPasswordText}>{t('forgotPassword')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.loginButton, authState.loading && styles.loginButtonDisabled]}
                            onPress={handleLogin}
                            disabled={authState.loading}
                        >
                            {authState.loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.loginButtonText}>{t('login')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.registerContainer}>
                        <Text style={styles.noAccountText}>{t('dontHaveAccount')}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                            <Text style={styles.registerText}>{t('createAccount')}</Text>
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
    forgotPasswordLink: {
        alignSelf: 'flex-end',
        marginBottom: SIZES.padding,
    },
    forgotPasswordText: {
        ...FONTS.body4,
        color: COLORS.primary,
    },
    loginButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius / 1.5,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
        ...FONTS.h3,
        color: COLORS.white,
    },
    registerContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    noAccountText: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginRight: SIZES.base,
    },
    registerText: {
        ...FONTS.h4,
        color: COLORS.primary,
    },
});

export default LoginScreen; 