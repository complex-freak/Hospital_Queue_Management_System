import NetInfo, { NetInfoState, NetInfoSubscription } from '@react-native-community/netinfo';
import { syncService, httpClient } from '..';

class ConnectivityService {
  private isConnected: boolean = true;
  private listeners: Array<(isConnected: boolean) => void> = [];
  private netInfoUnsubscribe: NetInfoSubscription | null = null;
  
  /**
   * Initialize connectivity monitoring
   */
  initialize() {
    // Get initial connection status
    NetInfo.fetch().then((state: NetInfoState) => {
      this.handleConnectivityChange(state);
    });
    
    // Subscribe to connection changes
    this.netInfoUnsubscribe = NetInfo.addEventListener(this.handleConnectivityChange);
  }
  
  /**
   * Clean up listeners
   */
  cleanup() {
    if (this.netInfoUnsubscribe) {
      this.netInfoUnsubscribe();
      this.netInfoUnsubscribe = null;
    }
  }
  
  /**
   * Handle connectivity changes
   */
  private handleConnectivityChange = (state: NetInfoState) => {
    const newIsConnected = !!state.isConnected;
    
    // If connection state has changed
    if (this.isConnected !== newIsConnected) {
      this.isConnected = newIsConnected;
      
      // Notify listeners
      this.notifyListeners();
      
      // If we just came back online, try to sync pending actions
      if (newIsConnected) {
        this.syncOfflineActions();
      }
    }
  };
  
  /**
   * Try to sync offline actions when app comes back online
   */
  private async syncOfflineActions() {
    try {
      const result = await syncService.processPendingActions(httpClient);
      
      console.log(`Synced ${result.success.length} actions, ${result.failed.length} failed`);
      
      // Re-attempt failed actions later
      if (result.failed.length > 0) {
        setTimeout(() => {
          if (this.isConnected) {
            this.syncOfflineActions();
          }
        }, 60000); // Try again after 1 minute
      }
    } catch (error) {
      console.error('Error syncing offline actions:', error);
    }
  }
  
  /**
   * Add a listener for connectivity changes
   */
  addListener(callback: (isConnected: boolean) => void): () => void {
    this.listeners.push(callback);
    
    // Call immediately with current state
    callback(this.isConnected);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(listener => listener !== callback);
    };
  }
  
  /**
   * Notify all listeners of current connectivity state
   */
  private notifyListeners() {
    this.listeners.forEach(listener => {
      listener(this.isConnected);
    });
  }
  
  /**
   * Check if currently connected
   */
  isNetworkConnected(): boolean {
    return this.isConnected;
  }
}

export const connectivityService = new ConnectivityService();
export default connectivityService;
