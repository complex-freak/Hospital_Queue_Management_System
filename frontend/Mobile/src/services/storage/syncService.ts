import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config/env';

// Types
type SyncAction = {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
};

class SyncService {
  /**
   * Add an action to offline queue
   */
  async queueAction(endpoint: string, method: string, data: any): Promise<string> {
    try {
      // Create unique ID for this action
      const actionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Create sync action
      const action: SyncAction = {
        id: actionId,
        endpoint,
        method: method as 'POST' | 'PUT' | 'DELETE',
        data,
        timestamp: Date.now(),
      };
      
      // Get current queue
      const queueString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      const queue: SyncAction[] = queueString ? JSON.parse(queueString) : [];
      
      // Add action to queue
      queue.push(action);
      
      // Save updated queue
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
      
      return actionId;
    } catch (error) {
      console.error('Error queueing offline action:', error);
      throw error;
    }
  }
  
  /**
   * Process all pending offline actions
   */
  async processPendingActions(httpClient: any): Promise<{
    success: SyncAction[];
    failed: SyncAction[];
  }> {
    try {
      // Get current queue
      const queueString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      
      if (!queueString) {
        return { success: [], failed: [] };
      }
      
      const queue: SyncAction[] = JSON.parse(queueString);
      const successfulActions: SyncAction[] = [];
      const failedActions: SyncAction[] = [];
      
      // Process each action
      for (const action of queue) {
        try {
          // Try to execute the action
          switch (action.method) {
            case 'POST':
              await httpClient.post(action.endpoint, action.data);
              break;
            case 'PUT':
              await httpClient.put(action.endpoint, action.data);
              break;
            case 'DELETE':
              await httpClient.delete(action.endpoint);
              break;
          }
          
          successfulActions.push(action);
        } catch (error) {
          console.error(`Failed to process offline action ${action.id}:`, error);
          failedActions.push(action);
        }
      }
      
      // Remove successful actions from queue
      if (successfulActions.length > 0) {
        const updatedQueue = queue.filter(
          action => !successfulActions.some(sa => sa.id === action.id)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updatedQueue));
      }
      
      return {
        success: successfulActions,
        failed: failedActions,
      };
    } catch (error) {
      console.error('Error processing offline actions:', error);
      throw error;
    }
  }
  
  /**
   * Get number of pending actions
   */
  async getPendingActionsCount(): Promise<number> {
    try {
      const queueString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      
      if (!queueString) {
        return 0;
      }
      
      const queue: SyncAction[] = JSON.parse(queueString);
      return queue.length;
    } catch (error) {
      console.error('Error getting pending actions count:', error);
      return 0;
    }
  }
  
  /**
   * Clear all pending actions
   */
  async clearPendingActions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_QUEUE);
    } catch (error) {
      console.error('Error clearing pending actions:', error);
      throw error;
    }
  }
}

export const syncService = new SyncService();
export default syncService;
