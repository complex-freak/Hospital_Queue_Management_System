import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    SafeAreaView,
    StatusBar,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { AuthStackParamList } from '../navigation';
import { Ionicons } from '@expo/vector-icons';

type ForgotPasswordScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC = () => {
    const { t } = useTranslation();
    const navigation = useNavigation<ForgotPasswordScreenNavigationProp>();
    const [phoneNumber, setPhoneNumber] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const validateForm = () => {
        if (!phoneNumber.trim()) {
            setError(t('phoneNumberRequired'));
            return false;
        }
        return true;
    };

    const handleResetPassword = () => {
        if (validateForm()) {
            setLoading(true);

            // Simulate API call with timeout
            setTimeout(() => {
                setLoading(false);
                Alert.alert(
                    t('success'),
                    t('passwordResetSent'),
                    [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
                );
            }, 1500);
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
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.navigate('Login')}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>

                    <View style={styles.logoContainer}>
                        <Ionicons name="lock-open-outline" size={60} color={COLORS.primary} />
                        <Text style={styles.appName}>{t('resetPassword')}</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.welcomeText}>{t('forgotYourPassword')}</Text>
                        <Text style={styles.subtitleText}>{t('resetPasswordSubtitle')}</Text>

                        <View style={styles.inputContainer}>
                            <TextInput
                                style={styles.input}
                                placeholder={t('phoneNumber')}
                                value={phoneNumber}
                                onChangeText={(text) => {
                                    setPhoneNumber(text);
                                    if (error) setError('');
                                }}
                                keyboardType="phone-pad"
                                placeholderTextColor={COLORS.gray}
                            />
                        </View>
                        {error ? <Text style={styles.errorText}>{error}</Text> : null}

                        <TouchableOpacity
                            style={[styles.resetButton, loading && styles.resetButtonDisabled]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.resetButtonText}>{t('resetPassword')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.loginContainer}>
                        <Text style={styles.rememberPasswordText}>{t('rememberPassword')}</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.loginText}>{t('backToLogin')}</Text>
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
    backButton: {
        position: 'absolute',
        top: SIZES.padding,
        left: SIZES.padding,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
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
    errorText: {
        ...FONTS.body5,
        color: COLORS.error,
        marginBottom: SIZES.base,
        marginLeft: SIZES.base,
    },
    resetButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius / 1.5,
        height: 55,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SIZES.padding,
    },
    resetButtonDisabled: {
        opacity: 0.7,
    },
    resetButtonText: {
        ...FONTS.h3,
        color: COLORS.white,
    },
    loginContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    rememberPasswordText: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginRight: SIZES.base,
    },
    loginText: {
        ...FONTS.h4,
        color: COLORS.primary,
    },
});

export default ForgotPasswordScreen; 