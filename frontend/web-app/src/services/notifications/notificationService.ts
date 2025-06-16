type NotificationType = 'info' | 'success' | 'warning' | 'error';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  read: boolean;
  data?: any;
}

type NotificationListener = (notifications: Notification[]) => void;

class NotificationService {
  private notifications: Notification[] = [];
  private listeners: NotificationListener[] = [];
  private maxNotifications: number = 100;

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
  public addNotification(title: string, message: string, type: NotificationType = 'info', data?: any): Notification {
    const notification: Notification = {
      id: `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title,
      message,
      type,
      timestamp: Date.now(),
      read: false,
      data
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

  public markAsRead(id: string) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  public markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.saveToStorage();
    this.notifyListeners();
  }

  public removeNotification(id: string) {
    this.notifications = this.notifications.filter(n => n.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  public clearAllNotifications() {
    this.notifications = [];
    this.saveToStorage();
    this.notifyListeners();
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