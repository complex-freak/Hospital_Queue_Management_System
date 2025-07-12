import api from './client';
import { 
  transformToFrontendNotification, 
  transformToBackendNotification 
} from './data-transformers';
import { ApiError } from './types';

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

export interface NotificationTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: 'sms' | 'email';
  variables?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface NotificationFromTemplate {
  templateId: string;
  recipient: string;
  patientId?: string;
  userId?: string;
  referenceId?: string;
  variables?: Record<string, unknown>;
}

export const notificationService = {
  // Send notification to patient
  sendNotification: async (patientId: string, message: string, type: 'sms' | 'email' | 'app' | 'all' = 'sms') => {
    try {
      const notificationData = {
        patientId,
        message,
        type,
        recipient: patientId // Using patientId as recipient for now
      };
      
      const backendData = transformToBackendNotification(notificationData);
      
      const response = await api.post('/staff/notifications', backendData);
      
      return { 
        success: true, 
        message: 'Notification sent',
        data: transformToFrontendNotification(response.data)
      };
    } catch (error: unknown) {
      console.error('Error sending notification:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to send notification'
      };
    }
  },

  // Send notification to patient (doctor endpoint)
  sendDoctorNotification: async (patientId: string, message: string, subject?: string) => {
    try {
      const notificationData = {
        message,
        subject: subject || "Message from your doctor"
      };
      
      const response = await api.post(`/doctor/patients/${patientId}/notify`, notificationData);
      
      return { 
        success: true, 
        message: 'Notification sent',
        data: response.data
      };
    } catch (error: unknown) {
      console.error('Error sending doctor notification:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to send notification'
      };
    }
  },
  
  // Send notification to multiple patients
  sendBulkNotifications: async (patientIds: string[], message: string, type: 'sms' | 'email' | 'app' | 'all' = 'sms') => {
    try {
      const notifications = patientIds.map(patientId => ({
        patientId,
        message,
        type,
        recipient: patientId
      }));
      
      const backendData = {
        notifications: notifications.map(notification => transformToBackendNotification(notification)),
        send_immediately: true
      };
      
      const response = await api.post('/staff/notifications/bulk', backendData);
      
      return { 
        success: true, 
        message: 'Bulk notifications sent',
        data: Array.isArray(response.data) 
          ? response.data.map((notification) => transformToFrontendNotification(notification as {
              id: string;
              patient_id?: string;
              user_id?: string;
              type?: string;
              recipient?: string;
              subject?: string;
              message: string;
              is_read?: boolean;
              status?: string;
              sent_at?: string;
              created_at?: string;
              updated_at?: string;
            }))
          : []
      };
    } catch (error: unknown) {
      console.error('Error sending bulk notifications:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to send bulk notifications'
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
        data: Array.isArray(response.data) 
          ? response.data.map((notification) => transformToFrontendNotification(notification as {
              id: string;
              patient_id?: string;
              user_id?: string;
              type?: string;
              recipient?: string;
              subject?: string;
              message: string;
              is_read?: boolean;
              status?: string;
              sent_at?: string;
              created_at?: string;
              updated_at?: string;
            }))
          : []
      };
    } catch (error: unknown) {
      console.error('Error fetching notification history:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to fetch notification history'
      };
    }
  },
  
  // Create template
  createTemplate: async (name: string, content: string, type: 'sms' | 'email') => {
    try {
      const templateData = {
        name,
        subject: name, // Using name as subject for SMS templates
        body: content,
        type,
        is_active: true
      };
      
      const response = await api.post('/staff/notifications/templates', templateData);
      
      // Transform backend response to frontend format
      const template: NotificationTemplate = {
        id: response.data.id,
        name: response.data.name,
        subject: response.data.subject,
        body: response.data.body,
        type: response.data.type,
        variables: response.data.variables,
        isActive: response.data.is_active,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      };
      
      return {
        success: true,
        message: 'Template created successfully',
        data: template
      };
    } catch (error: unknown) {
      console.error('Error creating notification template:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to create template'
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
      
      // Transform backend response to frontend format
      const templates: NotificationTemplate[] = Array.isArray(response.data) 
        ? response.data.map((template) => ({
            id: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).id,
            name: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).name,
            subject: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).subject,
            body: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).body,
            type: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).type,
            variables: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).variables,
            isActive: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).is_active,
            createdAt: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).created_at,
            updatedAt: (template as {
              id: string;
              name: string;
              subject: string;
              body: string;
              type: 'sms' | 'email';
              variables?: Record<string, unknown>;
              is_active: boolean;
              created_at: string;
              updated_at?: string;
            }).updated_at
          }))
        : [];
      
      return {
        success: true,
        data: templates
      };
    } catch (error: unknown) {
      console.error('Error fetching notification templates:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to fetch templates'
      };
    }
  },

  // Get specific template
  getTemplate: async (templateId: string) => {
    try {
      const response = await api.get(`/staff/notifications/templates/${templateId}`);
      
      const template: NotificationTemplate = {
        id: response.data.id,
        name: response.data.name,
        subject: response.data.subject,
        body: response.data.body,
        type: response.data.type,
        variables: response.data.variables,
        isActive: response.data.is_active,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      };
      
      return {
        success: true,
        data: template
      };
    } catch (error: unknown) {
      console.error('Error fetching notification template:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to fetch template'
      };
    }
  },

  // Update template
  updateTemplate: async (templateId: string, updates: Partial<NotificationTemplate>) => {
    try {
      const backendUpdates: Record<string, unknown> = {};
      
      if (updates.name !== undefined) backendUpdates.name = updates.name;
      if (updates.subject !== undefined) backendUpdates.subject = updates.subject;
      if (updates.body !== undefined) backendUpdates.body = updates.body;
      if (updates.type !== undefined) backendUpdates.type = updates.type;
      if (updates.variables !== undefined) backendUpdates.variables = updates.variables;
      if (updates.isActive !== undefined) backendUpdates.is_active = updates.isActive;
      
      const response = await api.put(`/staff/notifications/templates/${templateId}`, backendUpdates);
      
      const template: NotificationTemplate = {
        id: response.data.id,
        name: response.data.name,
        subject: response.data.subject,
        body: response.data.body,
        type: response.data.type,
        variables: response.data.variables,
        isActive: response.data.is_active,
        createdAt: response.data.created_at,
        updatedAt: response.data.updated_at
      };
      
      return {
        success: true,
        message: 'Template updated successfully',
        data: template
      };
    } catch (error: unknown) {
      console.error('Error updating notification template:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to update template'
      };
    }
  },

  // Delete template
  deleteTemplate: async (templateId: string) => {
    try {
      await api.delete(`/staff/notifications/templates/${templateId}`);
      
      return {
        success: true,
        message: 'Template deleted successfully'
      };
    } catch (error: unknown) {
      console.error('Error deleting notification template:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to delete template'
      };
    }
  },

  // Send notification from template
  sendNotificationFromTemplate: async (templateRequest: NotificationFromTemplate) => {
    try {
      const backendData = {
        template_id: templateRequest.templateId,
        recipient: templateRequest.recipient,
        patient_id: templateRequest.patientId,
        user_id: templateRequest.userId,
        reference_id: templateRequest.referenceId,
        variables: templateRequest.variables
      };
      
      const response = await api.post('/staff/notifications/send-from-template', backendData);
      
      return {
        success: true,
        message: 'Notification sent from template',
        data: transformToFrontendNotification(response.data)
      };
    } catch (error: unknown) {
      console.error('Error sending notification from template:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to send notification from template'
      };
    }
  },

  // Mark notification as read
  markNotificationAsRead: async (notificationId: string) => {
    try {
      const response = await api.patch(`/staff/notifications/${notificationId}`, {
        is_read: true
      });
      
      return {
        success: true,
        data: transformToFrontendNotification(response.data)
      };
    } catch (error: unknown) {
      console.error('Error marking notification as read:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to mark notification as read'
      };
    }
  },

  // Mark all notifications as read for a patient
  markAllNotificationsAsRead: async (patientId: string) => {
    try {
      await api.patch(`/staff/notifications/patient/${patientId}/mark-read`);
      
      return {
        success: true,
        message: 'All notifications marked as read'
      };
    } catch (error: unknown) {
      console.error('Error marking all notifications as read:', error);
      const apiError = error as ApiError;
      return {
        success: false,
        error: apiError.response?.data?.detail || 'Failed to mark notifications as read'
      };
    }
  }
};

export default notificationService;
