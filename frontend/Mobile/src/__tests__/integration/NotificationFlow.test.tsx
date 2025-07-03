// src/tests/integration/NotificationFlow.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { NotificationsProvider, useNotifications } from '../../context/NotificationsContext';
import { notificationService } from '../../services';

// Mock the notification service
jest.mock('../../services', () => ({
  notificationService: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    transformNotificationData: jest.fn(data => data),
  },
}));

// Test component
const TestComponent = () => {
  const { state, fetchNotifications, markAsRead } = useNotifications();
  
  return (
    <View>
      <Text testID="loading">{state.loading ? 'Loading' : 'Not Loading'}</Text>
      <Text testID="count">{state.notifications.length}</Text>
      <Button
        testID="fetch-button"
        title="Fetch Notifications"
        onPress={fetchNotifications}
      />
      <Button
        testID="mark-read-button"
        title="Mark as Read"
        onPress={() => markAsRead('test-id')}
      />
    </View>
  );
};

describe('NotificationsContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should fetch notifications', async () => {
    // Mock API response
    notificationService.getNotifications.mockResolvedValueOnce({
      isSuccess: true,
      data: [
        { id: '1', title: 'Test', message: 'Message', read: false, createdAt: '2023-01-01' },
      ],
    });
    
    const { getByTestId } = render(
      <NotificationsProvider>
        <TestComponent />
      </NotificationsProvider>
    );
    
    // Initial state
    expect(getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(getByTestId('count')).toHaveTextContent('0');
    
    // Trigger fetch
    fireEvent.press(getByTestId('fetch-button'));
    
    // Should be loading
    expect(getByTestId('loading')).toHaveTextContent('Loading');
    
    // Wait for fetch to complete
    await waitFor(() => {
      expect(getByTestId('loading')).toHaveTextContent('Not Loading');
      expect(getByTestId('count')).toHaveTextContent('1');
    });
  });
});