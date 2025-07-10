import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Switch,
    Alert
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import healthAlertService, { 
    HealthAlert, 
    AlertType, 
    AlertStatus, 
    AlertCategory,
    NotificationSettings
} from '../../services/healthAlertService';

type HealthAlertsScreenNavigationProp = StackNavigationProp<any, 'HealthAlerts'>;

const HealthAlertsScreen: React.FC = () => {
    const navigation = useNavigation<HealthAlertsScreenNavigationProp>();
    const [alerts, setAlerts] = useState<HealthAlert[]>([]);
    const [filteredAlerts, setFilteredAlerts] = useState<HealthAlert[]>([]);
    const [settings, setSettings] = useState<NotificationSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [activeFilters, setActiveFilters] = useState({
        critical: true,
        warning: true,
        reminder: true,
        info: true,
        unread: false
    });

    // Load alerts and settings on component mount
    useEffect(() => {
        loadAlertsAndSettings();
    }, []);

    // Apply filters whenever alerts or filters change
    useEffect(() => {
        applyFilters();
    }, [alerts, activeFilters]);

    // Load alerts and settings
    const loadAlertsAndSettings = async (showRefreshing = false) => {
        if (showRefreshing) setRefreshing(true);
        else setIsLoading(true);

        try {
            // Initialize health alerts system if needed
            await healthAlertService.initializeHealthAlerts();
            
            // Load alerts
            const storedAlerts = await healthAlertService.getAlerts();
            setAlerts(storedAlerts);
            
            // Load notification settings
            const notificationSettings = await healthAlertService.getNotificationSettings();
            setSettings(notificationSettings);
            
            // Check for new alerts
            await healthAlertService.checkForNewAlerts();
            
            // Reload alerts after check
            const updatedAlerts = await healthAlertService.getAlerts();
            setAlerts(updatedAlerts);
        } catch (error) {
            console.error('Error loading health alerts:', error);
            Alert.alert('Error', 'Failed to load health alerts. Please try again.');
        } finally {
            setIsLoading(false);
            if (showRefreshing) setRefreshing(false);
        }
    };

    // Handle refresh
    const onRefresh = () => {
        loadAlertsAndSettings(true);
    };

    // Apply filters to alerts
    const applyFilters = () => {
        const filtered = alerts.filter(alert => {
            // Filter by alert type
            if (alert.type === AlertType.CRITICAL && !activeFilters.critical) return false;
            if (alert.type === AlertType.WARNING && !activeFilters.warning) return false;
            if (alert.type === AlertType.REMINDER && !activeFilters.reminder) return false;
            if (alert.type === AlertType.INFO && !activeFilters.info) return false;
            
            // Filter by read status if unread filter is active
            if (activeFilters.unread && alert.status !== AlertStatus.UNREAD) return false;
            
            return true;
        });
        
        // Sort by newest first
        filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        setFilteredAlerts(filtered);
    };

    // Toggle filter
    const toggleFilter = (filter: keyof typeof activeFilters) => {
        setActiveFilters(prev => ({
            ...prev,
            [filter]: !prev[filter]
        }));
    };

    // Handle alert action
    const handleAlertAction = async (alert: HealthAlert) => {
        // Mark as read first
        await healthAlertService.updateAlertStatus(alert.id, AlertStatus.READ);
        
        // Update local state
        setAlerts(prev => 
            prev.map(a => a.id === alert.id ? { ...a, status: AlertStatus.READ } : a)
        );
        
        // Handle the specific action based on alert data
        if (alert.actionable && alert.actionRoute) {
            if (alert.actionRoute === 'RiskFactorDetail' && alert.riskFactorId) {
                navigation.navigate('RiskFactorDetail', { 
                    factorId: alert.riskFactorId,
                    ...alert.actionParams
                });
            } else {
                // Generic navigation with parameters
                navigation.navigate(alert.actionRoute as any, alert.actionParams || {});
            }
        }
    };

    // Dismiss alert
    const dismissAlert = async (alert: HealthAlert) => {
        Alert.alert(
            'Dismiss Alert',
            'Are you sure you want to dismiss this alert?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Dismiss', 
                    onPress: async () => {
                        await healthAlertService.updateAlertStatus(alert.id, AlertStatus.DISMISSED);
                        
                        // Update local state
                        setAlerts(prev => 
                            prev.map(a => a.id === alert.id ? { ...a, status: AlertStatus.DISMISSED } : a)
                        );
                    },
                    style: 'destructive'
                }
            ]
        );
    };

    // Update notification settings
    const updateSettings = async (changedSettings: Partial<NotificationSettings>) => {
        if (!settings) return;
        
        const newSettings = { ...settings, ...changedSettings };
        setSettings(newSettings);
        
        try {
            await healthAlertService.updateNotificationSettings(newSettings);
        } catch (error) {
            console.error('Error updating notification settings:', error);
            Alert.alert('Error', 'Failed to update notification settings.');
        }
    };

    // Format date for display
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.round(diffMs / 60000);
        const diffHours = Math.round(diffMs / 3600000);
        const diffDays = Math.round(diffMs / 86400000);

        if (diffMins < 60) {
            return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
        } else if (diffHours < 24) {
            return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
        } else if (diffDays < 7) {
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        } else {
            return date.toLocaleDateString();
        }
    };

    // Render filter pills
    const renderFilterPills = () => (
        <View style={styles.filterContainer}>
            <TouchableOpacity 
                style={[
                    styles.filterPill, 
                    activeFilters.critical ? styles.filterPillActive : {}
                ]}
                onPress={() => toggleFilter('critical')}
            >
                <View style={[styles.filterIndicator, styles.criticalIndicator]} />
                <Text style={activeFilters.critical ? styles.filterTextActive : styles.filterText}>Critical</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[
                    styles.filterPill, 
                    activeFilters.warning ? styles.filterPillActive : {}
                ]}
                onPress={() => toggleFilter('warning')}
            >
                <View style={[styles.filterIndicator, styles.warningIndicator]} />
                <Text style={activeFilters.warning ? styles.filterTextActive : styles.filterText}>Warning</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[
                    styles.filterPill, 
                    activeFilters.reminder ? styles.filterPillActive : {}
                ]}
                onPress={() => toggleFilter('reminder')}
            >
                <View style={[styles.filterIndicator, styles.reminderIndicator]} />
                <Text style={activeFilters.reminder ? styles.filterTextActive : styles.filterText}>Reminder</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[
                    styles.filterPill, 
                    activeFilters.info ? styles.filterPillActive : {}
                ]}
                onPress={() => toggleFilter('info')}
            >
                <View style={[styles.filterIndicator, styles.infoIndicator]} />
                <Text style={activeFilters.info ? styles.filterTextActive : styles.filterText}>Info</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={[
                    styles.filterPill, 
                    activeFilters.unread ? styles.filterPillActive : {}
                ]}
                onPress={() => toggleFilter('unread')}
            >
                <Ionicons name="mail-unread" size={12} color={activeFilters.unread ? "#FFFFFF" : "#5E6C84"} />
                <Text style={activeFilters.unread ? styles.filterTextActive : styles.filterText}>Unread</Text>
            </TouchableOpacity>
        </View>
    );

    // Render settings section
    const renderSettingsSection = () => (
        <View style={styles.settingsContainer}>
            <Text style={styles.sectionTitle}>Alert Settings</Text>
            
            {settings && (
                <>
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <Text style={styles.settingLabel}>Enable Health Alerts</Text>
                            <Text style={styles.settingDescription}>
                                Receive important health alerts and reminders
                            </Text>
                        </View>
                        <Switch
                            value={settings.enabled}
                            onValueChange={(value) => updateSettings({ enabled: value })}
                            trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                            thumbColor={settings.enabled ? '#2684FF' : '#F4F5F7'}
                        />
                    </View>
                    
                    <View style={styles.divider} />
                    
                    <Text style={styles.settingGroupTitle}>Alert Types</Text>
                    
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <View style={styles.labelWithIndicator}>
                                <View style={[styles.filterIndicator, styles.criticalIndicator]} />
                                <Text style={styles.settingLabel}>Critical Alerts</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                Urgent notifications requiring immediate attention
                            </Text>
                        </View>
                        <Switch
                            value={settings.criticalAlertsEnabled}
                            onValueChange={(value) => updateSettings({ criticalAlertsEnabled: value })}
                            trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                            thumbColor={settings.criticalAlertsEnabled ? '#2684FF' : '#F4F5F7'}
                        />
                    </View>
                    
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <View style={styles.labelWithIndicator}>
                                <View style={[styles.filterIndicator, styles.warningIndicator]} />
                                <Text style={styles.settingLabel}>Warning Alerts</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                Important health warnings and cautions
                            </Text>
                        </View>
                        <Switch
                            value={settings.warningsEnabled}
                            onValueChange={(value) => updateSettings({ warningsEnabled: value })}
                            trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                            thumbColor={settings.warningsEnabled ? '#2684FF' : '#F4F5F7'}
                        />
                    </View>
                    
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <View style={styles.labelWithIndicator}>
                                <View style={[styles.filterIndicator, styles.reminderIndicator]} />
                                <Text style={styles.settingLabel}>Reminders</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                Helpful reminders for appointments, medications, etc.
                            </Text>
                        </View>
                        <Switch
                            value={settings.remindersEnabled}
                            onValueChange={(value) => updateSettings({ remindersEnabled: value })}
                            trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                            thumbColor={settings.remindersEnabled ? '#2684FF' : '#F4F5F7'}
                        />
                    </View>
                    
                    <View style={styles.settingRow}>
                        <View style={styles.settingInfo}>
                            <View style={styles.labelWithIndicator}>
                                <View style={[styles.filterIndicator, styles.infoIndicator]} />
                                <Text style={styles.settingLabel}>Informational Alerts</Text>
                            </View>
                            <Text style={styles.settingDescription}>
                                General health information and updates
                            </Text>
                        </View>
                        <Switch
                            value={settings.infoEnabled}
                            onValueChange={(value) => updateSettings({ infoEnabled: value })}
                            trackColor={{ false: '#DFE1E6', true: '#B3D4FF' }}
                            thumbColor={settings.infoEnabled ? '#2684FF' : '#F4F5F7'}
                        />
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.allSettingsButton}
                        onPress={() => navigation.navigate('NotificationSettings' as any)}
                    >
                        <Text style={styles.allSettingsText}>View All Notification Settings</Text>
                        <Ionicons name="chevron-forward" size={16} color="#2684FF" />
                    </TouchableOpacity>
                </>
            )}
        </View>
    );

    // Render alert item
    const renderAlertItem = ({ item }: { item: HealthAlert }) => {
        // Define icon based on alert type
        let icon: string;
        let iconColor: string;
        
        switch (item.type) {
            case AlertType.CRITICAL:
                icon = "alert-circle";
                iconColor = "#FF5630";
                break;
            case AlertType.WARNING:
                icon = "warning";
                iconColor = "#FFAB00";
                break;
            case AlertType.REMINDER:
                icon = "calendar";
                iconColor = "#00B8D9";
                break;
            case AlertType.INFO:
            default:
                icon = "information-circle";
                iconColor = "#2684FF";
                break;
        }
        
        // Define category label
        const categoryLabel = item.category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        return (
            <TouchableOpacity 
                style={[
                    styles.alertCard,
                    item.status !== AlertStatus.UNREAD && styles.alertCardRead
                ]}
                onPress={() => handleAlertAction(item)}
            >
                <View style={styles.alertLeftSection}>
                    <View style={[
                        styles.alertIconContainer,
                        { backgroundColor: `${iconColor}20` }
                    ]}>
                        <Ionicons name={icon as any} size={24} color={iconColor} />
                    </View>
                </View>
                
                <View style={styles.alertMainContent}>
                    <View style={styles.alertHeader}>
                        <Text style={styles.alertTitle}>{item.title}</Text>
                        <TouchableOpacity 
                            style={styles.dismissButton}
                            onPress={() => dismissAlert(item)}
                        >
                            <Ionicons name="close" size={16} color="#5E6C84" />
                        </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.alertBody}>{item.body}</Text>
                    
                    <View style={styles.alertFooter}>
                        <View style={styles.categoryContainer}>
                            <Text style={styles.categoryText}>{categoryLabel}</Text>
                        </View>
                        <Text style={styles.timeText}>{formatDate(item.createdAt)}</Text>
                    </View>
                    
                    {item.actionable && (
                        <TouchableOpacity style={styles.actionButton} onPress={() => handleAlertAction(item)}>
                            <Text style={styles.actionButtonText}>{item.actionText || 'View Details'}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#2684FF" />
                        </TouchableOpacity>
                    )}
                </View>
                
                {item.status === AlertStatus.UNREAD && (
                    <View style={styles.unreadIndicator} />
                )}
            </TouchableOpacity>
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2684FF" />
                <Text style={styles.loadingText}>Loading health alerts...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={filteredAlerts}
                renderItem={renderAlertItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.contentContainer}
                ListHeaderComponent={
                    <>
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Health Alerts</Text>
                            <TouchableOpacity 
                                style={styles.settingsButton}
                                onPress={() => navigation.navigate('NotificationSettings' as any)}
                            >
                                <Ionicons name="settings-outline" size={24} color="#2684FF" />
                            </TouchableOpacity>
                        </View>
                        
                        {renderFilterPills()}
                        {renderSettingsSection()}
                        
                        <Text style={styles.sectionTitle}>
                            {filteredAlerts.length} {filteredAlerts.length === 1 ? 'Alert' : 'Alerts'}
                        </Text>
                    </>
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="notifications-off-outline" size={48} color="#97A0AF" />
                        <Text style={styles.emptyTitle}>No Alerts</Text>
                        <Text style={styles.emptyText}>
                            You don't have any health alerts at the moment
                        </Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={["#2684FF"]}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4F5F7',
    },
    contentContainer: {
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#091E42',
    },
    settingsButton: {
        padding: 4,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#091E42',
        marginVertical: 12,
    },
    filterContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    filterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingVertical: 6,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#DFE1E6',
    },
    filterPillActive: {
        backgroundColor: '#2684FF',
        borderColor: '#2684FF',
    },
    filterText: {
        fontSize: 14,
        color: '#5E6C84',
        marginLeft: 4,
    },
    filterTextActive: {
        fontSize: 14,
        color: '#FFFFFF',
        marginLeft: 4,
    },
    filterIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 4,
    },
    criticalIndicator: {
        backgroundColor: '#FF5630',
    },
    warningIndicator: {
        backgroundColor: '#FFAB00',
    },
    reminderIndicator: {
        backgroundColor: '#00B8D9',
    },
    infoIndicator: {
        backgroundColor: '#2684FF',
    },
    settingsContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
    },
    settingInfo: {
        flex: 1,
        marginRight: 16,
    },
    settingLabel: {
        fontSize: 16,
        color: '#091E42',
        marginBottom: 4,
    },
    settingDescription: {
        fontSize: 14,
        color: '#5E6C84',
    },
    settingGroupTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5E6C84',
        marginBottom: 8,
    },
    labelWithIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: '#DFE1E6',
        marginVertical: 8,
    },
    allSettingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginTop: 8,
    },
    allSettingsText: {
        color: '#2684FF',
        fontSize: 14,
        fontWeight: '500',
        marginRight: 4,
    },
    alertCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        marginBottom: 12,
        padding: 16,
        flexDirection: 'row',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    alertCardRead: {
        opacity: 0.7,
    },
    alertLeftSection: {
        marginRight: 12,
    },
    alertIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    alertMainContent: {
        flex: 1,
    },
    alertHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    alertTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#091E42',
        flex: 1,
        marginBottom: 4,
    },
    dismissButton: {
        padding: 4,
    },
    alertBody: {
        fontSize: 14,
        color: '#5E6C84',
        marginBottom: 12,
    },
    alertFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    categoryContainer: {
        backgroundColor: '#F4F5F7',
        borderRadius: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    categoryText: {
        fontSize: 12,
        color: '#5E6C84',
    },
    timeText: {
        fontSize: 12,
        color: '#97A0AF',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginTop: 8,
    },
    actionButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#2684FF',
        marginRight: 4,
    },
    unreadIndicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#2684FF',
        position: 'absolute',
        top: 16,
        right: 16,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#5E6C84',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#091E42',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#5E6C84',
        textAlign: 'center',
    },
});

export default HealthAlertsScreen; 