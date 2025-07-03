import { v4 as uuidv4 } from 'uuid';
import { Notification, NotificationType } from '../types/notification';
import { IndexedDBService } from './indexedDBService';

export class NotificationService {
  private notifications: Notification[] = [];
  private subscribers: Array<(notifications: Notification[]) => void> = [];

  constructor() {
    this.loadNotifications();
  }

  private async loadNotifications() {
    try {
      this.notifications = await IndexedDBService.getNotifications();
    } catch (error) {
      console.error('Failed to load notifications:', error);
      this.notifications = [];
    }
  }

  createNotification(data: {
    title: string;
    message: string;
    type: NotificationType;
  }): Notification {
    return {
      id: uuidv4(),
      title: data.title,
      message: data.message,
      type: data.type,
      timestamp: new Date(),
      read: false,
    };
  }

  addNotification(notification: Notification): void {
    this.notifications.push(notification);
    IndexedDBService.saveNotifications(this.notifications);
    this.notifySubscribers();
  }

  getNotifications(): Notification[] {
    return this.notifications;
  }

  markAsRead(id: string): void {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      IndexedDBService.saveNotifications(this.notifications);
      this.notifySubscribers();
    }
  }

  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    IndexedDBService.saveNotifications(this.notifications);
    this.notifySubscribers();
  }

  clearNotifications(): void {
    this.notifications = [];
    IndexedDBService.saveNotifications(this.notifications);
    this.notifySubscribers();
  }

  subscribe(callback: (notifications: Notification[]) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(subscriber => subscriber !== callback);
    };
  }

  notifySubscribers(): void {
    this.subscribers.forEach(callback => callback(this.notifications));
  }
} 