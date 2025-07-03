import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../../config/env';
import { storageService } from './storage';

// Types
export type SyncAction = {
  id: string;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  timestamp: number;
  retryCount?: number;
  version?: number;
  entityId?: string;  // ID of the entity being modified
  entityType?: string; // Type of entity (appointment, notification, etc.)
};

export enum ConflictResolutionStrategy {
  LOCAL_WINS = 'LOCAL_WINS',
  SERVER_WINS = 'SERVER_WINS',
  MERGE = 'MERGE',
  PROMPT_USER = 'PROMPT_USER'
}

interface SyncResult {
  success: SyncAction[];
  failed: SyncAction[];
  conflicts: Array<{
    action: SyncAction;
    serverData: any;
    resolution?: ConflictResolutionStrategy;
  }>;
}

class SyncService {
  // Default conflict resolution strategy
  private defaultResolutionStrategy: ConflictResolutionStrategy = ConflictResolutionStrategy.SERVER_WINS;
  
  // Callbacks for conflict resolution
  private conflictHandlers: { [entityType: string]: (conflict: any) => Promise<ConflictResolutionStrategy> } = {};

  /**
   * Add an action to offline queue
   */
  async queueAction(
    endpoint: string, 
    method: string, 
    data: any, 
    entityId?: string,
    entityType?: string
  ): Promise<string> {
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
        retryCount: 0,
        version: 1,
        entityId,
        entityType
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
  async processPendingActions(httpClient: any): Promise<SyncResult> {
    try {
      // Get current queue
      const queueString = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      
      if (!queueString) {
        return { success: [], failed: [], conflicts: [] };
      }
      
      const queue: SyncAction[] = JSON.parse(queueString);
      const successfulActions: SyncAction[] = [];
      const failedActions: SyncAction[] = [];
      const conflictActions: SyncResult['conflicts'] = [];
      
      // Sort queue by timestamp to process oldest first
      queue.sort((a, b) => a.timestamp - b.timestamp);
      
      // Process each action
      for (const action of queue) {
        try {
          // Check for potential conflicts before executing if entity ID is available
          if (action.entityId && action.entityType) {
            const hasConflict = await this.checkForConflict(action, httpClient);
            
            if (hasConflict) {
              // Get server data for the entity
              let serverData;
              try {
                const endpoint = action.endpoint.split('/').slice(0, -1).join('/');
                const response = await httpClient.get(`${endpoint}/${action.entityId}`);
                serverData = response.data;
              } catch (error) {
                console.error(`Failed to get server data for conflict check: ${error}`);
                // If we can't get server data, proceed with the action
                serverData = null;
              }
              
              if (serverData) {
                // Add to conflicts list
                conflictActions.push({
                  action,
                  serverData
                });
                
                // Skip this action for now, it will be handled in conflict resolution
                continue;
              }
            }
          }
          
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
          
          // Increment retry count
          action.retryCount = (action.retryCount || 0) + 1;
          
          // If we've retried too many times, consider it a failure
          if (action.retryCount >= 3) {
            failedActions.push(action);
          } else {
            // Otherwise keep it in the queue for next attempt
            failedActions.push({...action});
          }
        }
      }
      
      // Process conflicts based on resolution strategy
      const resolvedConflicts = await this.resolveConflicts(conflictActions, httpClient);
      
      // Add successfully resolved conflicts to successful actions
      successfulActions.push(...resolvedConflicts.success);
      
      // Add unresolved conflicts to failed actions
      failedActions.push(...resolvedConflicts.failed);
      
      // Remove successful actions and resolved conflicts from queue
      if (successfulActions.length > 0) {
        const updatedQueue = queue.filter(
          action => !successfulActions.some(sa => sa.id === action.id)
        );
        await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(updatedQueue));
      }
      
      return {
        success: successfulActions,
        failed: failedActions,
        conflicts: conflictActions
      };
    } catch (error) {
      console.error('Error processing offline actions:', error);
      throw error;
    }
  }
  
  /**
   * Set a conflict resolution handler for a specific entity type
   */
  setConflictHandler(
    entityType: string, 
    handler: (conflict: any) => Promise<ConflictResolutionStrategy>
  ): void {
    this.conflictHandlers[entityType] = handler;
  }
  
