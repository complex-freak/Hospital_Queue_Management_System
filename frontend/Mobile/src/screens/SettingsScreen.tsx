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
    StatusBar,
    Switch,
    ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

const SettingsScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { colors } = useTheme();
    const { logout, updateProfile, state: authState } = useAuth();
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
                await updateProfile({ fullName, phoneNumber });
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
                    <Text style={styles.profilePhone}>{authState.user?.phoneNumber || ''}</Text>
                    <TouchableOpacity
                        style={styles.editProfileButton}
                        onPress={() => setShowProfileUpdateForm(true)}
                    >
                        <Text style={styles.editProfileText}>{t('editProfile')}</Text>
                    </TouchableOpacity>
                </View>

                {/* Settings Sections */}
                <View style={styles.settingsContainer}>
                    {/* Preferences Section */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="options-outline" size={22} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>{t('preferences')}</Text>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="language-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('language')}</Text>
                            </View>
                            <TouchableOpacity style={styles.settingAction} onPress={toggleLanguage}>
                                <Text style={styles.actionText}>
                                    {i18n.language === 'en' ? 'English' : 'Kiswahili'}
                                </Text>
                                <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="notifications-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('notifications')}</Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: COLORS.lightGray, true: COLORS.primary + '80' }}
                                thumbColor={notificationsEnabled ? COLORS.primary : COLORS.gray}
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
                            onPress={() => {
                                // Show password reset modal or navigate to separate screen
                                Alert.alert(
                                    t('resetPassword'),
                                    t('wouldResetPassword'),
                                    [
                                        {
                                            text: t('cancel'),
                                            style: 'cancel'
                                        },
                                        {
                                            text: t('continue'),
                                            onPress: () => {
                                                // Here you could navigate to a dedicated reset password screen
                                                // For now we'll show the password form as a popup
                                                setShowPasswordForm(true);
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="key-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('resetPassword')}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </TouchableOpacity>
                    </View>

                    {/* About Section */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="information-circle-outline" size={22} color={COLORS.primary} />
                            <Text style={styles.sectionTitle}>{t('about')}</Text>
                        </View>

                        <View style={styles.settingItem}>
                            <View style={styles.settingLabelContainer}>
                                <Ionicons name="code-outline" size={22} color={COLORS.gray} />
                                <Text style={styles.settingLabel}>{t('version')}</Text>
                            </View>
                            <Text style={styles.versionText}>1.0.0</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.supportItem}
                            onPress={() => Alert.alert(t('contactSupport'), 'Contact us at support@hospital.com')}
                        >
                            <Ionicons name="help-circle-outline" size={22} color={COLORS.gray} />
                            <Text style={styles.supportText}>{t('contactSupport')}</Text>
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
});

export default SettingsScreen; 