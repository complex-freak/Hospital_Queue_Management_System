import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    Platform,
    Alert,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface HealthDataType {
    id: string;
    name: string;
    icon: string;
    isEnabled: boolean;
    description: string;
    permissionType: string;
}

const HealthAppIntegrationScreen: React.FC = () => {
    const [healthPlatform, setHealthPlatform] = useState<'apple' | 'google' | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [availableDataTypes, setAvailableDataTypes] = useState<HealthDataType[]>([]);

    useEffect(() => {
        // Determine platform
        if (Platform.OS === 'ios') {
            setHealthPlatform('apple');
        } else if (Platform.OS === 'android') {
            setHealthPlatform('google');
        }

        // Check if already connected
        checkConnectionStatus();

        // Load saved data type preferences
        loadDataTypePreferences();
    }, []);

    // Check if app is already connected to health platform
    const checkConnectionStatus = async () => {
        try {
            const status = await AsyncStorage.getItem('healthAppConnected');
            setIsConnected(status === 'true');
        } catch (error) {
            console.error('Error checking connection status:', error);
        }
    };

    // Load data type preferences from storage
    const loadDataTypePreferences = async () => {
        try {
            const savedTypes = await AsyncStorage.getItem('healthDataTypes');

            if (savedTypes) {
                setAvailableDataTypes(JSON.parse(savedTypes));
            } else {
                // Initialize default data types
                const defaultTypes: HealthDataType[] = [
                    {
                        id: 'steps',
                        name: 'Daily Steps',
                        icon: 'footsteps-outline',
                        isEnabled: true,
                        description: 'Track your daily step count',
                        permissionType: 'read',
                    },
                    {
                        id: 'heart_rate',
                        name: 'Heart Rate',
                        icon: 'heart-outline',
                        isEnabled: true,
                        description: 'Monitor your heart rate',
                        permissionType: 'read',
                    },
                    {
                        id: 'blood_pressure',
                        name: 'Blood Pressure',
                        icon: 'pulse-outline',
                        isEnabled: true,
                        description: 'Record your blood pressure readings',
                        permissionType: 'read',
                    },
                    {
                        id: 'sleep',
                        name: 'Sleep Analysis',
                        icon: 'bed-outline',
                        isEnabled: false,
                        description: 'Track your sleep patterns',
                        permissionType: 'read',
                    },
                    {
                        id: 'weight',
                        name: 'Weight',
                        icon: 'speedometer-outline',
                        isEnabled: true,
                        description: 'Monitor your weight changes',
                        permissionType: 'read',
                    },
                    {
                        id: 'activity',
                        name: 'Physical Activity',
                        icon: 'fitness-outline',
                        isEnabled: false,
                        description: 'Track your workouts and activities',
                        permissionType: 'read',
                    },
                    {
                        id: 'glucose',
                        name: 'Blood Glucose',
                        icon: 'water-outline',
                        isEnabled: true,
                        description: 'Monitor your blood glucose levels',
                        permissionType: 'read',
                    },
                ];

                setAvailableDataTypes(defaultTypes);
            }
        } catch (error) {
            console.error('Error loading data type preferences:', error);
        }
    };

    // Toggle data type enabled status
    const toggleDataType = async (id: string) => {
        const updatedTypes = availableDataTypes.map(type => {
            if (type.id === id) {
                return { ...type, isEnabled: !type.isEnabled };
            }
            return type;
        });

        setAvailableDataTypes(updatedTypes);

        // Save updated preferences
        try {
            await AsyncStorage.setItem('healthDataTypes', JSON.stringify(updatedTypes));
        } catch (error) {
            console.error('Error saving data type preferences:', error);
        }
    };

    // Connect to the health platform
    const connectToHealthApp = async () => {
        // In a real app, this would use the appropriate health kit SDK for the platform

        // Mock connection process with loading state and success
        Alert.alert(
            'Connecting...',
            `This would connect to ${healthPlatform === 'apple' ? 'Apple Health' : 'Google Fit'} using the proper SDK in a production app.`
        );

        // Simulate connection process
        setTimeout(() => {
            setIsConnected(true);
            AsyncStorage.setItem('healthAppConnected', 'true');

            Alert.alert(
                'Connection Successful',
                `Your account is now connected to ${healthPlatform === 'apple' ? 'Apple Health' : 'Google Fit'}.`,
                [{ text: 'OK' }]
            );
        }, 1500);
    };

    // Disconnect from the health platform
    const disconnectFromHealthApp = () => {
        Alert.alert(
            'Disconnect Health App',
            `Are you sure you want to disconnect from ${healthPlatform === 'apple' ? 'Apple Health' : 'Google Fit'}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        // In a real app, this would revoke permissions from the health platform
                        setIsConnected(false);
                        await AsyncStorage.setItem('healthAppConnected', 'false');
                    }
                }
            ]
        );
    };

    // Sync health data manually
    const syncHealthData = () => {
        Alert.alert(
            'Syncing Data',
            'Syncing your health data...'
        );

        // Simulate sync process
        setTimeout(() => {
            Alert.alert(
                'Sync Complete',
                'Your health data has been synchronized successfully.',
                [{ text: 'OK' }]
            );
        }, 2000);
    };

    // Render platform-specific information
    const renderPlatformInfo = () => {
        if (healthPlatform === 'apple') {
            return (
                <View style={styles.platformInfoContainer}>
                    <Image
                        source={{ uri: 'https://developer.apple.com/assets/elements/icons/healthkit/healthkit-96x96.png' }}
                        style={styles.platformLogo}
                    />
                    <Text style={styles.platformTitle}>Apple Health Integration</Text>
                    <Text style={styles.platformDescription}>
                        Connect with Apple Health to automatically sync your health data between apps,
                        ensuring your cardiovascular risk assessment has the most accurate information.
                    </Text>
                </View>
            );
        } else if (healthPlatform === 'google') {
            return (
                <View style={styles.platformInfoContainer}>
                    <Image
                        source={{ uri: 'https://www.gstatic.com/images/branding/product/2x/google_fit_96dp.png' }}
                        style={styles.platformLogo}
                    />
                    <Text style={styles.platformTitle}>Google Fit Integration</Text>
                    <Text style={styles.platformDescription}>
                        Connect with Google Fit to automatically sync your health data between apps,
                        ensuring your cardiovascular risk assessment has the most accurate information.
                    </Text>
                </View>
            );
        } else {
            return (
                <View style={styles.platformInfoContainer}>
                    <Text style={styles.platformTitle}>Health App Integration</Text>
                    <Text style={styles.platformDescription}>
                        Your device is not compatible with health data integration services.
                    </Text>
                </View>
            );
        }
    };

    // Render data type items
    const renderDataTypeItems = () => {
        return availableDataTypes.map((item) => (
            <View key={item.id} style={styles.dataTypeItem}>
                <View style={styles.dataTypeIconContainer}>
                    <Ionicons name={item.icon as any} size={24} color="#2684FF" />
                </View>
                <View style={styles.dataTypeInfo}>
                    <Text style={styles.dataTypeName}>{item.name}</Text>
                    <Text style={styles.dataTypeDescription}>{item.description}</Text>
                    <Text style={styles.dataTypePermission}>
                        {item.permissionType === 'read' ? 'Read Only' : 'Read & Write'}
                    </Text>
                </View>
                <Switch
                    value={item.isEnabled}
                    onValueChange={() => toggleDataType(item.id)}
                    trackColor={{ false: '#DFE1E6', true: '#DEEBFF' }}
                    thumbColor={item.isEnabled ? '#2684FF' : '#97A0AF'}
                    disabled={!isConnected}
                />
            </View>
        ));
    };

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
            <Text style={styles.title}>Health App Integration</Text>
            <Text style={styles.subtitle}>
                Connect with {healthPlatform === 'apple' ? 'Apple Health' : 'Google Fit'} to automatically sync your health data
            </Text>

            {renderPlatformInfo()}

            <View style={styles.connectionContainer}>
                <View style={styles.connectionStatus}>
                    <View style={[styles.statusIndicator, isConnected ? styles.connected : styles.disconnected]} />
                    <Text style={styles.connectionStatusText}>
                        {isConnected
                            ? `Connected to ${healthPlatform === 'apple' ? 'Apple Health' : 'Google Fit'}`
                            : `Not connected to ${healthPlatform === 'apple' ? 'Apple Health' : 'Google Fit'}`
                        }
                    </Text>
                </View>

                {isConnected ? (
                    <View style={styles.connectedActions}>
                        <TouchableOpacity
                            style={styles.syncButton}
                            onPress={syncHealthData}
                        >
                            <Ionicons name="sync" size={18} color="#FFFFFF" />
                            <Text style={styles.buttonText}>Sync Now</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.disconnectButton}
                            onPress={disconnectFromHealthApp}
                        >
                            <Text style={styles.disconnectText}>Disconnect</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.connectButton}
                        onPress={connectToHealthApp}
                    >
                        <Text style={styles.buttonText}>
                            Connect to {healthPlatform === 'apple' ? 'Apple Health' : 'Google Fit'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.dataTypesContainer}>
                <Text style={styles.sectionTitle}>Health Data Access</Text>
                <Text style={styles.sectionDescription}>
                    Select which health data types you'd like to sync with your cardiovascular assessment
                </Text>

                {renderDataTypeItems()}

                <View style={styles.infoContainer}>
                    <Ionicons name="information-circle-outline" size={20} color="#5E6C84" />
                    <Text style={styles.infoText}>
                        You can change these permissions at any time in the {healthPlatform === 'apple' ? 'Apple Health' : 'Google Fit'} app settings
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    contentContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#091E42',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#5E6C84',
        marginBottom: 24,
    },
    platformInfoContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 20,
        marginBottom: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    platformLogo: {
        width: 64,
        height: 64,
        marginBottom: 16,
    },
    platformTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 8,
    },
    platformDescription: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
        lineHeight: 20,
    },
    connectionContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    connectionStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    statusIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    connected: {
        backgroundColor: '#36B37E',
    },
    disconnected: {
        backgroundColor: '#FF5630',
    },
    connectionStatusText: {
        fontSize: 16,
        color: '#091E42',
        fontWeight: '500',
    },
    connectButton: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    connectedActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    syncButton: {
        backgroundColor: '#2684FF',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        marginRight: 8,
    },
    disconnectButton: {
        borderWidth: 1,
        borderColor: '#DFE1E6',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disconnectText: {
        color: '#FF5630',
        fontSize: 16,
        fontWeight: '500',
    },
    dataTypesContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginBottom: 8,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 16,
        lineHeight: 20,
    },
    dataTypeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F4F5F7',
    },
    dataTypeIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#DEEBFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    dataTypeInfo: {
        flex: 1,
    },
    dataTypeName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#091E42',
        marginBottom: 2,
    },
    dataTypeDescription: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 2,
    },
    dataTypePermission: {
        fontSize: 12,
        color: '#97A0AF',
    },
    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 16,
        padding: 12,
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
    },
    infoText: {
        fontSize: 12,
        color: '#5E6C84',
        marginLeft: 8,
        flex: 1,
        lineHeight: 18,
    },
});

export default HealthAppIntegrationScreen; 