  /**
   * Set default conflict resolution strategy
   */
  setDefaultResolutionStrategy(strategy: ConflictResolutionStrategy): void {
    this.defaultResolutionStrategy = strategy;
  }
  
  /**
   * Check if an action conflicts with server state
   */
  private async checkForConflict(action: SyncAction, httpClient: any): Promise<boolean> {
    // Only check for conflicts on PUT operations
    if (action.method !== 'PUT') {
      return false;
    }
    
    try {
      // Check the entity's version or last modified date on the server
      const endpoint = action.endpoint.split('/').slice(0, -1).join('/');
      const response = await httpClient.get(`${endpoint}/${action.entityId}`);
      
      if (response && response.data) {
        // Check for version conflict
        const serverVersion = response.data.version || 0;
        const localVersion = action.version || 0;
        
        // If server version is higher, we have a conflict
        return serverVersion > localVersion;
      }
      
      return false;
    } catch (error) {
      console.error(`Error checking for conflicts: ${error}`);
      // If we can't check, assume no conflict
      return false;
    }
  }
  
  /**
   * Resolve conflicts using the appropriate strategy
   */
  private async resolveConflicts(
    conflicts: SyncResult['conflicts'], 
    httpClient: any
  ): Promise<{ success: SyncAction[], failed: SyncAction[] }> {
    const success: SyncAction[] = [];
    const failed: SyncAction[] = [];
    
    for (const conflict of conflicts) {
      try {
        // Determine resolution strategy
        let strategy = this.defaultResolutionStrategy;
        
        // If we have a handler for this entity type, use it
        if (conflict.action.entityType && this.conflictHandlers[conflict.action.entityType]) {
          strategy = await this.conflictHandlers[conflict.action.entityType](conflict);
        }
        
        // Apply resolution strategy
        switch (strategy) {
          case ConflictResolutionStrategy.LOCAL_WINS:
            // Apply local changes
            await this.executeAction(conflict.action, httpClient);
            success.push(conflict.action);
            break;
            
          case ConflictResolutionStrategy.SERVER_WINS:
            // Accept server data, update local cache
            if (conflict.action.entityType && conflict.action.entityId) {
              await this.updateLocalCache(
                conflict.action.entityType, 
                conflict.action.entityId, 
                conflict.serverData
              );
            }
            success.push(conflict.action);
            break;
            
          case ConflictResolutionStrategy.MERGE:
            // Merge local and server data
            const mergedData = this.mergeData(conflict.action.data, conflict.serverData);
            conflict.action.data = mergedData;
            
            // Execute with merged data
            await this.executeAction(conflict.action, httpClient);
            success.push(conflict.action);
            break;
            
          case ConflictResolutionStrategy.PROMPT_USER:
            // Cannot resolve automatically, keep in failed list
            failed.push(conflict.action);
            break;
            
          default:
            // Default to server wins
            if (conflict.action.entityType && conflict.action.entityId) {
              await this.updateLocalCache(
                conflict.action.entityType, 
                conflict.action.entityId, 
                conflict.serverData
              );
            }
            success.push(conflict.action);
        }
      } catch (error) {
        console.error(`Failed to resolve conflict for action ${conflict.action.id}:`, error);
        failed.push(conflict.action);
      }
    }
    
    return { success, failed };
  }
  
  /**
   * Execute an action with the HTTP client
   */
  private async executeAction(action: SyncAction, httpClient: any): Promise<void> {
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
  }
  
  /**
   * Update local cache with server data
   */
  private async updateLocalCache(entityType: string, entityId: string, data: any): Promise<void> {
    switch (entityType) {
      case 'appointment':
        // Using the storage service to update cache
        await storageService.updateAppointment(data);
        break;
      // Add other entity types as needed
    }
  }
  
  /**
   * Merge local and server data
   */
  private mergeData(localData: any, serverData: any): any {
    // Simple merge: take newer values where possible
    const result = { ...serverData };
    
    // Merge fields, prioritizing fields that were explicitly set in local data
    for (const [key, value] of Object.entries(localData)) {
      if (value !== undefined && value !== null) {
        result[key] = value;
      }
    }
    
    return result;
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
