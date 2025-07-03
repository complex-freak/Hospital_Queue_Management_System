import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, ActivityIndicator, View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS } from '../constants/theme';
import NetworkStatusBar from '../components/NetworkStatusBar';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import QueueStatusScreen from '../screens/QueueStatusScreen';
import AppointmentScreen from '../screens/AppointmentScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import AppointmentDetailsScreen from '../screens/AppointmentDetailsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpScreen from '../screens/HelpScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import AboutScreen from '../screens/AboutScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import HelpCenterScreen from '../screens/HelpCenterScreen';
import PreferencesScreen from '../screens/PreferencesScreen';
import PrivacyScreen from '../screens/PrivacyScreen';
import ProfileScreen from '../screens/ProfileScreen';
import OnboardingScreen from '../screens/OnboardingScreen';

// Define types for navigation
export type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

export type MainTabParamList = {
    Home: undefined;
    QueueStatus: undefined;
    Appointments: undefined;
    Notifications: undefined;
    Settings: undefined;
};

export type RootStackParamList = {
    Auth: undefined;
    MainTabs: { screen?: keyof MainTabParamList } | undefined;
    Onboarding: undefined;
    Appointment: undefined;
    Appointments: undefined;
    AppointmentDetails: { appointmentId: string };
    Help: undefined;
    About: undefined;
    ChangePassword: undefined;
    HelpCenter: undefined;
    Preferences: undefined;
    Privacy: undefined;
    Profile: undefined;
};

// Create stack navigators
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const RootStack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();

// Auth Stack Navigator
const AuthNavigator = () => {
    const { t } = useTranslation();

    return (
        <AuthStack.Navigator
            screenOptions={{
                headerShown: false,
            }}
        >
            <AuthStack.Screen name="Login" component={LoginScreen} />
            <AuthStack.Screen name="Register" component={RegisterScreen} />
            <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
        </AuthStack.Navigator>
    );
};

// Main Tab Navigator
const MainTabNavigator = () => {
    const { t } = useTranslation();

    return (
        <MainTab.Navigator
            screenOptions={{
                tabBarActiveTintColor: COLORS.tabBarActive,
                tabBarInactiveTintColor: COLORS.tabBarInactive,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginBottom: 5,
                },
                tabBarStyle: {
                    height: 65,
                    paddingBottom: 10,
                    paddingTop: 5,
                    backgroundColor: COLORS.white,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                    elevation: 8,
                    shadowColor: COLORS.black,
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                },
                headerStyle: {
                    backgroundColor: COLORS.primary,
                    elevation: 0,
                    shadowOpacity: 0,
                },
                headerTitleStyle: {
                    ...FONTS.h3,
                    color: COLORS.white,
                },
                headerTitleAlign: 'center',
            }}
        >
            <MainTab.Screen
                name="Home"
                component={HomeScreen}
                options={{
                    headerTitle: t('welcome'),
                    tabBarLabel: t('welcome'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
                    ),
                }}
            />
            <MainTab.Screen
                name="QueueStatus"
                component={QueueStatusScreen}
                options={{
                    headerTitle: t('queueStatus'),
                    tabBarLabel: t('queue'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "time" : "time-outline"} size={size} color={color} />
                    ),
                }}
            />
            <MainTab.Screen
                name="Appointments"
                component={AppointmentsScreen}
                options={{
                    headerTitle: t('appointments'),
                    tabBarLabel: t('appointments'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
                    ),
                }}
            />
            <MainTab.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{
                    headerTitle: t('notifications'),
                    tabBarLabel: t('notifications'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "notifications" : "notifications-outline"} size={size} color={color} />
                    ),
                }}
            />
            <MainTab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{
                    headerTitle: t('settings'),
                    tabBarLabel: t('settings'),
                    tabBarIcon: ({ color, size, focused }) => (
                        <Ionicons name={focused ? "settings" : "settings-outline"} size={size} color={color} />
                    ),
                }}
            />
        </MainTab.Navigator>
    );
};

// Loading Component
const LoadingScreen = () => {
    const { t } = useTranslation();
    
    return (
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>{t('loading')}</Text>
        </View>
    );
};

