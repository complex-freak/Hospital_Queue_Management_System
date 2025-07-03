import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Switch,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

const PreferencesScreen = () => {
    const { t, i18n } = useTranslation();
    
    // Notification preferences
    const [pushNotifications, setPushNotifications] = useState(true);
    const [emailNotifications, setEmailNotifications] = useState(false);
    const [smsNotifications, setSmsNotifications] = useState(true);
    
    // Appointment reminders
    const [appointmentReminders, setAppointmentReminders] = useState(true);
    const [reminderTime, setReminderTime] = useState('1 day');
    
    // App preferences
    const [darkMode, setDarkMode] = useState(false);
    const [language, setLanguage] = useState(i18n.language);
    
    const toggleLanguage = () => {
        const newLang = language === 'en' ? 'sw' : 'en';
        setLanguage(newLang);
        i18n.changeLanguage(newLang);
    };
    
    return (
        <SafeAreaView style={styles.safeArea}>
            <ScrollView style={styles.container}>
                {/* Notification Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('notificationPreferences')}</Text>
                    
                    <View style={styles.preferenceItem}>
                        <View style={styles.preferenceContent}>
                            <Ionicons name="notifications" size={24} color={COLORS.primary} />
                            <Text style={styles.preferenceText}>{t('pushNotifications')}</Text>
                        </View>
                        <Switch
                            value={pushNotifications}
                            onValueChange={setPushNotifications}
                            trackColor={{ false: "#767577", true: `${COLORS.primary}80` }}
                            thumbColor={pushNotifications ? COLORS.primary : "#f4f3f4"}
                        />
                    </View>
                    
                    <View style={styles.preferenceItem}>
                        <View style={styles.preferenceContent}>
                            <Ionicons name="mail" size={24} color={COLORS.primary} />
                            <Text style={styles.preferenceText}>{t('emailNotifications')}</Text>
                        </View>
                        <Switch
                            value={emailNotifications}
                            onValueChange={setEmailNotifications}
                            trackColor={{ false: "#767577", true: `${COLORS.primary}80` }}
                            thumbColor={emailNotifications ? COLORS.primary : "#f4f3f4"}
                        />
                    </View>
                    
                    <View style={styles.preferenceItem}>
                        <View style={styles.preferenceContent}>
                            <Ionicons name="chatbubble" size={24} color={COLORS.primary} />
                            <Text style={styles.preferenceText}>{t('smsNotifications')}</Text>
                        </View>
                        <Switch
                            value={smsNotifications}
                            onValueChange={setSmsNotifications}
                            trackColor={{ false: "#767577", true: `${COLORS.primary}80` }}
                            thumbColor={smsNotifications ? COLORS.primary : "#f4f3f4"}
                        />
                    </View>
                </View>
                
                {/* Appointment Reminders */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('appointmentReminders')}</Text>
                    
                    <View style={styles.preferenceItem}>
                        <View style={styles.preferenceContent}>
                            <Ionicons name="calendar" size={24} color={COLORS.primary} />
                            <Text style={styles.preferenceText}>{t('enableReminders')}</Text>
                        </View>
                        <Switch
                            value={appointmentReminders}
                            onValueChange={setAppointmentReminders}
                            trackColor={{ false: "#767577", true: `${COLORS.primary}80` }}
                            thumbColor={appointmentReminders ? COLORS.primary : "#f4f3f4"}
                        />
                    </View>
                    
                    {appointmentReminders && (
                        <View style={styles.preferenceItem}>
                            <View style={styles.preferenceContent}>
                                <Ionicons name="time" size={24} color={COLORS.primary} />
                                <Text style={styles.preferenceText}>{t('reminderTime')}</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.dropdownButton}
                                onPress={() => {
                                    // In a real app, this would show a dropdown or modal
                                    const times = ['1 hour', '3 hours', '1 day', '2 days'];
                                    const currentIndex = times.indexOf(reminderTime);
                                    const nextIndex = (currentIndex + 1) % times.length;
                                    setReminderTime(times[nextIndex]);
                                }}
                            >
                                <Text style={styles.dropdownText}>{reminderTime}</Text>
                                <Ionicons name="chevron-down" size={16} color={COLORS.gray} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                
                {/* App Preferences */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('appPreferences')}</Text>
                    
                    <View style={styles.preferenceItem}>
                        <View style={styles.preferenceContent}>
                            <Ionicons name="contrast" size={24} color={COLORS.primary} />
                            <Text style={styles.preferenceText}>{t('darkMode')}</Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={setDarkMode}
                            trackColor={{ false: "#767577", true: `${COLORS.primary}80` }}
                            thumbColor={darkMode ? COLORS.primary : "#f4f3f4"}
                        />
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.preferenceItem}
                        onPress={toggleLanguage}
                    >
                        <View style={styles.preferenceContent}>
                            <Ionicons name="language" size={24} color={COLORS.primary} />
                            <Text style={styles.preferenceText}>{t('language')}</Text>
                        </View>
                        <View style={styles.languageSelector}>
                            <Text style={styles.languageText}>{language === 'en' ? 'English' : 'Swahili'}</Text>
                            <Ionicons name="chevron-forward" size={20} color={COLORS.gray} />
                        </View>
                    </TouchableOpacity>
                </View>
                
                <View style={styles.noteContainer}>
                    <Text style={styles.noteText}>{t('preferencesNote')}</Text>
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
    section: {
        backgroundColor: COLORS.white,
        borderRadius: 10,
        padding: 15,
        margin: 15,
        marginBottom: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.black,
        marginBottom: 15,
    },
    preferenceItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    preferenceContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    preferenceText: {
        ...FONTS.body3,
        marginLeft: 15,
    },
    dropdownButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.lightGray,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 5,
    },
    dropdownText: {
        ...FONTS.body4,
        marginRight: 5,
    },
    languageSelector: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    languageText: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginRight: 5,
    },
    noteContainer: {
        padding: 15,
        margin: 15,
        marginTop: 5,
    },
    noteText: {
        ...FONTS.body5,
        color: COLORS.gray,
        fontStyle: 'italic',
    },
});

export default PreferencesScreen; 