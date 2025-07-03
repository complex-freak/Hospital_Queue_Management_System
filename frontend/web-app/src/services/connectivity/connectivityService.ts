import { indexedDBService } from '../db/indexedDBService';

type ConnectivityListener = (isOnline: boolean) => void;

class ConnectivityService {
  private isOnline: boolean = navigator.onLine;
  private listeners: ConnectivityListener[] = [];
  private syncInterval: number | null = null;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);

    // Initial check
    this.checkConnection();
  }

  private handleOnline = async () => {
    console.log('Connection restored');
    this.isOnline = true;
    
    // Notify listeners
    this.notifyListeners();
    
    // Try to sync pending actions
    await this.syncPendingActions();
  };

  private handleOffline = () => {
    console.log('Connection lost');
    this.isOnline = false;
    
    // Notify listeners
    this.notifyListeners();
  };

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.isOnline));
  }

  private async syncPendingActions() {
    if (this.isOnline) {
      try {
        await indexedDBService.syncWithServer();
      } catch (error) {
        console.error('Error syncing pending actions:', error);
      }
    }
  }

  // Public methods
  public checkConnection(): boolean {
    // More sophisticated connection check could be implemented here
    this.isOnline = navigator.onLine;
    return this.isOnline;
  }

  public getStatus(): boolean {
    return this.isOnline;
  }

  public addListener(listener: ConnectivityListener) {
    this.listeners.push(listener);
    // Immediately notify the new listener of the current status
    listener(this.isOnline);
    return () => this.removeListener(listener);
  }

  public removeListener(listener: ConnectivityListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  public startPeriodicSync(intervalMs: number = 60000) {
    // Clear any existing interval
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    // Set up new interval
    this.syncInterval = window.setInterval(async () => {
      if (this.isOnline) {
        await this.syncPendingActions();
      }
    }, intervalMs);
  }

  public stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  public cleanup() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.stopPeriodicSync();
  }
}

export const connectivityService = new ConnectivityService(); 