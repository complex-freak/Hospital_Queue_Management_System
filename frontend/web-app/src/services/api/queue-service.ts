import { Patient } from '@/types/patient';
import api from './client';
import { transformToFrontendAppointment } from './data-transformers';

export const queueService = {
  // Get patient queue
  getQueue: async () => {
    try {
      const response = await api.get('/staff/queue');
      
      return { 
        success: true, 
        data: Array.isArray(response.data) 
          ? response.data.map((item: any) => transformToFrontendAppointment(item))
          : [] 
      };
    } catch (error) {
      console.error('Error fetching queue:', error);
      return { success: false, error: 'Failed to fetch queue' };
    }
  },
  
  // Get queue statistics
  getQueueStats: async () => {
    try {
      const response = await api.get('/staff/queue/stats');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('Error fetching queue statistics:', error);
      
      // Return default statistics if the endpoint fails
      // This allows the UI to continue functioning even if the backend endpoint has an issue
      return { 
        success: true, 
        data: {
          total_waiting: 0,
          average_wait_time: 0,
          high_priority_count: 0,
          available_doctors: 0,
          total_doctors: 0,
          // Include additional stats that might be expected by the UI
          total_patients_today: 0,
          completed_appointments: 0,
          cancelled_appointments: 0
        }
      };
    }
  },
  
  // Mark patient as seen
  markPatientSeen: async (appointmentId: string) => {
    try {
      const response = await api.post(`/staff/queue/${appointmentId}/call-next`);
      
      return {
        success: true,
        data: transformToFrontendAppointment(response.data)
      };
    } catch (error) {
      console.error('Error marking patient as seen:', error);
      return { success: false, error: 'Failed to mark patient as seen' };
    }
  },
  
  // Skip patient in queue
  skipPatient: async (appointmentId: string) => {
    try {
      const response = await api.post(`/staff/appointments/${appointmentId}/cancel`, {
        reason: 'Skipped by staff'
      });
      
      return {
        success: true,
        data: {
          id: appointmentId,
          status: response.data.status || 'cancelled'
        }
      };
    } catch (error) {
      console.error('Error skipping patient:', error);
      return { success: false, error: 'Failed to skip patient' };
    }
  },
  
  // Update queue entry
  updateQueueEntry: async (queueId: string, data: any) => {
    try {
      const response = await api.put(`/staff/queue/${queueId}`, data);
      
      // Try to transform the response, but handle cases where it might not have the expected format
      try {
        return {
          success: true,
          data: transformToFrontendAppointment(response.data)
        };
      } catch (transformError) {
        console.warn('Could not transform queue update response:', transformError);
        // Return the raw response if transformation fails
        return {
          success: true,
          data: response.data
        };
      }
    } catch (error) {
      console.error('Error updating queue entry:', error);
      return { success: false, error: 'Failed to update queue entry' };
    }
  }
};
