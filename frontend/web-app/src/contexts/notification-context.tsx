import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { notificationService } from '@/services/notifications/notificationService';
import { NotificationType } from '@/types/notification';
import api from '@/services/api/client';
import { websocketService } from '@/services/notifications/websocketService';
import { useAuth } from '@/hooks/use-auth-context';

interface NotificationContextProps {
  notifications: any[];
  unreadCount: number;
  addNotification: (title: string, message: string, type?: NotificationType, data?: any) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  fetchNotifications: () => Promise<void>;
  isLoading: boolean;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    // Add listener for notifications
    const unsubscribe = notificationService.addListener((updatedNotifications) => {
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read).length);
    });

    // Initialize with current notifications
    setNotifications(notificationService.getNotifications());
    setUnreadCount(notificationService.getUnreadCount());

    // Fetch notifications from API when component mounts and user is authenticated
    if (isAuthenticated && user) {
      fetchNotifications();

      // Connect to WebSocket for real-time notifications
      try {
        websocketService.connect(user.id, localStorage.getItem('token') || '');
      } catch (error) {
        console.error('Failed to connect to WebSocket:', error);
      }
    }

    // Cleanup on unmount
    return () => {
      unsubscribe();
      if (isAuthenticated) {
        websocketService.disconnect();
      }
    };
  }, [isAuthenticated, user]);

  const addNotification = (title: string, message: string, type: NotificationType = NotificationType.INFO, data?: any) => {
    notificationService.addNotification(title, message, type, data);
  };

  const markAsRead = (id: string) => {
    notificationService.markAsRead(id);
  };

  const markAllAsRead = () => {
    notificationService.markAllAsRead();
  };

  const clearAll = () => {
    notificationService.clearAllNotifications();
  };

  const fetchNotifications = async () => {
    if (!isAuthenticated || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Fetch user notifications from the API
      const response = await api.get('/user/notifications');
      
      // Import the API notifications into the local service
      if (response.data && Array.isArray(response.data)) {
        notificationService.importApiNotifications(response.data);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      // If offline or API error, still show local notifications
      addNotification(
        'Offline Mode',
        'Using cached notifications while offline.',
        NotificationType.WARNING
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearAll,
        fetchNotifications,
        isLoading,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}; 