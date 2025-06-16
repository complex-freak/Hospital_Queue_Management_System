import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, FONTS } from '../constants/theme';

// Import screens
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import QueueStatusScreen from '../screens/QueueStatusScreen';
import AppointmentScreen from '../screens/AppointmentScreen';
import AppointmentsScreen from '../screens/AppointmentsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import HelpScreen from '../screens/HelpScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

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
    MainTabs: { screen?: keyof MainTabParamList };
    Appointment: undefined;
    Appointments: undefined;
    Help: undefined;
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

// Root Navigator
const Navigation = () => {
    const { t } = useTranslation();
    const { state } = useAuth();
    const { user, loading } = state;

    // Show loading screen while checking auth status
    if (loading) {
        return <Text>{t('loading')}</Text>;
    }

    return (
        <NavigationContainer>
            <RootStack.Navigator
                screenOptions={{
                    headerShown: false,
                }}
            >
                {user ? (
                    // User is signed in
                    <>
                        <RootStack.Screen name="MainTabs" component={MainTabNavigator} />
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
                    </>
                ) : (
                    // User is not signed in
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

export default Navigation; 