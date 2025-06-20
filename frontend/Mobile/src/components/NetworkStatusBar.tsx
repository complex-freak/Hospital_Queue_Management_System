import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { connectivityService } from '../services/connectivity/connectivityServices';
import { syncService } from '../services/storage/syncService';
import theme from '../constants/theme';
import { SyncInfo, ConnectionInfo } from '../types';
import { httpClient } from '../services/api';

interface NetworkStatusBarProps {
  onManualSync?: () => void;
}

const NetworkStatusBar: React.FC<NetworkStatusBarProps> = ({ onManualSync }) => {
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [pendingActions, setPendingActions] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  
  useEffect(() => {
    // Subscribe to connectivity changes
    const unsubscribe = connectivityService.addListener((connected) => {
      setIsConnected(connected);
      
      // If just came back online, check for pending actions
      if (connected) {
        checkPendingActions();
      }
    });
    
    // Initialize with current state
    setIsConnected(connectivityService.isNetworkConnected());
    checkPendingActions();
    
    // Set up interval to check pending actions
    const interval = setInterval(checkPendingActions, 10000); // Every 10 seconds
    
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, []);
  
  const checkPendingActions = async () => {
    try {
      const count = await syncService.getPendingActionsCount();
      setPendingActions(count);
    } catch (error) {
      console.error('Error checking pending actions:', error);
    }
  };
  
  const handleManualSync = async () => {
    if (!isConnected || isSyncing || pendingActions === 0) return;
    
    try {
      setIsSyncing(true);
      
      // Call the provided sync handler or use default
      if (onManualSync) {
        onManualSync();
      } else {
        await syncService.processPendingActions(httpClient);
      }
      
      // Refresh pending actions count
      await checkPendingActions();
    } catch (error) {
      console.error('Error during manual sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Don't show anything if connected and no pending actions
  if (isConnected && pendingActions === 0) {
    return null;
  }
  
  return (
    <View style={[
      styles.container, 
      isConnected ? styles.onlineContainer : styles.offlineContainer
    ]}>
      <Text style={styles.statusText}>
        {isConnected 
          ? `${pendingActions} item(s) waiting to sync` 
          : 'You are offline. Changes will sync when back online.'}
      </Text>
      
      {isConnected && pendingActions > 0 && (
        <TouchableOpacity 
          style={styles.syncButton} 
          onPress={handleManualSync}
          disabled={isSyncing}
        >
          {isSyncing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.syncButtonText}>Sync Now</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 999,
  },
  offlineContainer: {
    backgroundColor: theme.COLORS.error,
  },
  onlineContainer: {
    backgroundColor: theme.COLORS.warning,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  syncButton: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  syncButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default NetworkStatusBar; 