// Root Navigator
const Navigation = () => {
    const { t } = useTranslation();
    const { state } = useAuth();
    const { user, loading } = state;

    // Show loading screen while checking auth status
    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <NavigationContainer>
            <NetworkStatusBar />
            <RootStack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                {!user ? (
                    // User is not signed in
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                ) : user.isProfileComplete === false ? (
                    // User is signed in but profile is not complete
                    <RootStack.Screen 
                        name="Onboarding" 
                        component={OnboardingScreen} 
                        options={{
                            headerShown: false,
                        }}
                    />
                ) : (
                    // User is signed in with complete profile
                    <>
                        <RootStack.Screen 
                            name="MainTabs" 
                            component={MainTabNavigator}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <RootStack.Screen
                            name="Appointment"
                            component={AppointmentScreen}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <RootStack.Screen
                            name="Appointments"
                            component={AppointmentsScreen}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <RootStack.Screen
                            name="AppointmentDetails"
                            component={AppointmentDetailsScreen}
                            options={{
                                headerShown: false,
                            }}
                        />
                        <RootStack.Screen
                            name="Help"
                            component={HelpScreen}
                            options={{
                                headerShown: true,
                                headerTitle: t('help'),
                                headerStyle: {
                                    backgroundColor: COLORS.primary,
                                },
                                headerTitleStyle: {
                                    color: COLORS.white,
                                    ...FONTS.h3,
                                },
                                headerTitleAlign: 'center',
                                headerTintColor: COLORS.white,
                            }}
                        />
                        <RootStack.Screen
                            name="About"
                            component={AboutScreen}
                            options={{
                                headerShown: true,
                                headerTitle: t('about'),
                                headerStyle: {
                                    backgroundColor: COLORS.primary,
                                },
                                headerTitleStyle: {
                                    color: COLORS.white,
                                    ...FONTS.h3,
                                },
                                headerTitleAlign: 'center',
                                headerTintColor: COLORS.white,
                            }}
                        />
                        <RootStack.Screen
                            name="ChangePassword"
                            component={ChangePasswordScreen}
                            options={{
                                headerShown: true,
                                headerTitle: t('changePassword'),
                                headerStyle: {
                                    backgroundColor: COLORS.primary,
                                },
                                headerTitleStyle: {
                                    color: COLORS.white,
                                    ...FONTS.h3,
                                },
                                headerTitleAlign: 'center',
                                headerTintColor: COLORS.white,
                            }}
                        />
                        <RootStack.Screen
                            name="HelpCenter"
                            component={HelpCenterScreen}
                            options={{
                                headerShown: true,
                                headerTitle: t('helpCenter'),
                                headerStyle: {
                                    backgroundColor: COLORS.primary,
                                },
                                headerTitleStyle: {
                                    color: COLORS.white,
                                    ...FONTS.h3,
                                },
                                headerTitleAlign: 'center',
                                headerTintColor: COLORS.white,
                            }}
                        />
                        <RootStack.Screen
                            name="Preferences"
                            component={PreferencesScreen}
                            options={{
                                headerShown: true,
                                headerTitle: t('preferences'),
                                headerStyle: {
                                    backgroundColor: COLORS.primary,
                                },
                                headerTitleStyle: {
                                    color: COLORS.white,
                                    ...FONTS.h3,
                                },
                                headerTitleAlign: 'center',
                                headerTintColor: COLORS.white,
                            }}
                        />
                        <RootStack.Screen
                            name="Privacy"
                            component={PrivacyScreen}
                            options={{
                                headerShown: true,
                                headerTitle: t('privacy'),
                                headerStyle: {
                                    backgroundColor: COLORS.primary,
                                },
                                headerTitleStyle: {
                                    color: COLORS.white,
                                    ...FONTS.h3,
                                },
                                headerTitleAlign: 'center',
                                headerTintColor: COLORS.white,
                            }}
                        />
                        <RootStack.Screen
                            name="Profile"
                            component={ProfileScreen}
                            options={{
                                headerShown: true,
                                headerTitle: t('profile'),
                                headerStyle: {
                                    backgroundColor: COLORS.primary,
                                },
                                headerTitleStyle: {
                                    color: COLORS.white,
                                    ...FONTS.h3,
                                },
                                headerTitleAlign: 'center',
                                headerTintColor: COLORS.white,
                            }}
                        />
                        <RootStack.Screen
                            name="Onboarding"
                            component={OnboardingScreen}
                            options={{
                                headerShown: false,
                            }}
                        />
                    </>
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
    },
    loadingText: {
        ...FONTS.body3,
        color: COLORS.primary,
        marginTop: 10,
    },
});

export default Navigation; 