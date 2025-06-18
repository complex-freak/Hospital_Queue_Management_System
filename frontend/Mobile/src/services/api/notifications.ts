import { Notification } from '../../types';
import httpClient, { ApiResponse } from './index';
import { API_PATHS } from '../../config/env';

// Types for API requests and responses
export interface NotificationResponse {
  id: string;
  patient_id: string;
  type: string;
  recipient: string;
  message: string;
  subject?: string;
  sent_at?: string;
  status: string;
  error_message?: string;
  created_at: string;
  read: boolean;
}

export interface DeviceTokenRequest {
  token: string;
  device_type: 'android' | 'ios' | 'web';
}

class NotificationService {
  /**
   * Get all notifications for the logged-in patient
   */
  public async getNotifications(): Promise<ApiResponse<NotificationResponse[]>> {
    return httpClient.get<NotificationResponse[]>(API_PATHS.NOTIFICATIONS.BASE);
  }

  /**
   * Mark a notification as read
   */
  public async markAsRead(id: string): Promise<ApiResponse<NotificationResponse>> {
    return httpClient.put<NotificationResponse>(API_PATHS.NOTIFICATIONS.READ(id), {});
  }

  /**
   * Delete a specific notification
   */
  public async deleteNotification(id: string): Promise<ApiResponse<any>> {
    return httpClient.delete<any>(`${API_PATHS.NOTIFICATIONS.BASE}/${id}`);
  }

  /**
   * Delete all notifications for the current user
   */
  public async deleteAllNotifications(): Promise<ApiResponse<any>> {
    return httpClient.delete<any>(`${API_PATHS.NOTIFICATIONS.BASE}`);
  }

  /**
   * Register device token for push notifications
   */
  public async registerDeviceToken(data: DeviceTokenRequest): Promise<ApiResponse<any>> {
    return httpClient.post<any>(API_PATHS.NOTIFICATIONS.DEVICE_TOKEN, data);
  }

  /**
   * Transform API notification data to frontend Notification type
   */
  public transformNotificationData(apiData: NotificationResponse): Notification {
    return {
      id: apiData.id,
      title: apiData.subject || 'Hospital App Notification',
      message: apiData.message,
      read: apiData.read || false,
      createdAt: apiData.created_at,
    };
  }
}

export const notificationService = new NotificationService();
export default notificationService;