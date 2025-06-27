type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  read: boolean;
  data?: any;
  sourceId?: string; // ID from the server if it's from API
}

type NotificationListener = (notifications: Notification[]) => void;

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: NotificationListener[] = [];
  private maxNotifications: number = 100;
  private apiSyncEnabled: boolean = true;

  constructor() {
    // Load notifications from localStorage
    this.loadFromStorage();
  }

  private loadFromStorage() {
    try {
      const storedNotifications = localStorage.getItem('notifications');
      if (storedNotifications) {
        this.notifications = JSON.parse(storedNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications from storage:', error);
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications to storage:', error);
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.notifications]));
  }

  // Public methods
  public addNotification(title: string, message: string, type: NotificationType = 'info', data?: any, sourceId?: string): Notification {
    const notification: Notification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
      data,
      sourceId
    };

    // Add to the beginning of the array
    this.notifications.unshift(notification);

    // Limit the number of stored notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Save to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners();

    // Show browser notification if available
    this.showBrowserNotification(notification);

    return notification;
  }

  // Add API notification - used when receiving notifications from the server
  public addApiNotification(notification: any): Notification | null {
    // If we already have this notification (check by sourceId), don't add it again
    if (notification.id && this.notifications.some(n => n.sourceId === notification.id)) {
      return null;
    }

    return this.addNotification(
      notification.title || 'Notification',
      notification.message,
      notification.type || 'info',
      notification.data,
      notification.id
    );
  }

  // Import multiple notifications from API
  public importApiNotifications(apiNotifications: any[]): void {
    // Filter out notifications we already have
    const newNotifications = apiNotifications.filter(apiNotification => 
      !this.notifications.some(n => n.sourceId === apiNotification.id)
    );

    if (newNotifications.length === 0) return;

    // Add all new notifications
    newNotifications.forEach(notification => {
      this.notifications.unshift({
        id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: notification.title || 'Notification',
        message: notification.message,
        type: notification.type || 'info',
        timestamp: new Date(notification.created_at || Date.now()).getTime(),
        read: false,
        data: notification.data,
        sourceId: notification.id
      });
    });

    // Limit the number of stored notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // Save to storage
    this.saveToStorage();

    // Notify listeners
    this.notifyListeners();
  }

  public markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
      this.notifyListeners();
      
      // If this notification came from the API and sync is enabled, mark it as read on the server
      if (this.apiSyncEnabled && notification.sourceId) {
        this.syncNotificationReadStatus(notification.sourceId, true);
      }
    }
  }

  public markAllAsRead() {
    const unreadApiNotifications = this.notifications
      .filter(n => !n.read && n.sourceId)
      .map(n => n.sourceId as string);
    
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    
    this.saveToStorage();
    this.notifyListeners();
    
    // If API sync is enabled and there are API notifications, mark them as read on the server
    if (this.apiSyncEnabled && unreadApiNotifications.length > 0) {
      this.syncAllNotificationsReadStatus(unreadApiNotifications);
    }
  }

  public removeNotification(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.notifyListeners();
    
    // If this notification came from the API and sync is enabled, delete it on the server
    if (this.apiSyncEnabled && notification?.sourceId) {
      this.syncNotificationDeletion(notification.sourceId);
    }
  }

  public clearAllNotifications() {
    const apiNotificationIds = this.notifications
      .filter(n => n.sourceId)
      .map(n => n.sourceId as string);
    
    this.notifications = [];
    this.saveToStorage();
    this.notifyListeners();
    
    // If API sync is enabled and there are API notifications, delete them all on the server
    if (this.apiSyncEnabled && apiNotificationIds.length > 0) {
      this.syncAllNotificationsDeletion(apiNotificationIds);
    }
  }

  public getNotifications(): Notification[] {
    return [...this.notifications];
  }

  public getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  public addListener(listener: NotificationListener) {
    this.listeners.push(listener);
    // Immediately notify the new listener of the current notifications
    listener([...this.notifications]);
    return () => this.removeListener(listener);
  }

  public removeListener(listener: NotificationListener) {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  public enableApiSync() {
    this.apiSyncEnabled = true;
  }

  public disableApiSync() {
    this.apiSyncEnabled = false;
  }

  // API synchronization methods
  private async syncNotificationReadStatus(notificationId: string, read: boolean) {
    try {
      // This would be implemented to sync with the API
      console.log(`Syncing notification ${notificationId} read status: ${read}`);
      // Example:
      // await api.post(`/user/notifications/${notificationId}/read`, { read });
    } catch (error) {
      console.error('Error syncing notification read status:', error);
    }
  }

  private async syncAllNotificationsReadStatus(notificationIds: string[]) {
    try {
      // This would be implemented to sync with the API
      console.log(`Syncing all notifications read status: ${notificationIds.join(', ')}`);
      // Example:
      // await api.post('/user/notifications/read-all', { notification_ids: notificationIds });
    } catch (error) {
      console.error('Error syncing all notifications read status:', error);
    }
  }

  private async syncNotificationDeletion(notificationId: string) {
    try {
      // This would be implemented to sync with the API
      console.log(`Syncing notification deletion: ${notificationId}`);
      // Example:
      // await api.delete(`/user/notifications/${notificationId}`);
    } catch (error) {
      console.error('Error syncing notification deletion:', error);
    }
  }

  private async syncAllNotificationsDeletion(notificationIds: string[]) {
    try {
      // This would be implemented to sync with the API
      console.log(`Syncing all notifications deletion: ${notificationIds.join(', ')}`);
      // Example:
      // await api.post('/user/notifications/delete-all', { notification_ids: notificationIds });
    } catch (error) {
      console.error('Error syncing all notifications deletion:', error);
    }
  }

  private async showBrowserNotification(notification: Notification) {
    if (!('Notification' in window)) {
      return;
    }

    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: this.getIconForType(notification.type)
      });
    } else if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(notification.title, {
          body: notification.message,
          icon: this.getIconForType(notification.type)
        });
      }
    }
  }

  private getIconForType(type: NotificationType): string {
    // You would replace these with actual icon paths
    switch (type) {
      case 'success':
        return '/icons/success.png';
      case 'warning':
        return '/icons/warning.png';
      case 'error':
        return '/icons/error.png';
      case 'info':
      default:
        return '/icons/info.png';
    }
  }

  // Specific notification methods for queue events
  public notifyPatientAdded(patientName: string) {
    return this.addNotification(
      'New Patient Added',
      `${patientName} has been added to the queue.`,
      'info'
    );
  }

  public notifyPatientRemoved(patientName: string) {
    return this.addNotification(
      'Patient Removed',
      `${patientName} has been removed from the queue.`,
      'info'
    );
  }

  public notifyPriorityChanged(patientName: string, priority: string) {
    return this.addNotification(
      'Priority Changed',
      `${patientName}'s priority has been changed to ${priority}.`,
      'info'
    );
  }

  public notifyDoctorAssigned(patientName: string, doctorName: string) {
    return this.addNotification(
      'Doctor Assigned',
      `${patientName} has been assigned to ${doctorName}.`,
      'success'
    );
  }

  public notifyLongWaitTime(patientName: string, waitTime: string) {
    return this.addNotification(
      'Long Wait Time',
      `${patientName} has been waiting for ${waitTime}.`,
      'warning'
    );
  }

  public notifyOfflineAction(action: string) {
    return this.addNotification(
      'Offline Action',
      `${action} will be synced when you're back online.`,
      'warning'
    );
  }

  public notifySyncComplete() {
    return this.addNotification(
      'Sync Complete',
      'All offline changes have been synced with the server.',
      'success'
    );
  }
}

export const notificationService = new NotificationService(); 