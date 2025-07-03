import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { pushNotificationService } from '../services/notifications/pushNotificationService';
import { useNotifications } from '../context/NotificationsContext';
import { COLORS } from '../constants/theme';

interface NotificationPermissionProps {
  onPermissionChanged?: (granted: boolean) => void;
}

const NotificationPermission: React.FC<NotificationPermissionProps> = ({ 
  onPermissionChanged 
}) => {
  const { t } = useTranslation();
  const { registerForPushNotifications } = useNotifications();
  const [permissionStatus, setPermissionStatus] = useState<string>('checking');

  useEffect(() => {
    // Check current permission status
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      const permissionResponse = await pushNotificationService.checkPermissions();
      setPermissionStatus(permissionResponse.status);
      
      // Notify parent component
      if (onPermissionChanged) {
        onPermissionChanged(permissionResponse.status === 'granted');
      }
    } catch (error) {
      console.error('Error checking notification permissions:', error);
      setPermissionStatus('unknown');
    }
  };

  const requestPermission = async () => {
    try {
      const permissionResponse = await pushNotificationService.requestPermissions();
      setPermissionStatus(permissionResponse.status);
      
      // If permission was granted, register for notifications
      if (permissionResponse.status === 'granted') {
        await registerForPushNotifications();
        
        // Notify parent component
        if (onPermissionChanged) {
          onPermissionChanged(true);
        }
      } else {
        // Show alert explaining why notifications are important
        Alert.alert(
          t('notifications_required_title'),
          t('notifications_required_message'),
          [
            { text: t('settings'), onPress: openSettings },
            { text: t('cancel'), style: 'cancel' }
          ]
        );
      }
    } catch (error) {
      console.error('Error requesting notification permissions:', error);
    }
  };

  const openSettings = () => {
    // Placeholder for opening app settings
    // On a real device, you would use Linking.openSettings()
    Alert.alert(
      t('open_settings_title'),
      t('open_settings_message')
    );
  };

  // Render different UI based on permission status
  const renderPermissionContent = () => {
    switch (permissionStatus) {
      case 'granted':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
            <Text style={styles.statusText}>{t('notifications_enabled')}</Text>
          </View>
        );
      
      case 'denied':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="close-circle" size={24} color={COLORS.error} />
            <Text style={styles.statusText}>{t('notifications_denied')}</Text>
            <TouchableOpacity style={styles.button} onPress={openSettings}>
              <Text style={styles.buttonText}>{t('open_settings')}</Text>
            </TouchableOpacity>
          </View>
        );
      
      case 'undetermined':
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="help-circle" size={24} color={COLORS.warning} />
            <Text style={styles.statusText}>{t('notifications_permission_required')}</Text>
            <TouchableOpacity style={styles.button} onPress={requestPermission}>
              <Text style={styles.buttonText}>{t('enable_notifications')}</Text>
            </TouchableOpacity>
          </View>
        );
      
      default:
        return (
          <View style={styles.statusContainer}>
            <Ionicons name="help-circle" size={24} color={COLORS.warning} />
            <Text style={styles.statusText}>{t('notifications_status_unknown')}</Text>
            <TouchableOpacity style={styles.button} onPress={checkPermissionStatus}>
              <Text style={styles.buttonText}>{t('check_status')}</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {renderPermissionContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: COLORS.lightGray,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statusContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    marginTop: 8,
    fontSize: 16,
    color: COLORS.black,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default NotificationPermission; 