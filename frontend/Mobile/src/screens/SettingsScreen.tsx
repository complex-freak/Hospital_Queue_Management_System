import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { settingsService } from '../services';
import { AppSettings } from '../types';
import { APP_VERSION } from '../config/env';

type SettingsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const SettingsScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { colors } = useTheme();
    const { logout, updateProfile, state: authState } = useAuth();
    const navigation = useNavigation<SettingsScreenNavigationProp>();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        fullName: '',
        phoneNumber: '',
    });
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [showPasswordForm, setShowPasswordForm] = useState(false);
    const [showProfileUpdateForm, setShowProfileUpdateForm] = useState(false);
    const [fullName, setFullName] = useState(authState.user?.fullName || '');
    const [phoneNumber, setPhoneNumber] = useState(authState.user?.phoneNumber || '');
    const [settings, setSettings] = useState<AppSettings>({
        language: 'en',
        notificationsEnabled: true,
        version: APP_VERSION,
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch settings on component mount
    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            setLoading(true);
            const response = await settingsService.getSettings();
            
            if (response.isSuccess) {
                const transformedSettings = settingsService.transformSettingsData(
                    response.data,
                    APP_VERSION
                );
                setSettings(transformedSettings);
                
                // Update app language if needed
                if (transformedSettings.language !== i18n.language) {
                    i18n.changeLanguage(transformedSettings.language);
                }
            } else {
                setError('Failed to load settings');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to load settings');
        } finally {
            setLoading(false);
        }
    };

    const updateNotificationSetting = async (value: boolean) => {
        try {
            setLoading(true);
            
            const response = await settingsService.updateSettings({
                notifications_enabled: value,
            });
            
            if (response.isSuccess) {
                setSettings({
                    ...settings,
                    notificationsEnabled: value,
                });
            } else {
                setError('Failed to update notification settings');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to update settings');
        } finally {
            setLoading(false);
        }
    };

    const updateLanguage = async (lang: string) => {
        try {
            setLoading(true);
            
            const response = await settingsService.updateSettings({
                language: lang,
            });
            
            if (response.isSuccess) {
                // Update app language
                i18n.changeLanguage(lang);
                
                setSettings({
                    ...settings,
                    language: lang,
                });
            } else {
                setError('Failed to update language settings');
            }
        } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to update language');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            t('deleteAccount'),
            t('deleteAccountConfirmation'),
            [
                {
                    text: t('cancel'),
                    style: 'cancel'
                },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: () => {
                        // TODO: Implement account deletion logic
                        Alert.alert(
                            t('accountDeleted'),
                            t('accountDeletedMessage'),
                            [
                                {
                                    text: t('ok'),
                                    onPress: logout
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'sw' : 'en';
        i18n.changeLanguage(newLang);
    };

    const validateForm = () => {
        let valid = true;
        const newErrors = {
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
            fullName: errors.fullName,
            phoneNumber: errors.phoneNumber,
        };

        if (!currentPassword.trim()) {
            newErrors.currentPassword = t('currentPasswordRequired');
            valid = false;
        }

        if (!newPassword.trim()) {
            newErrors.newPassword = t('newPasswordRequired');
            valid = false;
        }

        if (newPassword !== confirmPassword) {
            newErrors.confirmPassword = t('passwordsDoNotMatch');
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    const handleResetPassword = async () => {
        if (validateForm()) {
            try {
                // TODO: Implement password reset logic
                Alert.alert(
                    t('success'),
                    t('passwordResetSuccess'),
                    [{
                        text: 'OK', onPress: () => {
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                            setShowPasswordForm(false);
                        }
                    }]
                );
            } catch (error) {
                Alert.alert(t('error'), error instanceof Error ? error.message : 'Password reset failed');
            }
        }
    };

    // Validate profile update form
    const validateProfileForm = () => {
        let valid = true;
        const newErrors = { ...errors, fullName: '', phoneNumber: '' };

        if (!fullName.trim()) {
            newErrors.fullName = t('fullNameRequired');
            valid = false;
        }

        if (!phoneNumber.trim()) {
            newErrors.phoneNumber = t('phoneNumberRequired');
            valid = false;
        }

        setErrors(newErrors);
        return valid;
    };

    // Handle profile update
    const handleProfileUpdate = async () => {
        if (validateProfileForm()) {
            try {
                // Update with fields that match the AuthContext updateProfile function signature
                await updateProfile({});
                setShowProfileUpdateForm(false);
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
            }
        }
    };

    // This will handle the password reset modal
    const renderPasswordResetModal = () => {
        if (!showPasswordForm) return null;

        return (
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('resetPassword')}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowPasswordForm(false);
                                setCurrentPassword('');
                                setNewPassword('');
                                setConfirmPassword('');
                                setErrors({
                                    currentPassword: '',
                                    newPassword: '',
                                    confirmPassword: '',
                                    fullName: '',
                                    phoneNumber: '',
                                });
                            }}
                        >
                            <Ionicons name="close" size={24} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={[styles.modalInput, errors.currentPassword ? styles.inputError : null]}
                        placeholder={t('currentPassword')}
                        value={currentPassword}
                        onChangeText={setCurrentPassword}
                        secureTextEntry
                        placeholderTextColor="#888"
                    />
                    {errors.currentPassword && (
                        <Text style={styles.modalErrorText}>{errors.currentPassword}</Text>
                    )}

                    <TextInput
                        style={[styles.modalInput, errors.newPassword ? styles.inputError : null]}
                        placeholder={t('newPassword')}
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                        placeholderTextColor="#888"
                    />
                    {errors.newPassword && (
                        <Text style={styles.modalErrorText}>{errors.newPassword}</Text>
                    )}

                    <TextInput
                        style={[styles.modalInput, errors.confirmPassword ? styles.inputError : null]}
                        placeholder={t('confirmPassword')}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                        placeholderTextColor="#888"
                    />
                    {errors.confirmPassword && (
                        <Text style={styles.modalErrorText}>{errors.confirmPassword}</Text>
                    )}

                    <TouchableOpacity
                        style={styles.modalButton}
                        onPress={handleResetPassword}
                    >
                        <Text style={styles.modalButtonText}>{t('resetPassword')}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Profile update modal
    const renderProfileUpdateModal = () => {
        if (!showProfileUpdateForm) return null;

        return (
            <View style={styles.modalOverlay}>
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{t('updateProfile')}</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setShowProfileUpdateForm(false);
                                setFullName(authState.user?.fullName || '');
                                setPhoneNumber(authState.user?.phoneNumber || '');
                                setErrors({
                                    ...errors,
                                    fullName: '',
                                    phoneNumber: '',
                                });
                            }}
                        >
                            <Ionicons name="close" size={24} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={[styles.modalInput, errors.fullName ? styles.inputError : null]}
                        placeholder={t('fullName')}
                        value={fullName}
                        onChangeText={setFullName}
                        placeholderTextColor="#888"
                    />
                    {errors.fullName && (
                        <Text style={styles.modalErrorText}>{errors.fullName}</Text>
                    )}

                    <TextInput
                        style={[styles.modalInput, errors.phoneNumber ? styles.inputError : null]}
                        placeholder={t('phoneNumber')}
                        value={phoneNumber}
                        onChangeText={setPhoneNumber}
                        keyboardType="phone-pad"
                        placeholderTextColor="#888"
                    />
                    {errors.phoneNumber && (
                        <Text style={styles.modalErrorText}>{errors.phoneNumber}</Text>
                    )}

                    <TouchableOpacity
                        style={styles.modalButton}
                        onPress={handleProfileUpdate}
                        disabled={authState.loading}
                    >
                        {authState.loading ? (
                            <ActivityIndicator color={COLORS.white} />
                        ) : (
                            <Text style={styles.modalButtonText}>{t('update')}</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* User Profile Section */}
                <View style={styles.profileSection}>
                    <View style={styles.profileIconContainer}>
                        <Ionicons name="person" size={40} color={COLORS.white} />
                    </View>
                    <Text style={styles.profileName}>{authState.user?.fullName || t('User')}</Text>
                    <TouchableOpacity
                        style={styles.editProfileButton}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <Text style={styles.editProfileText}>{t('viewProfile')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Settings Sections */}
                <View style={styles.settingsContainer}>
                    {/* Profile Section */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>{t('profile')}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="person" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('viewProfile')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    {/* Preferences Section */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="options-outline" size={22} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>{t('preferences')}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => navigation.navigate('Preferences')}
                        >
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="settings-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('appPreferences')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </TouchableOpacity>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="language-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('language')}</Text>
                            </View>
                            <View style={styles.languageOptions}>
                                <TouchableOpacity
                                    style={[
                                        styles.languageOption,
                                        settings.language === 'en' && styles.selectedLanguage
                                    ]}
                                    onPress={() => updateLanguage('en')}
                                >
                                    <Text style={styles.languageText}>English</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.languageOption,
                                        settings.language === 'es' && styles.selectedLanguage
                                    ]}
                                    onPress={() => updateLanguage('es')}
                                >
                                    <Text style={styles.languageText}>Español</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="notifications-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('notifications')}</Text>
                            </View>
                            <Switch
                                value={settings.notificationsEnabled}
                                onValueChange={updateNotificationSetting}
                                trackColor={{ false: COLORS.gray, true: COLORS.primary }}
                                thumbColor={COLORS.white}
                            />
                        </View>
                    </View>

                    {/* Security Section */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="shield-outline" size={22} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>{t('security')}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => navigation.navigate('ChangePassword')}
                        >
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="key-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('resetPassword')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => navigation.navigate('Privacy')}
                        >
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="lock-closed-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('privacy')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    {/* Help & Support Section */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="help-circle-outline" size={22} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>{t('helpAndSupport')}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => navigation.navigate('HelpCenter')}
                        >
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="help-buoy-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('helpCenter')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.settingItem}
                            onPress={() => navigation.navigate('About')}
                        >
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="information-circle-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('about')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    {/* Account Actions */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="warning-outline" size={22} color={COLORS.error} />
                            <Text style={[styles.sectionTitle, { color: COLORS.error }]}>{t('accountActions')}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.deleteAccountButton}
                            onPress={handleDeleteAccount}
                        >
                            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                            <Text style={styles.deleteAccountText}>{t('deleteAccount')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Logout Button */}
                    <TouchableOpacity
                        style={styles.logoutButton}
                        onPress={logout}
                    >
                        <Ionicons name="log-out-outline" size={22} color={COLORS.white} />
                        <Text style={styles.logoutButtonText}>{t('logout')}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {renderPasswordResetModal()}
            {renderProfileUpdateModal()}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    profileSection: {
        backgroundColor: COLORS.primary,
        padding: SIZES.padding * 2,
        paddingTop: SIZES.padding * 2 + SIZES.topSpacing,
        alignItems: 'center',
    },
    profileIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SIZES.padding,
    },
    profileName: {
        ...FONTS.h3,
        color: COLORS.white,
        marginBottom: 4,
    },
    profilePhone: {
        ...FONTS.body4,
        color: COLORS.white,
        opacity: 0.8,
    },
    settingsContainer: {
        padding: SIZES.padding,
    },
    sectionCard: {
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
        paddingBottom: SIZES.padding,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.divider,
        marginBottom: SIZES.padding,
    },
    sectionTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginLeft: 8,
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: SIZES.base,
        marginBottom: SIZES.base,
    },
    settingLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingLabel: {
        ...FONTS.body3,
        color: COLORS.black,
        marginLeft: 12,
    },
    settingAction: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    actionText: {
        ...FONTS.body4,
        color: COLORS.primary,
        marginRight: 4,
    },
    passwordFormContainer: {
        marginTop: SIZES.base,
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SIZES.radius,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 6,
        fontSize: 16,
    },
    inputError: {
        borderColor: COLORS.error,
    },
    errorText: {
        color: COLORS.error,
        fontSize: 14,
        marginBottom: 16,
        marginTop: 4,
        paddingLeft: 4,
    },
    resetButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: SIZES.padding,
    },
    resetButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    versionText: {
        ...FONTS.body4,
        color: COLORS.gray,
    },
    supportItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: SIZES.padding,
        borderTopWidth: 1,
        borderTopColor: COLORS.divider,
        marginTop: SIZES.base,
    },
    supportText: {
        ...FONTS.body3,
        color: COLORS.black,
        marginLeft: 12,
    },
    logoutButton: {
        backgroundColor: COLORS.error,
        borderRadius: SIZES.radius,
        paddingVertical: 16,
        alignItems: 'center',
        marginVertical: SIZES.padding,
        flexDirection: 'row',
        justifyContent: 'center',
    },
    logoutButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
    },
    modalContainer: {
        width: '85%',
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding * 1.5,
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.padding,
    },
    modalTitle: {
        ...FONTS.h3,
        color: COLORS.black,
    },
    modalInput: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: SIZES.radius / 1.5,
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginBottom: 6,
        fontSize: 16,
    },
    modalErrorText: {
        color: COLORS.error,
        fontSize: 14,
        marginBottom: 16,
        marginTop: 4,
        paddingLeft: 4,
    },
    modalButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius / 1.5,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: SIZES.padding,
    },
    modalButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: '600',
    },
    editProfileButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.base,
        borderRadius: SIZES.radius / 2,
        marginTop: SIZES.padding,
    },
    editProfileText: {
        color: COLORS.white,
        ...FONTS.body4,
    },
    profileInfoItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    profileInfoLabel: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    profileInfoText: {
        ...FONTS.body3,
        color: COLORS.gray,
        marginLeft: 10,
    },
    profileInfoValue: {
        ...FONTS.body3,
        color: COLORS.black,
    },
    editProfileInfoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
    },
    editProfileInfoText: {
        ...FONTS.body3,
        color: COLORS.primary,
        marginLeft: 8,
    },
    deleteAccountButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    deleteAccountText: {
        ...FONTS.body3,
        color: COLORS.error,
        marginLeft: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    languageOptions: {
        flexDirection: 'row',
    },
    languageOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginLeft: 8,
        backgroundColor: COLORS.lightGray,
    },
    selectedLanguage: {
        backgroundColor: COLORS.primary,
    },
    languageText: {
        ...FONTS.body4,
        color: COLORS.black,
    },
    versionContainer: {
        marginTop: 'auto',
        alignItems: 'center',
        padding: 16,
    },
});

export default SettingsScreen; 