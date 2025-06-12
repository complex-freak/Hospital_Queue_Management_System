
import api from './client';
import { ProfileData } from './types';

export const doctorService = {
  // Update doctor availability status
  updateStatus: async (status: { isAvailable: boolean; shiftStart?: string; shiftEnd?: string }) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.post('/api/doctor/status', status);
      // return response.data;
      
      // For now, return mock success response
      return { success: true, message: 'Status updated successfully' };
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  },

  // Update doctor profile
  updateProfile: async (profileData: ProfileData) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.put('/api/doctor/profile', profileData);
      // return response.data;
      
      // For now, return mock success response after a short delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true, message: 'Profile updated successfully' };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },
};
