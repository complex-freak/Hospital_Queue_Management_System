import { NotificationService } from '../../../services/notificationService';
import { Notification, NotificationType } from '../../../types/notification';

// Mock the IndexedDB service
jest.mock('../../../services/indexedDBService', () => ({
  IndexedDBService: {
    saveNotifications: jest.fn(),
    getNotifications: jest.fn().mockResolvedValue([]),
  },
}));

describe('NotificationService', () => {
  let notificationService: NotificationService;
  
  beforeEach(() => {
    notificationService = new NotificationService();
    // Clear all mocks before each test
    jest.clearAllMocks();
    // Reset any event listeners
    jest.spyOn(notificationService, 'notifySubscribers').mockImplementation();
  });

  test('should create a new notification', () => {
    const notification = notificationService.createNotification({
      title: 'Test Notification',
      message: 'This is a test notification',
      type: NotificationType.INFO,
    });

    expect(notification).toHaveProperty('id');
    expect(notification.title).toBe('Test Notification');
    expect(notification.message).toBe('This is a test notification');
    expect(notification.type).toBe(NotificationType.INFO);
    expect(notification.timestamp).toBeDefined();
    expect(notification.read).toBe(false);
  });

  test('should add a notification', () => {
    jest.spyOn(notificationService, 'getNotifications').mockReturnValue([]);
    
    const notification: Notification = {
      id: '123',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: NotificationType.INFO,
      timestamp: new Date(),
      read: false,
    };

    notificationService.addNotification(notification);
    
    expect(notificationService.notifySubscribers).toHaveBeenCalled();
  });

  test('should mark a notification as read', () => {
    const notification: Notification = {
      id: '123',
      title: 'Test Notification',
      message: 'This is a test notification',
      type: NotificationType.INFO,
      timestamp: new Date(),
      read: false,
    };

    jest.spyOn(notificationService, 'getNotifications').mockReturnValue([notification]);
    
    notificationService.markAsRead('123');
    
    expect(notificationService.notifySubscribers).toHaveBeenCalled();
  });

  test('should mark all notifications as read', () => {
    const notifications: Notification[] = [
      {
        id: '123',
        title: 'Test Notification 1',
        message: 'This is test notification 1',
        type: NotificationType.INFO,
        timestamp: new Date(),
        read: false,
      },
      {
        id: '456',
        title: 'Test Notification 2',
        message: 'This is test notification 2',
        type: NotificationType.WARNING,
        timestamp: new Date(),
        read: false,
      },
    ];

    jest.spyOn(notificationService, 'getNotifications').mockReturnValue(notifications);
    
    notificationService.markAllAsRead();
    
    expect(notificationService.notifySubscribers).toHaveBeenCalled();
  });

  test('should clear notifications', () => {
    const notifications: Notification[] = [
      {
        id: '123',
        title: 'Test Notification 1',
        message: 'This is test notification 1',
        type: NotificationType.INFO,
        timestamp: new Date(),
        read: false,
      },
    ];

    jest.spyOn(notificationService, 'getNotifications').mockReturnValue(notifications);
    
    notificationService.clearNotifications();
    
    expect(notificationService.notifySubscribers).toHaveBeenCalled();
  });

  test('should subscribe and notify subscribers', () => {
    const mockCallback = jest.fn();
    
    notificationService.subscribe(mockCallback);
    
    // Manually call notifySubscribers since we mocked it earlier
    const originalNotify = notificationService.notifySubscribers;
    jest.spyOn(notificationService, 'notifySubscribers').mockRestore();
    
    const testNotifications: Notification[] = [];
    jest.spyOn(notificationService, 'getNotifications').mockReturnValue(testNotifications);
    
    notificationService.notifySubscribers();
    
    expect(mockCallback).toHaveBeenCalledWith(testNotifications);
    
    // Restore the mock for other tests
    jest.spyOn(notificationService, 'notifySubscribers').mockImplementation(originalNotify);
  });

  test('should unsubscribe correctly', () => {
    const mockCallback = jest.fn();
    
    const unsubscribe = notificationService.subscribe(mockCallback);
    
    // Unsubscribe the callback
    unsubscribe();
    
    // Manually call notifySubscribers
    const originalNotify = notificationService.notifySubscribers;
    jest.spyOn(notificationService, 'notifySubscribers').mockRestore();
    
    notificationService.notifySubscribers();
    
    // The callback should not be called after unsubscribing
    expect(mockCallback).not.toHaveBeenCalled();
    
    // Restore the mock for other tests
    jest.spyOn(notificationService, 'notifySubscribers').mockImplementation(originalNotify);
  });
}); 