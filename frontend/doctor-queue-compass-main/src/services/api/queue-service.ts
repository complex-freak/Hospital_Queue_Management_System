
import { Patient } from '@/types/patient';
import api from './client';
import { mockQueue } from './mock-data';

export const queueService = {
  // Get patient queue for doctor
  getQueue: async () => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.get('/api/doctor/queue');
      // return response.data;
      
      // For now, return mock data
      return { success: true, data: mockQueue };
    } catch (error) {
      console.error('Error fetching queue:', error);
      throw error;
    }
  },
  
  // Mark patient as seen
  markPatientSeen: async (patientId: string) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.post('/api/queue/seen', { patientId });
      // return response.data;
      
      // For now, return mock success response
      return { success: true, message: 'Patient marked as seen' };
    } catch (error) {
      console.error('Error marking patient as seen:', error);
      throw error;
    }
  },
  
  // Skip patient in queue
  skipPatient: async (patientId: string) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.post('/api/queue/skip', { patientId });
      // return response.data;
      
      // For now, return mock success response
      return { success: true, message: 'Patient skipped' };
    } catch (error) {
      console.error('Error skipping patient:', error);
      throw error;
    }
  },
};
