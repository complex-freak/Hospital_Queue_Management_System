import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    SafeAreaView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createStackNavigator } from '@react-navigation/stack';
import { RouteProp, useNavigation } from '@react-navigation/native';

// Import screens that we'll create
import HealthInputFormScreen from './health/HealthInputFormScreen';
import HealthTrackingDashboardScreen from './health/HealthTrackingDashboardScreen';
import DocumentScannerScreen from './health/DocumentScannerScreen';
import HealthAppIntegrationScreen from './health/HealthAppIntegrationScreen';

const Stack = createStackNavigator();

// Main menu for health data options
const HealthDataMenuScreen = () => {
    const navigation = useNavigation();

    const menuItems = [
        {
            title: 'Input Health Data',
            description: 'Record your vital signs, symptoms, and health metrics',
            icon: 'create-outline',
            route: 'HealthInputForm'
        },
        {
            title: 'Health Tracking Dashboard',
            description: 'View your health trends and daily reminders',
            icon: 'pulse-outline',
            route: 'HealthTrackingDashboard'
        },
        {
            title: 'Scan Medical Documents',
            description: 'Use camera to scan and upload medical reports',
            icon: 'camera-outline',
            route: 'DocumentScanner'
        },
        {
            title: 'Health App Integration',
            description: 'Connect with Apple Health or Google Fit',
            icon: 'sync-outline',
            route: 'HealthAppIntegration'
        }
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Health Data</Text>
                    <Text style={styles.subtitle}>
                        Track and manage your health information
                    </Text>
                </View>
                {/* <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => navigation.navigate('Notifications' as never)}
                >
                    <Ionicons name="notifications" size={24} color="#2684FF" />
                </TouchableOpacity> */}
            </View>

            <ScrollView 
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {menuItems.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.menuItem}
                        onPress={() => navigation.navigate(item.route as never)}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name={item.icon as any} size={24} color="#2684FF" />
                        </View>
                        <View style={styles.menuTextContainer}>
                            <Text style={styles.menuTitle}>{item.title}</Text>
                            <Text style={styles.menuDescription}>{item.description}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#97A0AF" />
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

// Root navigator for health data section
const HealthDataScreen = () => {
    return (
        <Stack.Navigator initialRouteName="HealthDataMenu">
            <Stack.Screen
                name="HealthDataMenu"
                component={HealthDataMenuScreen}
                options={{ headerShown: false }}
            />
            <Stack.Screen
                name="HealthInputForm"
                component={HealthInputFormScreen}
                options={{ title: 'Input Health Data' }}
            />
            <Stack.Screen
                name="HealthTrackingDashboard"
                component={HealthTrackingDashboardScreen}
                options={{ title: 'Health Dashboard' }}
            />
            <Stack.Screen
                name="DocumentScanner"
                component={DocumentScannerScreen}
                options={{ title: 'Scan Documents' }}
            />
            <Stack.Screen
                name="HealthAppIntegration"
                component={HealthAppIntegrationScreen}
                options={{ title: 'Connect Health Apps' }}
            />
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 70,
        paddingBottom: 20,
        backgroundColor: '#FFFFFF',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
    },
    subtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginTop: 4,
    },
    notificationButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F4F5F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DEEBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 4,
    },
    menuDescription: {
        fontSize: 14,
        color: '#5E6C84',
    },
});

export default HealthDataScreen; 