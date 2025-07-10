import { openDB, IDBPDatabase } from 'idb';
import { v4 as uuidv4 } from 'uuid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

// Define the sync operation types
export enum SyncOperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete'
}

// Define the sync record structure
interface SyncRecord {
    id: string;
    entityType: string;
    entityId: string;
    operation: SyncOperationType;
    data: any;
    timestamp: number;
    synced: boolean;
    attempts: number;
    createdAt: string;
    updatedAt: string;
}

// Define the sync options
interface SyncOptions {
    maxRetries?: number;
    retryDelayMs?: number;
    syncBatchSize?: number;
    syncInterval?: number;
    persistenceStrategy?: 'indexeddb' | 'asyncstorage' | 'both';
    apiBaseUrl?: string;
    apiHeaders?: Record<string, string>;
    conflictResolution?: 'client-wins' | 'server-wins' | 'manual';
    debug?: boolean;
}

// Default options
const defaultSyncOptions: SyncOptions = {
    maxRetries: 5,
    retryDelayMs: 5000,
    syncBatchSize: 20,
    syncInterval: 60000, // 1 minute
    persistenceStrategy: 'both',
    apiBaseUrl: '/api',
    apiHeaders: {
        'Content-Type': 'application/json'
    },
    conflictResolution: 'server-wins',
    debug: false
};

class DataSyncService {
    private options: SyncOptions;
    private db: IDBPDatabase | null = null;
    private syncTimer: NodeJS.Timeout | null = null;
    private isSyncing = false;
    private isOnline = true;
    private pendingChanges: Map<string, SyncRecord> = new Map();
    private isInitialized = false;
    private onSyncCompletedCallbacks: ((result: { synced: number, failed: number }) => void)[] = [];
    private onSyncErrorCallbacks: ((error: Error) => void)[] = [];
    private onConnectionChangeCallbacks: ((isConnected: boolean) => void)[] = [];

    constructor(options: SyncOptions = {}) {
        this.options = { ...defaultSyncOptions, ...options };
        this.init();
    }

    /**
     * Initialize the sync service
     */
    private async init() {
        try {
            // Initialize IndexedDB for web
            if (this.options.persistenceStrategy === 'indexeddb' || this.options.persistenceStrategy === 'both') {
                if (typeof window !== 'undefined' && 'indexedDB' in window) {
                    this.db = await this.initializeIndexedDB();
                }
            }

            // Initialize network listener
            this.setupNetworkListener();

            // Load pending changes from persistent storage
            await this.loadPendingChanges();

            // Start sync process if we're online
            if (this.isOnline) {
                this.startPeriodicSync();
            }

            this.isInitialized = true;

            if (this.options.debug) {
                console.log('DataSyncService initialized');
            }
        } catch (error) {
            console.error('Error initializing DataSyncService:', error);
            this.notifySyncError(error as Error);
        }
    }

