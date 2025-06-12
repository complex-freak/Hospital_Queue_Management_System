import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    Image,
    TouchableOpacity,
    StatusBar,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { COLORS, FONTS, SIZES } from '../constants/theme';
import { RootStackParamList } from '../navigation';
import { useAuth } from '../context/AuthContext';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const HomeScreen: React.FC = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const { state: authState } = useAuth();

    // Define menu options for the home screen
    const menuOptions = [
        {
            id: 'appointment',
            title: t('appointmentReg'),
            icon: 'calendar-outline',
            color: COLORS.primary,
            description: t('bookAppointment'),
            onPress: () => navigation.navigate('Appointment'),
        },
        {
            id: 'queue',
            title: t('queueStatus'),
            icon: 'time-outline',
            color: COLORS.warning,
            description: t('checkQueuePosition'),
            onPress: () => navigation.navigate('MainTabs', { screen: 'QueueStatus' }),
        },
        {
            id: 'notifications',
            title: t('notifications'),
            icon: 'notifications-outline',
            color: COLORS.info,
            description: t('viewNotifications'),
            onPress: () => navigation.navigate('MainTabs', { screen: 'Notifications' }),
        },
        {
            id: 'help',
            title: t('help'),
            icon: 'help-circle-outline',
            color: COLORS.secondary,
            description: t('getAssistance'),
            onPress: () => navigation.navigate('Help'),
        },
    ];

    // Stats for dashboard
    const stats = [
        {
            id: 'appointments',
            title: t('appointments'),
            value: '2',
            icon: 'calendar',
            color: COLORS.primary,
        },
        {
            id: 'queue',
            title: t('queuePosition'),
            value: '4',
            icon: 'time',
            color: COLORS.warning,
        },
        {
            id: 'notifications',
            title: t('notifications'),
            value: '3',
            icon: 'notifications',
            color: COLORS.info,
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar backgroundColor={COLORS.primary} barStyle="light-content" />

            {/* Dashboard Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>
                        {t('greeting')}
                    </Text>
                    <Text style={styles.name}>
                        {authState.user ? authState.user.fullName : ''}
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={() => navigation.navigate('MainTabs', { screen: 'Settings' })}
                >
                    <Ionicons name="person-circle-outline" size={40} color={COLORS.white} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                {/* Stats Dashboard */}
                <View style={styles.statsContainer}>
                    {stats.map((stat) => (
                        <View key={stat.id} style={styles.statCard}>
                            <View style={[styles.statIconContainer, { backgroundColor: stat.color + '15' }]}>
                                <Ionicons name={stat.icon as any} size={22} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statTitle}>{stat.title}</Text>
                        </View>
                    ))}
                </View>

                {/* Main cards */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{t('services')}</Text>

                    {menuOptions.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.serviceCard}
                            onPress={option.onPress}
                            accessible={true}
                            accessibilityLabel={option.title}
                            accessibilityRole="button"
                        >
                            <View style={styles.serviceContent}>
                                <View style={[styles.iconContainer, { backgroundColor: option.color + '15' }]}>
                                    <Ionicons name={option.icon as any} size={24} color={option.color} />
                                </View>
                                <View style={styles.serviceTextContainer}>
                                    <Text style={styles.serviceTitle}>{option.title}</Text>
                                    <Text style={styles.serviceDescription}>{option.description}</Text>
                                </View>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color={COLORS.gray} />
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Recent Activity */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>{t('recentActivity')}</Text>
                    <View style={styles.activityCard}>
                        <View style={styles.activityHeader}>
                            <Ionicons name="calendar" size={20} color={COLORS.primary} />
                            <Text style={styles.activityDate}>{t('today')}, 10:30 AM</Text>
                        </View>
                        <Text style={styles.activityTitle}>{t('appointmentWithDr')}</Text>
                        <Text style={styles.activityDescription}>{t('generalConsultation')}</Text>
                        <View style={styles.activityStatus}>
                            <View style={[styles.statusIndicator, { backgroundColor: COLORS.success }]}></View>
                            <Text style={styles.statusText}>{t('completed')}</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.padding * 1.2,
        paddingTop: SIZES.padding * 1.5 + SIZES.topSpacing,
    },
    greeting: {
        ...FONTS.body4,
        color: COLORS.white,
        opacity: 0.9,
    },
    name: {
        ...FONTS.h3,
        color: COLORS.white,
    },
    profileButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        padding: SIZES.padding,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: -SIZES.padding, // Overlap with header
        marginBottom: SIZES.padding,
    },
    statCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        width: '31%',
        alignItems: 'center',
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    statIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    statValue: {
        ...FONTS.h2,
        color: COLORS.black,
    },
    statTitle: {
        ...FONTS.body5,
        color: COLORS.gray,
        textAlign: 'center',
    },
    sectionContainer: {
        marginBottom: SIZES.padding * 1.5,
    },
    sectionTitle: {
        ...FONTS.h3,
        color: COLORS.black,
        marginBottom: SIZES.padding,
    },
    serviceCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.padding,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    serviceContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconContainer: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SIZES.padding,
    },
    serviceTextContainer: {
        flex: 1,
    },
    serviceTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginBottom: 4,
    },
    serviceDescription: {
        ...FONTS.body5,
        color: COLORS.gray,
    },
    activityCard: {
        backgroundColor: COLORS.white,
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        shadowColor: COLORS.black,
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: SIZES.base,
    },
    activityDate: {
        ...FONTS.body5,
        color: COLORS.gray,
        marginLeft: 8,
    },
    activityTitle: {
        ...FONTS.h4,
        color: COLORS.black,
        marginBottom: 4,
    },
    activityDescription: {
        ...FONTS.body5,
        color: COLORS.gray,
        marginBottom: SIZES.base,
    },
    activityStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: SIZES.base,
    },
    statusIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        ...FONTS.body5,
        color: COLORS.success,
    },
});

export default HomeScreen; 