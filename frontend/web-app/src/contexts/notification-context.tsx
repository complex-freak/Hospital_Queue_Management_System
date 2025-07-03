import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { notificationService } from '@/services/notifications/notificationService';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  timestamp: number;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (title: string, message: string, type: string, data?: any) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user, isAuthenticated } = useAuth();
  
  // Initialize notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Load saved notifications from storage
      const savedNotifications = notificationService.getNotifications();
      if (savedNotifications) {
        setNotifications(savedNotifications);
      }
    }
  }, [isAuthenticated, user]);
  
  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;
  
  // Add a new notification
  const addNotification = (title: string, message: string, type: string = 'info', data?: any) => {
    const notification: Notification = {
      id: Date.now().toString(),
      title,
      message,
      type: type as 'info' | 'success' | 'warning' | 'error',
      read: false,
      timestamp: Date.now(),
      data
    };
    
    const updatedNotifications = [notification, ...notifications];
    setNotifications(updatedNotifications);
    notificationService.saveNotifications(updatedNotifications);
  };
  
  // Mark a notification as read
  const markAsRead = (id: string) => {
    const updatedNotifications = notifications.map(notification => 
      notification.id === id ? { ...notification, read: true } : notification
    );
    setNotifications(updatedNotifications);
    notificationService.saveNotifications(updatedNotifications);
  };
  
  // Mark all notifications as read
  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notification => ({
      ...notification,
      read: true
    }));
    setNotifications(updatedNotifications);
    notificationService.saveNotifications(updatedNotifications);
  };
  
  // Clear all notifications
  const clearNotifications = () => {
    setNotifications([]);
    notificationService.saveNotifications([]);
  };
  
  // Remove a specific notification
  const removeNotification = (id: string) => {
    const updatedNotifications = notifications.filter(notification => notification.id !== id);
    setNotifications(updatedNotifications);
    notificationService.saveNotifications(updatedNotifications);
  };
  
  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      addNotification,
      markAsRead,
      markAllAsRead,
      clearNotifications,
      removeNotification
    }}>
      {children}
    </NotificationContext.Provider>
  );
}; 