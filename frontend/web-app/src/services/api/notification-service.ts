
import api from './client';

export const notificationService = {
  // Send notification to patient
  sendNotification: async (patientId: string, message: string) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.post('/api/notifications', { patientId, message });
      // return response.data;
      
      // For now, return mock success response
      return { success: true, message: 'Notification sent' };
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  },
};
