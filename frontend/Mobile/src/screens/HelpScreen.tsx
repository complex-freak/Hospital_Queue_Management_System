import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SIZES } from '../constants/theme';

interface FAQItem {
    question: string;
    answer: string;
}

interface TutorialStep {
    title: string;
    description: string;
    icon: string;
}

export default function HelpScreen() {
    const { t } = useTranslation();
    const navigation = useNavigation();

    // FAQ data
    const faqItems: FAQItem[] = [
        {
            question: 'What services does this app provide?',
            answer: 'This app allows you to register for hospital appointments, check your queue status, receive notifications about your appointments, and manage your hospital visits efficiently.'
        },
        {
            question: 'Is my medical information secure?',
            answer: 'Yes, all your medical information is encrypted and securely stored. We follow strict privacy guidelines and only authorized personnel can access your medical records.'
        },
        {
            question: 'Can I change my appointment time?',
            answer: 'Yes, you can modify your appointment by going to the Appointments section and selecting the appointment you wish to change. Follow the prompts to select a new date and time.'
        },
        {
            question: 'What should I do if I miss my appointment?',
            answer: 'If you miss your appointment, please schedule a new one through the app. You may also contact the hospital directly for urgent matters.'
        },
        {
            question: 'How do I update my personal information?',
            answer: 'You can update your personal information in the Settings section under "Account". Make sure to keep your contact information current for important notifications.'
        },
    ];

    // Tutorial data with steps for different actions
    const appointmentTutorial: TutorialStep[] = [
        {
            title: 'Access the Appointment Screen',
            description: 'From the home screen, tap on "Appointment Registration" to begin the process.',
            icon: '📱',
        },
        {
            title: 'Fill Your Information',
            description: 'Enter your personal details, reason for visit, and select a preferred date and time.',
            icon: '📋',
        },
        {
            title: 'Confirm Your Appointment',
            description: 'Review your information and tap "Confirm" to complete the appointment registration.',
            icon: '✅',
        },
    ];

    const queueTutorial: TutorialStep[] = [
        {
            title: 'View Queue Status',
            description: 'Tap on "Queue Status" in the bottom navigation or from the home screen.',
            icon: '🏠',
        },
        {
            title: 'Check Your Position',
            description: 'See your current position in the queue and estimated waiting time.',
            icon: '🕒',
        },
        {
            title: 'Stay Updated',
            description: 'The queue status updates automatically, but you can also pull to refresh for the latest information.',
            icon: '🔄',
        },
    ];

    const notificationsTutorial: TutorialStep[] = [
        {
            title: 'Enable Notifications',
            description: 'Ensure notifications are enabled in your settings to receive important updates.',
            icon: '🔔',
        },
        {
            title: 'Check Notifications',
            description: 'Tap on the Notifications tab to view all your appointment alerts and hospital updates.',
            icon: '👆',
        },
    ];

    const emergencyInfo: TutorialStep[] = [
        {
            title: 'Call Emergency Service',
            description: 'For medical emergencies, call the emergency hotline immediately: 112 or 999.',
            icon: '🚑',
        },
        {
            title: 'Emergency Department',
            description: 'Go directly to the Emergency Department for urgent medical attention.',
            icon: '🏥',
        },
    ];

    const renderTutorialSection = (title: string, steps: TutorialStep[]) => (
        <View style={styles.tutorialSection}>
            <Text style={styles.sectionTitle}>{title}</Text>
            {steps.map((step, index) => (
                <View key={index} style={styles.step}>
                    <View style={styles.stepIconContainer}>
                        <Text style={styles.stepIcon}>{step.icon}</Text>
                    </View>
                    <View style={styles.stepContent}>
                        <Text style={styles.stepTitle}>
                            {index + 1}. {step.title}
                        </Text>
                        <Text style={styles.stepDescription}>{step.description}</Text>
                    </View>
                </View>
            ))}
        </View>
    );

    const renderFaqSection = () => (
        <View style={styles.tutorialSection}>
            <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
            {faqItems.map((item, index) => (
                <View key={index} style={styles.faqItem}>
                    <View style={styles.faqQuestion}>
                        <Ionicons name="help-circle" size={22} color={COLORS.primary} />
                        <Text style={styles.faqQuestionText}>{item.question}</Text>
                    </View>
                    <Text style={styles.faqAnswer}>{item.answer}</Text>
                </View>
            ))}
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('help')}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.welcomeCard}>
                    <Ionicons name="information-circle" size={28} color={COLORS.primary} />
                    <Text style={styles.welcomeText}>
                        Welcome to the Help Center. Here you'll find guides on how to use the app and answers to common questions.
                    </Text>
                </View>

                {/* Emergency Information - High Priority */}
                <View style={[styles.tutorialSection, styles.emergencySection]}>
                    <Text style={[styles.sectionTitle, styles.emergencyTitle]}>Emergency Information</Text>
                    {emergencyInfo.map((step, index) => (
                        <View key={index} style={styles.step}>
                            <View style={[styles.stepIconContainer, styles.emergencyIconContainer]}>
                                <Text style={styles.stepIcon}>{step.icon}</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={[styles.stepTitle, styles.emergencyStepTitle]}>
                                    {step.title}
                                </Text>
                                <Text style={styles.stepDescription}>{step.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {renderTutorialSection(
                    'How to Register an Appointment',
                    appointmentTutorial
                )}

                {renderTutorialSection('How to Check Queue Status', queueTutorial)}

                {renderTutorialSection(
                    'Managing Notifications',
                    notificationsTutorial
                )}

                {renderFaqSection()}

                <View style={styles.contactSection}>
                    <Text style={styles.contactTitle}>Contact Us</Text>
                    <View style={styles.contactItem}>
                        <Ionicons name="call-outline" size={22} color={COLORS.primary} style={styles.contactIcon} />
                        <Text style={styles.contactInfo}>0712 345 678</Text>
                    </View>
                    <View style={styles.contactItem}>
                        <Ionicons name="mail-outline" size={22} color={COLORS.primary} style={styles.contactIcon} />
                        <Text style={styles.contactInfo}>support@hospital.co.tz</Text>
                    </View>
                    <View style={styles.contactItem}>
                        <Ionicons name="location-outline" size={22} color={COLORS.primary} style={styles.contactIcon} />
                        <Text style={styles.contactInfo}>123 Hospital Street, Dar es Salaam</Text>
                    </View>

                    <TouchableOpacity style={styles.supportButton} onPress={() => { }}>
                        <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.white} />
                        <Text style={styles.supportButtonText}>Contact Support</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.primary,
        paddingVertical: SIZES.padding,
        paddingTop: SIZES.padding + SIZES.topSpacing,
        paddingHorizontal: SIZES.padding * 1.5,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    headerTitle: {
        ...FONTS.h3,
        color: COLORS.white,
        textAlign: 'center',
    },
    scrollContent: {
        padding: SIZES.padding,
    },
    welcomeCard: {
        backgroundColor: COLORS.primary + '15',
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        flexDirection: 'row',
        alignItems: 'center',
    },
    welcomeText: {
        ...FONTS.body4,
        color: COLORS.black,
        marginLeft: 10,
        flex: 1,
        lineHeight: 20,
    },
    tutorialSection: {
        marginBottom: SIZES.padding,
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    emergencySection: {
        borderWidth: 1,
        borderColor: COLORS.error + '50',
        backgroundColor: COLORS.error + '05',
    },
    emergencyTitle: {
        color: COLORS.error,
    },
    emergencyIconContainer: {
        backgroundColor: COLORS.error + '15',
    },
    emergencyStepTitle: {
        color: COLORS.error,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.primary,
        marginBottom: SIZES.padding,
    },
    step: {
        flexDirection: 'row',
        marginBottom: SIZES.padding,
    },
    stepIconContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: COLORS.primary + '15',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.padding,
    },
    stepIcon: {
        fontSize: 22,
    },
    stepContent: {
        flex: 1,
    },
    stepTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginBottom: 4,
    },
    stepDescription: {
        ...FONTS.body4,
        color: COLORS.gray,
        lineHeight: 20,
    },
    faqItem: {
        marginBottom: SIZES.padding,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
        paddingBottom: SIZES.padding,
    },
    faqQuestion: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    faqQuestionText: {
        ...FONTS.h4,
        color: COLORS.black,
        marginLeft: 8,
        flex: 1,
    },
    faqAnswer: {
        ...FONTS.body4,
        color: COLORS.gray,
        marginLeft: 30,
        lineHeight: 20,
    },
    contactSection: {
        padding: SIZES.padding,
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        marginBottom: SIZES.padding,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    contactTitle: {
        ...FONTS.h3,
        color: COLORS.primary,
        marginBottom: SIZES.padding,
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    contactIcon: {
        marginRight: 10,
    },
    contactInfo: {
        ...FONTS.body3,
        color: COLORS.black,
    },
    supportButton: {
        backgroundColor: COLORS.primary,
        borderRadius: SIZES.radius / 1.5,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: SIZES.padding,
    },
    supportButtonText: {
        ...FONTS.h4,
        color: COLORS.white,
        marginLeft: 8,
    },
}); 