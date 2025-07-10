import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegistrationScreen from '../screens/auth/RegistrationScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';

// Main app screens
import HomeScreen from '../screens/app/HomeScreen';
import ProfileScreen from '../screens/app/ProfileScreen';
import HealthDataScreen from '../screens/app/HealthDataScreen';
import NotificationsScreen from '../screens/app/NotificationsScreen';
import ReportsScreen from '../screens/app/ReportsScreen';
import ReportDetailScreen from '../screens/app/ReportDetailScreen';
import PDFViewerScreen from '../screens/app/PDFViewerScreen';
import ReportSettingsScreen from '../screens/app/ReportSettingsScreen';
import AppointmentsScreen from '../screens/app/AppointmentsScreen';
import ClinicianRecommendationsScreen from '../screens/app/ClinicianRecommendationsScreen';
import RiskVisualizationScreen from '../screens/app/RiskVisualizationScreen';
import RiskSettingsScreen from '../screens/app/RiskSettingsScreen';
import RiskFactorDetailScreen from '../screens/app/RiskFactorDetailScreen';
import MessagingScreen from '../screens/app/MessagingScreen';
import RecommendationsScreen from '../screens/app/RecommendationsScreen';
import AppointmentDetailScreen from '../screens/app/AppointmentDetailScreen';

// Import local auth service
import authService from '../services/authService';

// Create a single stack navigator for the entire app
const RootStack = createStackNavigator();
const TabNavigator = createBottomTabNavigator();

// Bottom Tab Navigator for main app
const MainTabs = () => {
    return (
        <TabNavigator.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'HomeTab') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'HealthDataTab') {
                        iconName = focused ? 'heart' : 'heart-outline';
                    } else if (route.name === 'ReportsTab') {
                        iconName = focused ? 'document-text' : 'document-text-outline';
                    } else if (route.name === 'NotificationsTab') {
                        iconName = focused ? 'notifications' : 'notifications-outline';
                    } else if (route.name === 'ProfileTab') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName as any} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#2684FF',
                tabBarInactiveTintColor: '#5E6C84',
            })}
        >
            <TabNavigator.Screen
                name="HomeTab"
                component={HomeScreen}
                options={{
                    title: 'Dashboard',
                    headerShown: false,
                }}
            />
            <TabNavigator.Screen
                name="HealthDataTab"
                component={HealthDataScreen}
                options={{
                    title: 'Health Data',
                    headerShown: false,
                }}
            />
            <TabNavigator.Screen
                name="ReportsTab"
                component={ReportsScreen}
                options={{
                    title: 'My Reports',
                    headerShown: false,
                }}
            />
            <TabNavigator.Screen
                name="NotificationsTab"
                component={NotificationsScreen}
                options={{
                    title: 'Notifications',
                    headerShown: false,
                }}
            />
            <TabNavigator.Screen
                name="ProfileTab"
                component={ProfileScreen}
                options={{
                    title: 'My Profile',
                    headerShown: false,
                }}
            />
        </TabNavigator.Navigator>
    );
};

// Root App Navigator
const AppNavigator = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    // Function to check auth status
        const checkAuthStatus = async () => {
            try {
                const isAuth = await authService.isAuthenticated();
                setIsAuthenticated(isAuth);
            } catch (error) {
                setIsAuthenticated(false);
                console.error('Error checking auth status:', error);
            }
        };

    useEffect(() => {
        // Check authentication status on component mount
        checkAuthStatus();

        // Set up an interval to periodically check auth status
        // This ensures the UI updates when login/logout happens
        const authCheckInterval = setInterval(() => {
            checkAuthStatus();
        }, 2000); // Check every 2 seconds

        return () => {
            // Clean up interval on unmount
            clearInterval(authCheckInterval);
        };
    }, []);

    // Show loading indicator while checking auth status
    if (isAuthenticated === null) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <StatusBar style="auto" />
            <RootStack.Navigator>
                {isAuthenticated ? (
                    // Main App Screens
                    <>
                        <RootStack.Screen 
                            name="MainTabs" 
                            component={MainTabs} 
                            options={{ headerShown: false }}
                        />
                        <RootStack.Screen
                            name="ReportDetail"
                            component={ReportDetailScreen}
                            options={{
                                title: 'Report Details',
                                headerBackTitle: '',
                            }}
                        />
                        <RootStack.Screen
                            name="PDFViewer"
                            component={PDFViewerScreen}
                            options={{
                                title: 'View Report',
                                headerBackTitle: '',
                            }}
                        />
                        <RootStack.Screen
                            name="ReportSettings"
                            component={ReportSettingsScreen}
                            options={{
                                title: 'Report Settings',
                                headerBackTitle: '',
                            }}
                        />
                        <RootStack.Screen
                            name="Appointments"
                            component={AppointmentsScreen}
                            options={{
                                title: 'Appointments',
                                headerBackTitle: '',
                                headerShown: false
                            }}
                        />
                        <RootStack.Screen
                            name="AppointmentDetail"
                            component={AppointmentDetailScreen}
                            options={{
                                title: 'Appointment Details',
                                headerBackTitle: '',
                            }}
                        />
                        <RootStack.Screen
                            name="ClinicianRecommendations"
                            component={ClinicianRecommendationsScreen}
                            options={{
                                title: 'Clinician Recommendations',
                                headerBackTitle: '',
                                headerShown: false
                            }}
                        />
                        <RootStack.Screen
                            name="Health"
                            component={HealthDataScreen}
                            options={{
                                title: 'Health Data',
                                headerBackTitle: '',
                                headerShown: false
                            }}
                        />
                        <RootStack.Screen
                            name="RiskVisualization"
                            component={RiskVisualizationScreen}
                            options={{
                                title: 'Risk Assessment',
                                headerBackTitle: '',
                            }}
                        />
                        <RootStack.Screen
                            name="RiskSettings"
                            component={RiskSettingsScreen}
                            options={{
                                title: 'Risk Assessment Settings',
                                headerBackTitle: '',
                            }}
                        />
                        <RootStack.Screen
                            name="RiskFactorDetail"
                            component={RiskFactorDetailScreen}
                            options={{
                                title: 'Risk Factor Details',
                                headerBackTitle: '',
                            }}
                        />
                        <RootStack.Screen
                            name="Recommendations"
                            component={RecommendationsScreen}
                            options={{
                                title: 'Recommendations',
                                headerBackTitle: '',
                            }}
                        />
                        <RootStack.Screen
                            name="Messages"
                            component={MessagingScreen}
                            options={{
                                title: 'Messages',
                                headerBackTitle: '',
                                headerShown: false
                            }}
                        />
                    </>
                ) : (
                    // Auth Screens
                    <>
                        <RootStack.Screen 
                            name="Login" 
                            component={LoginScreen} 
                            options={{ headerShown: false }}
                        />
                        <RootStack.Screen 
                            name="Registration" 
                            component={RegistrationScreen} 
                            options={{ headerShown: false }}
                        />
                        <RootStack.Screen 
                            name="ForgotPassword" 
                            component={ForgotPasswordScreen} 
                            options={{ headerShown: false }}
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
        backgroundColor: '#F4F5F7',
    },
});

export default AppNavigator; 