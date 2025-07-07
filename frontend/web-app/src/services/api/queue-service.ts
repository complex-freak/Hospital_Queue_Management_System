import { Patient } from '@/types/patient';
import api from './client';
import { 
  transformToFrontendAppointment, 
  transformToBackendAppointment,
  transformToFrontendQueueData,
  transformToBackendQueueData
} from './data-transformers';
import { ApiError } from './types';

export interface QueueStats {
  totalWaiting: number;
  averageWaitTime: number;
  highPriorityCount: number;
  availableDoctors: number;
  totalDoctors: number;
  totalPatientsToday: number;
  completedAppointments: number;
  cancelledAppointments: number;
}

export interface QueueUpdateData {
  priorityScore?: number;
  status?: 'waiting' | 'called' | 'served' | 'cancelled';
  estimatedWaitTime?: number;
}

export const queueService = {
  // Get patient queue
  getQueue: async () => {
    try {
      const response = await api.get('/staff/queue');
      
      return { 
        success: true, 
        data: Array.isArray(response.data) 
          ? response.data.map((item: unknown) => transformToFrontendQueueData(item))
          : [] 
      };
    } catch (error: unknown) {
      console.error('Error fetching queue:', error);
      return { success: false, error: 'Failed to fetch queue' };
    }
  },
  
  // Get queue statistics
  getQueueStats: async (): Promise<{ success: boolean; data?: QueueStats; error?: string }> => {
    try {
      const response = await api.get('/staff/queue/stats');
      
      // Transform backend snake_case to frontend camelCase
      const stats = response.data;
      const transformedStats: QueueStats = {
        totalWaiting: stats.total_waiting || 0,
        averageWaitTime: stats.average_wait_time || 0,
        highPriorityCount: stats.high_priority_count || 0,
        availableDoctors: stats.available_doctors || 0,
        totalDoctors: stats.total_doctors || 0,
        totalPatientsToday: stats.total_patients_today || 0,
        completedAppointments: stats.completed_appointments || 0,
        cancelledAppointments: stats.cancelled_appointments || 0
      };
      
      return {
        success: true,
        data: transformedStats
      };
    } catch (error: unknown) {
      console.error('Error fetching queue statistics:', error);
      
      // Return default statistics if the endpoint fails
      // This allows the UI to continue functioning even if the backend endpoint has an issue
      return { 
        success: true, 
        data: {
          totalWaiting: 0,
          averageWaitTime: 0,
          highPriorityCount: 0,
          availableDoctors: 0,
          totalDoctors: 0,
          totalPatientsToday: 0,
          completedAppointments: 0,
          cancelledAppointments: 0
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
        data: transformToFrontendQueueData(response.data)
      };
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      console.error('Error skipping patient:', error);
      return { success: false, error: 'Failed to skip patient' };
    }
  },
  
  // Update queue entry
  updateQueueEntry: async (queueId: string, data: QueueUpdateData) => {
    try {
      // Transform frontend data to backend format
      const backendData = transformToBackendQueueData(data);
      
      const response = await api.put(`/staff/queue/${queueId}`, backendData);
      
      // Transform the response back to frontend format
      try {
        return {
          success: true,
          data: transformToFrontendQueueData(response.data)
        };
      } catch (transformError) {
        console.warn('Could not transform queue update response:', transformError);
        // Return the raw response if transformation fails
        return {
          success: true,
          data: response.data
        };
      }
    } catch (error: unknown) {
      console.error('Error updating queue entry:', error);
      return { success: false, error: 'Failed to update queue entry' };
    }
  },

  // Create new queue entry
  createQueueEntry: async (appointmentId: string, queueData?: Partial<QueueUpdateData>) => {
    try {
      const backendData = {
        appointment_id: appointmentId,
        ...(queueData && transformToBackendQueueData(queueData))
      };
      
      const response = await api.post('/staff/queue', backendData);
      
      return {
        success: true,
        data: transformToFrontendQueueData(response.data)
      };
    } catch (error: unknown) {
      console.error('Error creating queue entry:', error);
      return { success: false, error: 'Failed to create queue entry' };
    }
  },

  // Get queue status for specific patient
  getPatientQueueStatus: async (patientId: string) => {
    try {
      const response = await api.get(`/patients/queue-status`);
      
      return {
        success: true,
        data: response.data ? transformToFrontendQueueData(response.data) : null
      };
    } catch (error: unknown) {
      console.error('Error fetching patient queue status:', error);
      return { success: false, error: 'Failed to fetch queue status' };
    }
  },

  // Update appointment priority
  updateAppointmentPriority: async (appointmentId: string, priority: 'high' | 'normal' | 'low') => {
    try {
      const urgencyMap = {
        high: 'urgent',
        normal: 'normal',
        low: 'low'
      };
      
      const response = await api.patch(`/staff/appointments/${appointmentId}/priority`, {
        urgency: urgencyMap[priority]
      });
      
      return {
        success: true,
        data: transformToFrontendAppointment(response.data)
      };
    } catch (error: unknown) {
      console.error('Error updating appointment priority:', error);
      return { success: false, error: 'Failed to update appointment priority' };
    }
  },

  // Assign patient to doctor
  assignPatientToDoctor: async (appointmentId: string, doctorId: string) => {
    try {
      const response = await api.patch(`/staff/appointments/${appointmentId}/assign`, {
        doctor_id: doctorId
      });
      
      return {
        success: true,
        data: transformToFrontendAppointment(response.data)
      };
    } catch (error: unknown) {
      console.error('Error assigning patient to doctor:', error);
      return { success: false, error: 'Failed to assign patient to doctor' };
    }
  }
};
