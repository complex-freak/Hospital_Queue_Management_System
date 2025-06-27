import api from './client';

export interface DashboardStats {
  totalPatients: number;
  activePatients: number;
  totalDoctors: number;
  activeDoctors: number;
  appointmentsToday: number;
  queueLength: number;
  averageWaitTime: number;
  systemUptime: number;
}

export interface AuditLogEntry {
  id: string;
  userId?: string;
  userType: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface SystemSettings {
  general: {
    systemName: string;
    hospitalName: string;
    language: string;
    timezone: string;
  };
  notifications: {
    enableSMS: boolean;
    enablePush: boolean;
    enableEmail: boolean;
    notifyQueueChanges: boolean;
    notifySystemEvents: boolean;
  };
  security: {
    sessionTimeout: number; // minutes
    passwordExpiry: number; // days
    failedLoginLimit: number;
    requireTwoFactor: boolean;
  };
  backup: {
    automaticBackups: boolean;
    backupFrequency: string; // daily, weekly, monthly
    backupTime: string; // 24h format
    retentionPeriod: number; // days
  };
}

export interface QueueSettings {
  priorityWeights: {
    high: number;
    medium: number;
    low: number;
    elderly: number;
    child: number;
    pregnant: number;
    waitTime: number;
  };
  rules: Array<{
    id: string;
    name: string;
    description: string;
    condition: string;
    action: string;
    enabled: boolean;
  }>;
}

// Admin service for the web app
export const adminService = {
  // Get dashboard stats
  getDashboardStats: async () => {
    try {
      const response = await api.get('/admin/dashboard/stats');
      return {
        success: true,
        data: {
          totalPatients: response.data.total_patients || 0,
          activePatients: response.data.active_patients || 0,
          totalDoctors: response.data.total_doctors || 0,
          activeDoctors: response.data.active_doctors || 0,
          appointmentsToday: response.data.appointments_today || 0,
          queueLength: response.data.active_queue_length || 0,
          averageWaitTime: response.data.average_wait_time || 0,
          systemUptime: response.data.system_uptime_days || 0
        }
      };
    } catch (error: any) {
      console.error('Get dashboard stats error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch dashboard statistics.'
      };
    }
  },
  
  // Get audit logs
  getAuditLogs: async (skip: number = 0, limit: number = 100, actionFilter?: string, userIdFilter?: string) => {
    try {
      let url = `/admin/audit-logs?skip=${skip}&limit=${limit}`;
      
      if (actionFilter) {
        url += `&action_filter=${actionFilter}`;
      }
      
      if (userIdFilter) {
        url += `&user_id_filter=${userIdFilter}`;
      }
      
      const response = await api.get(url);
      
      // Transform backend format to frontend format
      const logs = response.data.map((log: any) => ({
        id: log.id,
        userId: log.user_id,
        userType: log.user_type,
        action: log.action,
        resource: log.resource,
        resourceId: log.resource_id,
        details: log.details,
        ipAddress: log.ip_address,
        userAgent: log.user_agent,
        createdAt: log.created_at
      }));
      
      return {
        success: true,
        data: logs
      };
    } catch (error: any) {
      console.error('Get audit logs error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch audit logs.'
      };
    }
  },
  
  // Get system analytics
  getSystemAnalytics: async (days: number = 30) => {
    try {
      const response = await api.get(`/admin/analytics?days=${days}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get system analytics error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch system analytics.'
      };
    }
  },
  
  // Get queue analytics
  getQueueAnalytics: async (days: number = 30) => {
    try {
      const response = await api.get(`/admin/analytics/queue?days=${days}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get queue analytics error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch queue analytics.'
      };
    }
  },
  
  // Get appointment analytics
  getAppointmentAnalytics: async (days: number = 30) => {
    try {
      const response = await api.get(`/admin/analytics/appointments?days=${days}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get appointment analytics error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch appointment analytics.'
      };
    }
  },
  
  // Get doctor analytics
  getDoctorAnalytics: async (days: number = 30, doctorId?: string) => {
    try {
      let url = `/admin/analytics/doctors?days=${days}`;
      if (doctorId) {
        url += `&doctor_id=${doctorId}`;
      }
      
      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get doctor analytics error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch doctor analytics.'
      };
    }
  },
  
  // Get system overview
  getSystemOverview: async () => {
    try {
      const response = await api.get('/admin/analytics/system');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get system overview error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch system overview.'
      };
    }
  },
  
  // Get recent activity
  getRecentActivity: async (limit: number = 10) => {
    try {
      // This is a placeholder - the actual endpoint might be different
      // depending on your backend implementation
      const response = await api.get(`/admin/audit-logs?limit=${limit}&sort=desc`);
      
      // Transform backend format to frontend format
      const activities = response.data.map((log: any) => ({
        id: log.id,
        type: log.resource.toLowerCase(),
        user: log.user_type === 'system' ? 'System' : `${log.user_type} (${log.user_id})`,
        timestamp: new Date(log.created_at),
        details: log.details
      }));
      
      return {
        success: true,
        data: activities
      };
    } catch (error: any) {
      console.error('Get recent activity error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch recent activity.'
      };
    }
  },
  
  // For now, these are placeholder methods that would need to be implemented
  // when the backend provides the corresponding endpoints
  
  // Get system settings
  getSystemSettings: async (): Promise<{ success: boolean, data?: SystemSettings, error?: string }> => {
    try {
      // This would be replaced with an actual API call when available
      // const response = await api.get('/admin/settings');
      
      // For now, return mock data
      return {
        success: true,
        data: {
          general: {
            systemName: 'Hospital Queue System',
            hospitalName: 'City General Hospital',
            language: 'en',
            timezone: 'UTC+3',
          },
          notifications: {
            enableSMS: true,
            enablePush: true,
            enableEmail: false,
            notifyQueueChanges: true,
            notifySystemEvents: true,
          },
          security: {
            sessionTimeout: 30, // minutes
            passwordExpiry: 90, // days
            failedLoginLimit: 5,
            requireTwoFactor: false,
          },
          backup: {
            automaticBackups: true,
            backupFrequency: 'daily', // daily, weekly, monthly
            backupTime: '02:00', // 2 AM
            retentionPeriod: 30, // days
          }
        }
      };
    } catch (error: any) {
      console.error('Get system settings error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch system settings.'
      };
    }
  },
  
  // Update system settings
  updateSystemSettings: async (settings: SystemSettings): Promise<{ success: boolean, error?: string }> => {
    try {
      // This would be replaced with an actual API call when available
      // await api.put('/admin/settings', settings);
      
      // For now, simulate success
      console.log('Settings would be updated:', settings);
      return { success: true };
    } catch (error: any) {
      console.error('Update system settings error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to update system settings.'
      };
    }
  },
  
  // Get queue configuration
  getQueueConfiguration: async (): Promise<{ success: boolean, data?: QueueSettings, error?: string }> => {
    try {
      // This would be replaced with an actual API call when available
      // const response = await api.get('/admin/queue-configuration');
      
      // For now, return mock data
      return {
        success: true,
        data: {
          priorityWeights: {
            high: 10,
            medium: 5,
            low: 1,
            elderly: 3,
            child: 2,
            pregnant: 3,
            waitTime: 0.5, // per 10 minutes
          },
          rules: [
            {
              id: '1',
              name: 'Elderly Priority',
              description: 'Patients over 65 years old get elderly priority bonus',
              condition: 'age >= 65',
              action: 'addPriorityBonus("elderly")',
              enabled: true,
            },
            {
              id: '2',
              name: 'Child Priority',
              description: 'Children under 12 years old get child priority bonus',
              condition: 'age < 12',
              action: 'addPriorityBonus("child")',
              enabled: true,
            },
            {
              id: '3',
              name: 'Pregnant Priority',
              description: 'Pregnant patients get pregnancy priority bonus',
              condition: 'isPregnant === true',
              action: 'addPriorityBonus("pregnant")',
              enabled: true,
            },
            {
              id: '4',
              name: 'Long Wait Adjustment',
              description: 'Increase priority based on wait time',
              condition: 'waitTime > 30',
              action: 'addPriorityValue(waitTime / 10 * priorityWeights.waitTime)',
              enabled: true,
            },
          ]
        }
      };
    } catch (error: any) {
      console.error('Get queue configuration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch queue configuration.'
      };
    }
  },
  
  // Update queue configuration
  updateQueueConfiguration: async (configuration: QueueSettings): Promise<{ success: boolean, error?: string }> => {
    try {
      // This would be replaced with an actual API call when available
      // await api.put('/admin/queue-configuration', configuration);
      
      // For now, simulate success
      console.log('Queue configuration would be updated:', configuration);
      return { success: true };
    } catch (error: any) {
      console.error('Update queue configuration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to update queue configuration.'
      };
    }
  }
}; 