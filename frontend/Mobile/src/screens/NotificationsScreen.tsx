import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { COLORS, FONTS, SIZES } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { useNotifications } from '../context/NotificationsContext';
import { notificationService } from '../services';
import { Notification } from '../types';
import { useAuthenticatedAPI } from '../hooks/useAuthenticatedAPI';

type NotificationsScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const NotificationsScreen = () => {
    const { t } = useTranslation();
    const { colors } = useTheme();
    const navigation = useNavigation<NotificationsScreenNavigationProp>();
    const { state, fetchNotifications, markAsRead } = useNotifications();
    const { isAuthenticated, makeAuthenticatedRequest } = useAuthenticatedAPI();
    
    const [refreshing, setRefreshing] = useState(false);
    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
    const [selectionMode, setSelectionMode] = useState(false);

    // Format date for display
    const formatDate = (dateStr: string) => {
        try {
            return format(parseISO(dateStr), 'dd MMM yyyy, HH:mm');
        } catch {
            return dateStr;
        }
    };
    
    // Refresh notifications
    const handleRefresh = async () => {
        setRefreshing(true);
        
        if (!isAuthenticated) {
            console.log('Not authenticated, cannot refresh notifications');
            setRefreshing(false);
            return;
        }
        
        await makeAuthenticatedRequest(async () => {
            await fetchNotifications();
        }, () => {
            Alert.alert(
                t('authError'),
                t('pleaseLogInAgain'),
                [{ text: t('ok') }]
            );
        });
        
        setRefreshing(false);
    };
    
    // Mark a notification as read
    const handleMarkAsRead = async (notification: Notification) => {
        if (!notification.read) {
            try {
                if (!isAuthenticated) {
                    console.log('Not authenticated, cannot mark notification as read');
                    return;
                }
                
                await makeAuthenticatedRequest(async () => {
                    await markAsRead(notification.id);
                });
            } catch (error) {
                console.error('Error marking notification as read:', error);
            }
        }
    };
    
    // Delete a notification
    const handleDeleteNotification = async (notificationId: string) => {
        try {
            if (!isAuthenticated) {
                console.log('Not authenticated, cannot delete notification');
                return;
            }
            
            await makeAuthenticatedRequest(async () => {
                await notificationService.deleteNotification(notificationId);
                await fetchNotifications(); // Refresh the list
            }, () => {
                Alert.alert(
                    t('authError'),
                    t('pleaseLogInAgain'),
                    [{ text: t('ok') }]
                );
            });
        } catch (error) {
            console.error('Error deleting notification:', error);
            Alert.alert(t('error'), t('deleteNotificationError'));
        }
    };
    
    // Toggle selection mode
    const toggleSelectionMode = () => {
        setSelectionMode(!selectionMode);
        setSelectedNotifications([]);
    };
    
    // Toggle selection of a notification
    const toggleSelection = (notificationId: string) => {
        if (selectedNotifications.includes(notificationId)) {
            setSelectedNotifications(selectedNotifications.filter(id => id !== notificationId));
        } else {
            setSelectedNotifications([...selectedNotifications, notificationId]);
        }
    };
    
    // Mark all selected notifications as read
    const markSelectedAsRead = async () => {
        try {
            if (!isAuthenticated) {
                console.log('Not authenticated, cannot mark notifications as read');
                return;
            }
            
            await makeAuthenticatedRequest(async () => {
                const promises = selectedNotifications.map(id => markAsRead(id));
                await Promise.all(promises);
                setSelectionMode(false);
                setSelectedNotifications([]);
            }, () => {
                Alert.alert(
                    t('authError'),
                    t('pleaseLogInAgain'),
                    [{ text: t('ok') }]
                );
            });
        } catch (error) {
            console.error('Error marking notifications as read:', error);
            Alert.alert(t('error'), t('markAsReadError'));
        }
    };
    
    // Mark all notifications as read
    const markAllAsRead = async () => {
        try {
            if (!isAuthenticated) {
                console.log('Not authenticated, cannot mark all notifications as read');
                return;
            }
            
            await makeAuthenticatedRequest(async () => {
                const unreadNotifications = state.notifications.filter(n => !n.read);
                const promises = unreadNotifications.map(n => markAsRead(n.id));
                await Promise.all(promises);
            }, () => {
                Alert.alert(
                    t('authError'),
                    t('pleaseLogInAgain'),
                    [{ text: t('ok') }]
                );
            });
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            Alert.alert(t('error'), t('markAllAsReadError'));
        }
    };
    
    // Delete selected notifications
    const deleteSelected = async () => {
        Alert.alert(
            t('deleteNotificationsTitle'),
            t('deleteNotificationsMessage'),
            [
                {
                    text: t('cancel'),
                    style: 'cancel'
                },
                {
                    text: t('delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!isAuthenticated) {
                                console.log('Not authenticated, cannot delete notifications');
                                return;
                            }
                            
                            await makeAuthenticatedRequest(async () => {
                                const promises = selectedNotifications.map(id => 
                                    notificationService.deleteNotification(id)
                                );
                                await Promise.all(promises);
                                await fetchNotifications();
                                setSelectionMode(false);
                                setSelectedNotifications([]);
                            }, () => {
                                Alert.alert(
                                    t('authError'),
                                    t('pleaseLogInAgain'),
                                    [{ text: t('ok') }]
                                );
                            });
                        } catch (error) {
                            console.error('Error deleting notifications:', error);
                            Alert.alert(t('error'), t('deleteNotificationsError'));
                        }
                    }
                }
            ]
        );
    };
    
    // Delete all notifications
    const deleteAllNotifications = async () => {
        Alert.alert(
            t('deleteAllNotificationsTitle'),
            t('deleteAllNotificationsMessage'),
            [
                {
                    text: t('cancel'),
                    style: 'cancel'
                },
                {
                    text: t('deleteAll'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            if (!isAuthenticated) {
                                console.log('Not authenticated, cannot delete all notifications');
                                return;
                            }
                            
                            await makeAuthenticatedRequest(async () => {
                                await notificationService.deleteAllNotifications();
                                await fetchNotifications();
                            }, () => {
                                Alert.alert(
                                    t('authError'),
                                    t('pleaseLogInAgain'),
                                    [{ text: t('ok') }]
                                );
                            });
                        } catch (error) {
                            console.error('Error deleting all notifications:', error);
                            Alert.alert(t('error'), t('deleteAllNotificationsError'));
                        }
                    }
                }
            ]
        );
    };

    // Handle notification press
    const handleNotificationPress = (notification: Notification) => {
        if (selectionMode) {
            toggleSelection(notification.id);
            return;
        }
        
        // Mark as read if unread
        if (!notification.read) {
            handleMarkAsRead(notification);
        }
        
        // Navigate based on notification type (would need to add type to the notification model)
        // This is just a placeholder implementation
        navigation.navigate('MainTabs', { screen: 'Appointments' });
    };

    // Render notification item
    const renderNotification = ({ item }: { item: Notification }) => {
        const isSelected = selectedNotifications.includes(item.id);
        
        return (
            <TouchableOpacity 
                style={[
                    styles.notificationCard, 
                    { backgroundColor: colors.white },
                    isSelected ? { borderWidth: 2, borderColor: colors.primary } : {}
                ]}
                onPress={() => handleNotificationPress(item)}
                onLongPress={() => {
                    if (!selectionMode) {
                        toggleSelectionMode();
                        toggleSelection(item.id);
                    }
                }}
            >
                {selectionMode && (
                    <View style={styles.checkboxContainer}>
                        <View style={[
                            styles.checkbox, 
                            isSelected ? { backgroundColor: colors.primary } : { borderColor: colors.gray }
                        ]}>
                            {isSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
                        </View>
                    </View>
                )}
                
                <View style={styles.notificationHeader}>
                    <View style={styles.titleContainer}>
                        <Ionicons 
                            name="information-circle" 
                            size={18} 
                            color={COLORS.primary}
                            style={styles.notificationIcon}
                        />
                        <Text style={[styles.title, { color: colors.black }]}>{item.title}</Text>
                    </View>
                    <Text style={[styles.timestamp, { color: colors.gray }]}>{formatDate(item.createdAt)}</Text>
                </View>
                <Text style={[styles.message, { color: colors.black }]}>{item.message}</Text>
                {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                
                {!selectionMode && (
                    <View style={styles.actionsContainer}>
                        {!item.read && (
                            <TouchableOpacity 
                                style={styles.actionButton} 
                                onPress={() => handleMarkAsRead(item)}
                            >
                                <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
                                <Text style={[styles.actionText, { color: colors.primary }]}>{t('markRead')}</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                            style={styles.actionButton} 
                            onPress={() => {
                                Alert.alert(
                                    t('deleteNotificationTitle'),
                                    t('deleteNotificationMessage'),
                                    [
                                        {
                                            text: t('cancel'),
                                            style: 'cancel'
                                        },
                                        {
                                            text: t('delete'),
                                            style: 'destructive',
                                            onPress: () => handleDeleteNotification(item.id)
                                        }
                                    ]
                                );
                            }}
                        >
                            <Ionicons name="trash-outline" size={18} color={COLORS.error} />
                            <Text style={[styles.actionText, { color: COLORS.error }]}>{t('delete')}</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };
    
    // Render header with actions
    const renderHeader = () => (
        <View style={styles.headerContainer}>
            <Text style={[styles.screenTitle, { color: colors.black }]}>{t('notifications')}</Text>
            
            <View style={styles.headerActions}>
                {selectionMode ? (
                    <>
                        <TouchableOpacity 
                            style={styles.headerAction} 
                            onPress={toggleSelectionMode}
                        >
                            <Ionicons name="close-outline" size={24} color={colors.gray} />
                        </TouchableOpacity>
                        {selectedNotifications.length > 0 && (
                            <>
                                <TouchableOpacity 
                                    style={styles.headerAction} 
                                    onPress={markSelectedAsRead}
                                >
                                    <Ionicons name="checkmark-circle-outline" size={22} color={colors.primary} />
                                </TouchableOpacity>
                                <TouchableOpacity 
                                    style={styles.headerAction} 
                                    onPress={deleteSelected}
                                >
                                    <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                                </TouchableOpacity>
                            </>
                        )}
                    </>
                ) : (
                    <>
                        <TouchableOpacity 
                            style={styles.headerAction} 
                            onPress={markAllAsRead}
                        >
                            <Ionicons name="checkmark-done-outline" size={22} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.headerAction} 
                            onPress={deleteAllNotifications}
                        >
                            <Ionicons name="trash-outline" size={22} color={COLORS.error} />
                        </TouchableOpacity>
                        <TouchableOpacity 
                            style={styles.headerAction} 
                            onPress={toggleSelectionMode}
                        >
                            <Ionicons name="ellipsis-horizontal" size={22} color={colors.gray} />
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
    
    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Ionicons name="notifications-off-outline" size={60} color={colors.gray} />
            <Text style={[styles.emptyText, { color: colors.gray }]}>{t('noNotifications')}</Text>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {renderHeader()}
            
            {state.loading && !refreshing ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            ) : (
                <FlatList
                    data={state.notifications}
                    renderItem={renderNotification}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContainer}
                    ListEmptyComponent={renderEmptyState}
                    onRefresh={handleRefresh}
                    refreshing={refreshing}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: SIZES.padding,
        paddingVertical: SIZES.base,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    screenTitle: {
        ...FONTS.h3,
    },
    headerActions: {
        flexDirection: 'row',
    },
    headerAction: {
        padding: SIZES.base,
        marginLeft: SIZES.base,
    },
    listContainer: {
        padding: SIZES.padding,
        paddingBottom: SIZES.padding * 2,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationCard: {
        borderRadius: SIZES.radius,
        padding: SIZES.padding,
        marginBottom: SIZES.margin,
        elevation: 2,
        shadowColor: COLORS.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    checkboxContainer: {
        position: 'absolute',
        top: SIZES.padding,
        right: SIZES.padding,
        zIndex: 1,
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SIZES.base,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    notificationIcon: {
        marginRight: 8,
    },
    title: {
        ...FONTS.h4,
        flex: 1,
    },
    timestamp: {
        ...FONTS.body5,
    },
    message: {
        ...FONTS.body4,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        position: 'absolute',
        top: SIZES.padding,
        right: SIZES.padding,
    },
    actionsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: SIZES.padding,
        borderTopWidth: 1,
        borderTopColor: COLORS.lightGray,
        paddingTop: SIZES.base,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: SIZES.padding,
        padding: SIZES.base,
    },
    actionText: {
        ...FONTS.body5,
        marginLeft: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: SIZES.padding * 4,
    },
    emptyText: {
        ...FONTS.body3,
        marginTop: SIZES.padding,
    }
});

export default NotificationsScreen; 