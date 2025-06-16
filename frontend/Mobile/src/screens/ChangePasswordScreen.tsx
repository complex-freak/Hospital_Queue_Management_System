import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { authService } from '../services';

const ChangePasswordScreen = () => {
    const { t } = useTranslation();
    const { state } = useAuth();
    
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });

    const validateForm = () => {
        let valid = true;
        const newErrors = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
        };

        if (!currentPassword.trim()) {
            newErrors.currentPassword = t('currentPasswordRequired');
            valid = false;
        }

        if (!newPassword.trim()) {
            newErrors.newPassword = t('newPasswordRequired');
            valid = false;
        } else if (newPassword.length < 8) {
            newErrors.newPassword = t('passwordTooShort');
            valid = false;
        } else if (!/[A-Z]/.test(newPassword)) {
            newErrors.newPassword = t('passwordNeedsUppercase');
            valid = false;
        } else if (!/[a-z]/.test(newPassword)) {
            newErrors.newPassword = t('passwordNeedsLowercase');
            valid = false;
        } else if (!/[0-9]/.test(newPassword)) {
            newErrors.newPassword = t('passwordNeedsNumber');
            valid = false;
        }

        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = t('passwordsDoNotMatch');
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleChangePassword = async () => {
        if (validateForm()) {
            setIsLoading(true);
            try {
                const response = await authService.changePassword({
                    current_password: currentPassword,
                    new_password: newPassword,
                });
                
                if (response.isSuccess) {
                    Alert.alert(
                        t('success'),
                        t('passwordChangeSuccess'),
                        [{ text: 'OK' }]
                    );
                    // Clear form
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                } else {
                    Alert.alert(
                        t('error'),
                        response.message || t('passwordChangeFailed')
                    );
                }
            } catch (error) {
                Alert.alert(
                    t('error'),
                    error instanceof Error ? error.message : t('passwordChangeFailed')
                );
            } finally {
                setIsLoading(false);
            }
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                <View style={styles.formContainer}>
                    <Text style={styles.description}>
                        {t('changePasswordDescription')}
                    </Text>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('currentPassword')}</Text>
                        <TextInput
                            style={[styles.input, errors.currentPassword ? styles.inputError : null]}
                            value={currentPassword}
                            onChangeText={(text) => {
                                setCurrentPassword(text);
                                if (errors.currentPassword) setErrors({ ...errors, currentPassword: '' });
                            }}
                            secureTextEntry
                            placeholder={t('enterCurrentPassword')}
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.currentPassword ? <Text style={styles.errorText}>{errors.currentPassword}</Text> : null}
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('newPassword')}</Text>
                        <TextInput
                            style={[styles.input, errors.newPassword ? styles.inputError : null]}
                            value={newPassword}
                            onChangeText={(text) => {
                                setNewPassword(text);
                                if (errors.newPassword) setErrors({ ...errors, newPassword: '' });
                            }}
                            secureTextEntry
                            placeholder={t('enterNewPassword')}
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.newPassword ? <Text style={styles.errorText}>{errors.newPassword}</Text> : null}
                    </View>
                    
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t('confirmPassword')}</Text>
                        <TextInput
                            style={[styles.input, errors.confirmPassword ? styles.inputError : null]}
                            value={confirmPassword}
                            onChangeText={(text) => {
                                setConfirmPassword(text);
                                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: '' });
                            }}
                            secureTextEntry
                            placeholder={t('reenterNewPassword')}
                            placeholderTextColor={COLORS.gray}
                        />
                        {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
                    </View>
                    
                    <View style={styles.passwordRequirements}>
                        <Text style={styles.requirementsTitle}>{t('passwordRequirements')}</Text>
                        <Text style={styles.requirementItem}>• {t('passwordReqLength')}</Text>
                        <Text style={styles.requirementItem}>• {t('passwordReqUppercase')}</Text>
                        <Text style={styles.requirementItem}>• {t('passwordReqLowercase')}</Text>
                        <Text style={styles.requirementItem}>• {t('passwordReqNumber')}</Text>
                    </View>
                    
                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleChangePassword}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.submitButtonText}>{t('changePassword')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </ScrollView>
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
    },
    formContainer: {
        padding: 20,
    },
    description: {
        ...FONTS.body3,
        color: COLORS.gray,
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        ...FONTS.body4,
        color: COLORS.black,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        ...FONTS.body3,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        ...FONTS.body5,
        color: COLORS.error,
        marginTop: 5,
    },
    passwordRequirements: {
        backgroundColor: COLORS.lightGray,
        padding: 15,
        borderRadius: 8,
        marginBottom: 25,
    },
    requirementsTitle: {
        ...FONTS.h4,
        marginBottom: 10,
    },
    requirementItem: {
        ...FONTS.body4,
        marginBottom: 5,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 8,
        padding: 15,
        alignItems: 'center',
    },
    submitButtonText: {
        ...FONTS.h4,
        color: COLORS.white,
    },
});

export default ChangePasswordScreen; 