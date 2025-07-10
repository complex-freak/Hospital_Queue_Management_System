import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from './HomeScreen';
import HealthDataScreen from './HealthDataScreen';
import ReportsScreen from './ReportsScreen';
import ProfileScreen from './ProfileScreen';
import MessagingListScreen, { ConversationScreen } from './MessagingScreen';
import NotificationsScreen from './NotificationsScreen';
import PDFViewerScreen from './PDFViewerScreen';
import ReportDetailScreen from './ReportDetailScreen';
import ReportSettingsScreen from './ReportSettingsScreen';
import RiskVisualizationScreen from './RiskVisualizationScreen';
import RiskFactorDetailScreen from './RiskFactorDetailScreen';
import RecommendationsScreen from './RecommendationsScreen';
import AppointmentsScreen from './AppointmentsScreen';
import ClinicianRecommendationsScreen from './ClinicianRecommendationsScreen';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Main tab navigator
const AppTabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Health') {
                        iconName = focused ? 'heart' : 'heart-outline';
                    } else if (route.name === 'Reports') {
                        iconName = focused ? 'document-text' : 'document-text-outline';
                    } else if (route.name === 'Messages') {
                        iconName = focused ? 'chatbubble-ellipses' : 'chatbubble-ellipses-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    // Return the appropriate icon component
                    return <Ionicons name={iconName as any} size={size} color={color} />;
                },
                tabBarActiveTintColor: '#2684FF',
                tabBarInactiveTintColor: '#5E6C84',
                headerShown: false,
            })}
        >
            <Tab.Screen name="Home" component={HomeScreen} />
            <Tab.Screen name="Health" component={HealthDataScreen} />
            <Tab.Screen name="Reports" component={ReportsScreen} />
            <Tab.Screen name="Messages" component={MessagingStack} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

// Messaging stack navigator
const MessagingStack = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="MessagingList"
                component={MessagingListScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="ConversationScreen"
                component={ConversationScreen}
                options={{ title: 'Conversation' }}
            />
        </Stack.Navigator>
    );
};

// Main app navigator
const AppNavigator = () => {
    return (
        <Stack.Navigator>
            <Stack.Screen
                name="MainTabs"
                component={AppTabNavigator}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="Notifications"
                component={NotificationsScreen}
                options={{ title: 'Notifications' }}
            />
            <Stack.Screen
                name="PDFViewer"
                component={PDFViewerScreen}
                options={{ title: 'View Report' }}
            />
            <Stack.Screen
                name="ReportDetail"
                component={ReportDetailScreen}
                options={{ title: 'Report Details' }}
            />
            <Stack.Screen
                name="ReportSettings"
                component={ReportSettingsScreen}
                options={{ title: 'Report Settings' }}
            />
            <Stack.Screen
                name="RiskVisualization"
                component={RiskVisualizationScreen}
                options={{ title: 'Risk Visualization' }}
            />
            <Stack.Screen
                name="RiskFactorDetail"
                component={RiskFactorDetailScreen}
                options={{ title: 'Risk Factor Detail' }}
            />
            <Stack.Screen
                name="Recommendations"
                component={RecommendationsScreen}
                options={{ title: 'Recommendations' }}
            />
            <Stack.Screen
                name="Appointments"
                component={AppointmentsScreen}
                options={{ title: 'My Appointments' }}
            />
            <Stack.Screen
                name="ClinicianRecommendations"
                component={ClinicianRecommendationsScreen}
                options={{ title: 'Clinician Recommendations' }}
            />
        </Stack.Navigator>
    );
};

export default AppNavigator; 