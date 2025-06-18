import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { connectivityService } from '../services';
import { COLORS, FONTS } from '../constants/theme';
import { useTranslation } from 'react-i18next';

const NetworkStatusBar: React.FC = () => {
  const { t } = useTranslation();
  const [isConnected, setIsConnected] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    // Subscribe to connectivity changes
    const unsubscribe = connectivityService.addListener((connected) => {
      setIsConnected(connected);
      
      // Show bar when disconnected, hide when reconnected (with delay)
      if (!connected) {
        setIsVisible(true);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        // When we reconnect, fade out and then hide
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setIsVisible(false);
        });
      }
    });

    // Cleanup
    return () => unsubscribe();
  }, [fadeAnim]);

  if (!isVisible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        isConnected ? styles.onlineContainer : styles.offlineContainer,
        { opacity: fadeAnim }
      ]}
    >
      <Text style={styles.statusText}>
        {isConnected 
          ? t('Connected to network')
          : t('No internet connection - Working offline')}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 30,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  offlineContainer: {
    backgroundColor: COLORS.error,
  },
  onlineContainer: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    ...FONTS.body5,
    color: COLORS.white,
  },
});

export default NetworkStatusBar; 