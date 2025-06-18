import api from './client';

export interface NotificationPayload {
  type: 'sms' | 'email' | 'app' | 'all';
  patientId: string;
  message: string;
  subject?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface NotificationResponse {
  id: string;
  recipient: string;
  message: string;
  type: string;
  status: 'sent' | 'delivered' | 'failed';
  createdAt: string;
}

export const notificationService = {
  // Send notification to patient
  sendNotification: async (patientId: string, message: string, type: 'sms' | 'email' | 'app' | 'all' = 'sms') => {
    try {
      const response = await api.post('/staff/notifications', { 
        patient_id: patientId, 
        message, 
        type 
      });
      
      return { 
        success: true, 
        message: 'Notification sent',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to send notification'
      };
    }
  },
  
  // Send notification to multiple patients
  sendBulkNotifications: async (patientIds: string[], message: string, type: 'sms' | 'email' | 'app' | 'all' = 'sms') => {
    try {
      const response = await api.post('/staff/notifications/bulk', { 
        patient_ids: patientIds, 
        message, 
        type 
      });
      
      return { 
        success: true, 
        message: 'Bulk notifications sent',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error sending bulk notifications:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to send bulk notifications'
      };
    }
  },
  
  // Get notification history
  getNotificationHistory: async (patientId?: string) => {
    try {
      const endpoint = patientId 
        ? `/staff/notifications/patient/${patientId}` 
        : '/staff/notifications';
        
      const response = await api.get(endpoint);
      
      return { 
        success: true, 
        data: response.data.map((notification: any) => ({
          id: notification.id,
          recipient: notification.recipient_name || notification.recipient_id,
          message: notification.message,
          type: notification.type,
          status: notification.status,
          createdAt: notification.created_at
        }))
      };
    } catch (error: any) {
      console.error('Error fetching notification history:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch notification history'
      };
    }
  },
  
  // Create template
  createTemplate: async (name: string, content: string, type: 'sms' | 'email') => {
    try {
      const response = await api.post('/staff/notifications/templates', {
        name,
        content,
        type
      });
      
      return {
        success: true,
        message: 'Template created successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error creating notification template:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to create template'
      };
    }
  },
  
  // Get templates
  getTemplates: async (type?: 'sms' | 'email') => {
    try {
      const endpoint = type 
        ? `/staff/notifications/templates?type=${type}`
        : '/staff/notifications/templates';
        
      const response = await api.get(endpoint);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching notification templates:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch templates'
      };
    }
  }
};

export default notificationService;
