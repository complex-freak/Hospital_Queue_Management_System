import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { NotificationsProvider, useNotifications } from '../../src/context/NotificationsContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ExpoNotifications from 'expo-notifications';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
}));

describe('NotificationsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
  });

  it('provides initial notifications state', async () => {
    // Mock AsyncStorage to return no notifications
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));

    const wrapper = ({ children }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Wait for notifications to load
    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    // Should have empty notifications by default
    expect(result.current.state.notifications).toEqual([]);
    expect(result.current.state.error).toBeNull();
  });

  it('loads notifications from AsyncStorage on mount', async () => {
    // Mock notifications in AsyncStorage
    const mockNotifications = [
      {
        id: '1',
        title: 'Test Notification',
        message: 'This is a test notification',
        read: false,
        createdAt: '2023-05-01T12:00:00.000Z',
      }
    ];

    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(JSON.stringify(mockNotifications)));

    const wrapper = ({ children }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Wait for notifications to load
    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    // Should have loaded notifications from AsyncStorage
    expect(result.current.state.notifications).toEqual(mockNotifications);
  });

  it('adds a notification correctly', async () => {
    // Mock AsyncStorage
    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(null));
    AsyncStorage.setItem.mockImplementation(() => Promise.resolve());

    const wrapper = ({ children }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Wait for initial loading
    await waitFor(() => {
      expect(result.current.state.loading).toBe(false);
    });

    // Add a notification
    await act(async () => {
      await result.current.addNotification('Test Title', 'Test Message');
    });

    // Verify notification was added
    expect(result.current.state.notifications.length).toBe(1);
    expect(result.current.state.notifications[0].title).toBe('Test Title');
    expect(result.current.state.notifications[0].message).toBe('Test Message');
    expect(result.current.state.notifications[0].read).toBe(false);

    // Should have saved to AsyncStorage
    expect(AsyncStorage.setItem).toHaveBeenCalled();
    
    // Should have called Expo Notifications
    expect(ExpoNotifications.scheduleNotificationAsync).toHaveBeenCalled();
  });

  it('marks a notification as read', async () => {
    // Set up a notification
    const mockNotifications = [
      {
        id: '123',
        title: 'Test Notification',
        message: 'This is a test notification',
        read: false,
        createdAt: '2023-05-01T12:00:00.000Z',
      }
    ];

    AsyncStorage.getItem.mockImplementation(() => Promise.resolve(JSON.stringify(mockNotifications)));
    AsyncStorage.setItem.mockImplementation(() => Promise.resolve());

    const wrapper = ({ children }) => (
      <NotificationsProvider>{children}</NotificationsProvider>
    );

    const { result } = renderHook(() => useNotifications(), { wrapper });

    // Wait for notifications to load
    await waitFor(() => {
      expect(result.current.state.notifications).toEqual(mockNotifications);
    });

    // Mark as read
    await act(async () => {
      await result.current.markAsRead('123');
    });

    // Should be marked as read
    expect(result.current.state.notifications[0].read).toBe(true);
    
    // Should have saved to AsyncStorage
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
}); 