    /**
     * Initialize IndexedDB for web platform
     */
    private async initializeIndexedDB(): Promise<IDBPDatabase> {
        return openDB('cvd-data-sync', 1, {
            upgrade(db) {
                // Create stores
                if (!db.objectStoreNames.contains('sync-queue')) {
                    const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id' });
                    syncStore.createIndex('synced', 'synced', { unique: false });
                    syncStore.createIndex('entityType', 'entityType', { unique: false });
                    syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Create data cache store for offline data
                if (!db.objectStoreNames.contains('data-cache')) {
                    const dataStore = db.createObjectStore('data-cache', { keyPath: 'id' });
                    dataStore.createIndex('entityType', 'entityType', { unique: false });
                    dataStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                }
            }
        });
    }

    /**
     * Setup network connectivity listener
     */
    private setupNetworkListener() {
        if (typeof window !== 'undefined') {
            // Browser environment
            window.addEventListener('online', this.handleOnlineStatus.bind(this, true));
            window.addEventListener('offline', this.handleOnlineStatus.bind(this, false));
            this.isOnline = navigator.onLine;
        } else {
            // React Native environment
            NetInfo.addEventListener(state => {
                this.handleOnlineStatus(!!state.isConnected);
            });

            // Get initial state
            NetInfo.fetch().then(state => {
                this.isOnline = !!state.isConnected;
            });
        }
    }

    /**
     * Handle online/offline status changes
     */
    private handleOnlineStatus(isOnline: boolean) {
        const wasOffline = !this.isOnline;
        this.isOnline = isOnline;

        if (this.options.debug) {
            console.log(`Network status changed: ${isOnline ? 'online' : 'offline'}`);
        }

        // Notify listeners
        this.notifyConnectionChange(isOnline);

        // If we just came back online and we have pending changes, start sync
        if (isOnline && wasOffline) {
            this.syncNow();
        }

        // Manage sync timer based on connectivity
        if (isOnline) {
            this.startPeriodicSync();
        } else if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }

    /**
     * Load pending changes from persistent storage
     */
    private async loadPendingChanges() {
        try {
            if (this.db) {
                // Load from IndexedDB
                const tx = this.db.transaction('sync-queue', 'readonly');
                const store = tx.objectStore('sync-queue');
                const unsyncedItems = await store.index('synced').getAll(false);

                unsyncedItems.forEach(item => {
                    this.pendingChanges.set(item.id, item);
                });

                if (this.options.debug) {
                    console.log(`Loaded ${unsyncedItems.length} pending changes from IndexedDB`);
                }
            } else {
                // Load from AsyncStorage
                const storageKey = '@CVDSync:pendingChanges';
                const storedData = await AsyncStorage.getItem(storageKey);

                if (storedData) {
                    const parsedData = JSON.parse(storedData) as SyncRecord[];
                    parsedData.forEach(item => {
                        this.pendingChanges.set(item.id, item);
                    });

                    if (this.options.debug) {
                        console.log(`Loaded ${parsedData.length} pending changes from AsyncStorage`);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading pending changes:', error);
        }
    }

    /**
     * Save pending changes to persistent storage
     */
    private async savePendingChanges() {
        try {
            const pendingItems = Array.from(this.pendingChanges.values());

            if (this.db) {
                // Save to IndexedDB
                const tx = this.db.transaction('sync-queue', 'readwrite');
                const store = tx.objectStore('sync-queue');

                // Clear existing records and add current ones
                await store.clear();
                for (const item of pendingItems) {
                    await store.put(item);
                }

                await tx.done;

                if (this.options.debug) {
                    console.log(`Saved ${pendingItems.length} pending changes to IndexedDB`);
                }
            }

            if (this.options.persistenceStrategy === 'asyncstorage' || this.options.persistenceStrategy === 'both') {
                // Save to AsyncStorage
                const storageKey = '@CVDSync:pendingChanges';
                await AsyncStorage.setItem(storageKey, JSON.stringify(pendingItems));

                if (this.options.debug) {
                    console.log(`Saved ${pendingItems.length} pending changes to AsyncStorage`);
                }
            }
        } catch (error) {
            console.error('Error saving pending changes:', error);
        }
    }

    /**
     * Start periodic sync process
     */
    private startPeriodicSync() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
        }

        this.syncTimer = setInterval(() => {
            if (this.isOnline && this.pendingChanges.size > 0) {
                this.syncNow();
            }
        }, this.options.syncInterval);

        if (this.options.debug) {
            console.log(`Periodic sync started (interval: ${this.options.syncInterval}ms)`);
        }
    }

    /**
     * Queue a change for syncing
     */
    public queueChange(
        entityType: string,
        operation: SyncOperationType,
        data: any,
        entityId?: string
    ): string {
        // Generate an ID for the operation if not provided
        const generatedId = entityId || (operation === SyncOperationType.CREATE ? uuidv4() : data.id);

        if (!generatedId) {
            throw new Error('Entity ID is required for update and delete operations');
        }

        const now = new Date();
        const syncRecord: SyncRecord = {
            id: uuidv4(),
            entityType,
            entityId: generatedId,
            operation,
            data,
            timestamp: Date.now(),
            synced: false,
            attempts: 0,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString()
        };

        this.pendingChanges.set(syncRecord.id, syncRecord);

        if (this.options.debug) {
            console.log(`Queued ${operation} operation for ${entityType}:${generatedId}`);
        }

        // Save changes to storage
        this.savePendingChanges();

        // Try to sync immediately if online
        if (this.isOnline && !this.isSyncing) {
            this.syncNow();
        }

        return generatedId;
    }

    /**
     * Start sync process now
     */
    public async syncNow(): Promise<{ synced: number, failed: number }> {
        if (this.isSyncing || !this.isOnline) {
            if (this.options.debug) {
                console.log(`Sync already in progress or offline, skipping`);
            }
            return { synced: 0, failed: 0 };
        }

        this.isSyncing = true;
        let syncedCount = 0;
        let failedCount = 0;

        try {
            if (this.options.debug) {
                console.log(`Starting sync with ${this.pendingChanges.size} pending changes`);
            }

            // Get pending items sorted by timestamp
            const pendingItems = Array.from(this.pendingChanges.values())
                .sort((a, b) => a.timestamp - b.timestamp)
                .slice(0, this.options.syncBatchSize);

            if (pendingItems.length === 0) {
                this.isSyncing = false;
                return { synced: 0, failed: 0 };
            }

            // Group by entity type for batch processing
            const itemsByType = pendingItems.reduce((groups, item) => {
                if (!groups[item.entityType]) {
                    groups[item.entityType] = [];
                }
                groups[item.entityType].push(item);
                return groups;
            }, {} as Record<string, SyncRecord[]>);

            // Process each entity type
            for (const [entityType, items] of Object.entries(itemsByType)) {
                try {
                    // Send batch to server
                    const result = await this.sendToServer(entityType, items);

                    // Process results
                    for (const item of items) {
                        if (result.successful.includes(item.id)) {
                            // Remove from pending changes
                            this.pendingChanges.delete(item.id);
                            syncedCount++;

                            // If this was a successful create/update, update the cache
                            if (item.operation === SyncOperationType.CREATE || item.operation === SyncOperationType.UPDATE) {
                                await this.updateCachedItem(entityType, item.entityId, item.data);
                            } else if (item.operation === SyncOperationType.DELETE) {
                                await this.removeCachedItem(entityType, item.entityId);
                            }
                        } else if (result.failed.includes(item.id)) {
                            // Increment attempts and update timestamp
                            item.attempts++;
                            item.updatedAt = new Date().toISOString();

                            if (item.attempts >= this.options.maxRetries!) {
                                // Max retries reached, remove from queue
                                this.pendingChanges.delete(item.id);
                                console.error(`Max retries reached for ${item.id}, removing from queue`);
                            }

                            failedCount++;
                        }
                    }
                } catch (error) {
                    console.error(`Error syncing ${entityType}:`, error);

                    // Mark all items as failed but keep in queue for retry
                    for (const item of items) {
                        item.attempts++;
                        item.updatedAt = new Date().toISOString();
                        failedCount++;
                    }
                }
            }

            // Save updated pending changes
            await this.savePendingChanges();

            if (this.options.debug) {
                console.log(`Sync completed: ${syncedCount} synced, ${failedCount} failed`);
            }

            // Notify listeners
            this.notifySyncCompleted({ synced: syncedCount, failed: failedCount });

            return { synced: syncedCount, failed: failedCount };
        } catch (error) {
            console.error('Error during sync:', error);
            this.notifySyncError(error as Error);
            return { synced: syncedCount, failed: failedCount };
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Send changes to server
     */
    private async sendToServer(
        entityType: string,
        items: SyncRecord[]
    ): Promise<{ successful: string[], failed: string[] }> {
        try {
            const apiUrl = `${this.options.apiBaseUrl}/${entityType}/batch`;

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: this.options.apiHeaders as HeadersInit,
                body: JSON.stringify({
                    operations: items.map(item => ({
                        id: item.id,
                        operationType: item.operation,
                        entityId: item.entityId,
                        data: item.data
                    }))
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status} ${response.statusText}`);
            }

            const result = await response.json();

            return {
                successful: result.successful || [],
                failed: result.failed || []
            };
        } catch (error) {
            console.error('Error sending to server:', error);
            // If server communication fails, mark all as failed
            return {
                successful: [],
                failed: items.map(item => item.id)
            };
        }
    }

    /**
     * Update a cached item
     */
    private async updateCachedItem(entityType: string, entityId: string, data: any) {
        try {
            if (this.db) {
                const tx = this.db.transaction('data-cache', 'readwrite');
                const store = tx.objectStore('data-cache');

                await store.put({
                    id: entityId,
                    entityType,
                    data,
                    updatedAt: new Date().toISOString()
                });

                await tx.done;
            }

            // Also update in AsyncStorage if using that strategy
            if (this.options.persistenceStrategy === 'asyncstorage' || this.options.persistenceStrategy === 'both') {
                const storageKey = `@CVDCache:${entityType}:${entityId}`;
                await AsyncStorage.setItem(storageKey, JSON.stringify({
                    id: entityId,
                    entityType,
                    data,
                    updatedAt: new Date().toISOString()
                }));
            }
        } catch (error) {
            console.error(`Error updating cached item ${entityType}:${entityId}:`, error);
        }
    }

    /**
     * Remove a cached item
     */
    private async removeCachedItem(entityType: string, entityId: string) {
        try {
            if (this.db) {
                const tx = this.db.transaction('data-cache', 'readwrite');
                const store = tx.objectStore('data-cache');

                await store.delete(entityId);

                await tx.done;
            }

            // Also remove from AsyncStorage if using that strategy
            if (this.options.persistenceStrategy === 'asyncstorage' || this.options.persistenceStrategy === 'both') {
                const storageKey = `@CVDCache:${entityType}:${entityId}`;
                await AsyncStorage.removeItem(storageKey);
            }
        } catch (error) {
            console.error(`Error removing cached item ${entityType}:${entityId}:`, error);
        }
    }

    /**
     * Get a cached item by type and ID
     */
    public async getCachedItem<T = any>(entityType: string, entityId: string): Promise<T | null> {
        try {
            if (this.db) {
                const tx = this.db.transaction('data-cache', 'readonly');
                const store = tx.objectStore('data-cache');

                const item = await store.get(entityId);

                if (item && item.entityType === entityType) {
                    return item.data as T;
                }
            }

            // Try AsyncStorage if needed
            if (this.options.persistenceStrategy === 'asyncstorage' || this.options.persistenceStrategy === 'both') {
                const storageKey = `@CVDCache:${entityType}:${entityId}`;
                const storedData = await AsyncStorage.getItem(storageKey);

                if (storedData) {
                    const parsedData = JSON.parse(storedData);
                    return parsedData.data as T;
                }
            }

            return null;
        } catch (error) {
            console.error(`Error getting cached item ${entityType}:${entityId}:`, error);
            return null;
        }
    }

    /**
     * Get all cached items of a specific type
     */
    public async getCachedItems<T = any>(entityType: string): Promise<T[]> {
        const results: T[] = [];

        try {
            if (this.db) {
                const tx = this.db.transaction('data-cache', 'readonly');
                const store = tx.objectStore('data-cache');
                const index = store.index('entityType');

                const items = await index.getAll(entityType);

                items.forEach(item => {
                    results.push(item.data as T);
                });
            } else if (this.options.persistenceStrategy === 'asyncstorage' || this.options.persistenceStrategy === 'both') {
                // This is less efficient in AsyncStorage, but we'll try
                const keys = await AsyncStorage.getAllKeys();
                const entityKeys = keys.filter(key => key.startsWith(`@CVDCache:${entityType}:`));

                if (entityKeys.length > 0) {
                    const storedItems = await AsyncStorage.multiGet(entityKeys);

                    storedItems.forEach(([_, value]) => {
                        if (value) {
                            const parsedData = JSON.parse(value);
                            results.push(parsedData.data as T);
                        }
                    });
                }
            }

            return results;
        } catch (error) {
            console.error(`Error getting cached items for ${entityType}:`, error);
            return [];
        }
    }

    /**
     * Create a new item and queue for sync
     */
    public async create<T = any>(
        entityType: string,
        data: T
    ): Promise<{ entityId: string, data: T }> {
        const entityId = this.queueChange(entityType, SyncOperationType.CREATE, data);

        // Also cache immediately for offline access
        await this.updateCachedItem(entityType, entityId, data);

        return { entityId, data };
    }

    /**
     * Update an existing item and queue for sync
     */
    public async update<T = any>(
        entityType: string,
        entityId: string,
        data: T
    ): Promise<{ entityId: string, data: T }> {
        this.queueChange(entityType, SyncOperationType.UPDATE, data, entityId);

        // Also cache immediately for offline access
        await this.updateCachedItem(entityType, entityId, data);

        return { entityId, data };
    }

    /**
     * Delete an item and queue for sync
     */
    public async delete(
        entityType: string,
        entityId: string
    ): Promise<{ entityId: string }> {
        this.queueChange(entityType, SyncOperationType.DELETE, { id: entityId }, entityId);

        // Also remove from cache immediately
        await this.removeCachedItem(entityType, entityId);

        return { entityId };
    }

    /**
     * Get an item, trying cache first then API
     */
    public async get<T = any>(
        entityType: string,
        entityId: string,
        forceRefresh = false
    ): Promise<T | null> {
        // Check cache first unless force refresh
        if (!forceRefresh) {
            const cached = await this.getCachedItem<T>(entityType, entityId);

            if (cached) {
                if (this.options.debug) {
                    console.log(`Cache hit for ${entityType}:${entityId}`);
                }
                return cached;
            }
        }

        // If online, try to fetch from API
        if (this.isOnline) {
            try {
                const apiUrl = `${this.options.apiBaseUrl}/${entityType}/${entityId}`;

                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: this.options.apiHeaders as HeadersInit,
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // Cache the result
                await this.updateCachedItem(entityType, entityId, data);

                return data as T;
            } catch (error) {
                console.error(`Error fetching ${entityType}:${entityId}:`, error);

                // Fallback to cache as last resort
                if (forceRefresh) {
                    return this.getCachedItem<T>(entityType, entityId);
                }

                return null;
            }
        } else {
            if (this.options.debug) {
                console.log(`Offline, unable to fetch ${entityType}:${entityId} from API`);
            }
            return null;
        }
    }

    /**
     * Get all items of a type, using cache and/or API
     */
    public async getAll<T = any>(
        entityType: string,
        queryParams: Record<string, string> = {},
        forceRefresh = false
    ): Promise<T[]> {
        // If online and either forcing refresh or has query params, fetch from API
        if (this.isOnline && (forceRefresh || Object.keys(queryParams).length > 0)) {
            try {
                const queryString = Object.entries(queryParams)
                    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
                    .join('&');

                const apiUrl = `${this.options.apiBaseUrl}/${entityType}${queryString ? `?${queryString}` : ''}`;

                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: this.options.apiHeaders as HeadersInit,
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error(`API error: ${response.status} ${response.statusText}`);
                }

                const data = await response.json();

                // Cache individual items
                if (Array.isArray(data)) {
                    for (const item of data) {
                        if (item.id) {
                            await this.updateCachedItem(entityType, item.id, item);
                        }
                    }
                }

                return data as T[];
            } catch (error) {
                console.error(`Error fetching ${entityType} list:`, error);

                // Fallback to cache
                if (Object.keys(queryParams).length === 0) {
                    return this.getCachedItems<T>(entityType);
                }

                return [];
            }
        } else {
            // Use cached data
            const cachedItems = await this.getCachedItems<T>(entityType);

            if (this.options.debug) {
                console.log(`Using ${cachedItems.length} cached items for ${entityType}`);
            }

            return cachedItems;
        }
    }

    /**
     * Check if there are pending changes
     */
    public hasPendingChanges(): boolean {
        return this.pendingChanges.size > 0;
    }

    /**
     * Get count of pending changes
     */
    public getPendingChangesCount(): number {
        return this.pendingChanges.size;
    }

    /**
     * Get pending changes for a specific entity
     */
    public getPendingChangesForEntity(entityType: string, entityId: string): SyncRecord[] {
        return Array.from(this.pendingChanges.values())
            .filter(record => record.entityType === entityType && record.entityId === entityId);
    }

    /**
     * Event handling
     */
    public onSyncCompleted(callback: (result: { synced: number, failed: number }) => void) {
        this.onSyncCompletedCallbacks.push(callback);
        return () => {
            this.onSyncCompletedCallbacks = this.onSyncCompletedCallbacks.filter(cb => cb !== callback);
        };
    }

    public onSyncError(callback: (error: Error) => void) {
        this.onSyncErrorCallbacks.push(callback);
        return () => {
            this.onSyncErrorCallbacks = this.onSyncErrorCallbacks.filter(cb => cb !== callback);
        };
    }

    public onConnectionChange(callback: (isConnected: boolean) => void) {
        this.onConnectionChangeCallbacks.push(callback);
        return () => {
            this.onConnectionChangeCallbacks = this.onConnectionChangeCallbacks.filter(cb => cb !== callback);
        };
    }

    private notifySyncCompleted(result: { synced: number, failed: number }) {
        this.onSyncCompletedCallbacks.forEach(callback => {
            try {
                callback(result);
            } catch (error) {
                console.error('Error in sync completed callback:', error);
            }
        });
    }

    private notifySyncError(error: Error) {
        this.onSyncErrorCallbacks.forEach(callback => {
            try {
                callback(error);
            } catch (callbackError) {
                console.error('Error in sync error callback:', callbackError);
            }
        });
    }

    private notifyConnectionChange(isConnected: boolean) {
        this.onConnectionChangeCallbacks.forEach(callback => {
            try {
                callback(isConnected);
            } catch (error) {
                console.error('Error in connection change callback:', error);
            }
        });
    }

    /**
     * Clean up resources
     */
    public destroy() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }

        if (typeof window !== 'undefined') {
            window.removeEventListener('online', this.handleOnlineStatus.bind(this, true));
            window.removeEventListener('offline', this.handleOnlineStatus.bind(this, false));
        }

        this.onSyncCompletedCallbacks = [];
        this.onSyncErrorCallbacks = [];
        this.onConnectionChangeCallbacks = [];

        if (this.options.debug) {
            console.log('DataSyncService destroyed');
        }
    }
}

// Create singleton instance
const dataSyncService = new DataSyncService();

export { dataSyncService, DataSyncService, SyncOperationType };
export type { SyncRecord, SyncOptions }; 