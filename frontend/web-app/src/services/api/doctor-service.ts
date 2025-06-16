import api from './client';
import { ProfileData } from './types';
import { Patient, ConsultationFeedback, NoteVersion } from '@/types/patient';
import { mockPatientDetails } from './mock-data';

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

  // Get detailed patient information
  getPatientDetails: async (patientId: string) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.get(`/api/patients/${patientId}`);
      // return response.data;
      
      // For now, use mock data
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Find the patient in our mock data or create a generic one
      const mockPatient = mockPatientDetails[patientId] || {
        ...mockPatientDetails.default,
        id: patientId
      };
      
      return { success: true, data: mockPatient };
    } catch (error) {
      console.error('Error fetching patient details:', error);
      throw error;
    }
  },

  // Save medical notes for a patient
  savePatientNotes: async (patientId: string, notes: string) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.post(`/api/patients/${patientId}/notes`, { notes });
      // return response.data;
      
      // For now, return mock success response after a short delay
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, message: 'Notes saved successfully' };
    } catch (error) {
      console.error('Error saving patient notes:', error);
      throw error;
    }
  },

  // Get note history for a patient
  getNoteHistory: async (patientId: string) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.get(`/api/patients/${patientId}/notes/history`);
      // return response.data;
      
      // For now, generate mock note history
      await new Promise(resolve => setTimeout(resolve, 400));
      
      // Generate some fake history for demo purposes
      const mockHistory: NoteVersion[] = [
        {
          id: '1',
          content: '<p>Initial assessment: Patient presents with fever and headache for two days.</p>',
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
          doctorName: 'Dr. Sarah Johnson'
        },
        {
          id: '2',
          content: '<p>Follow-up: Fever has subsided, still has mild headache.</p><p>Recommended continued rest and hydration.</p>',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
          doctorName: 'Dr. Michael Chen'
        },
        {
          id: '3',
          content: '<p>Second follow-up: All symptoms have cleared. Patient is ready to return to normal activities.</p><ul><li>Headache: Gone</li><li>Fever: None</li><li>Energy levels: Normal</li></ul>',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          doctorName: 'Dr. Elizabeth Taylor'
        }
      ];
      
      return { success: true, data: mockHistory };
    } catch (error) {
      console.error('Error fetching note history:', error);
      throw error;
    }
  },

  // Save a new version of notes
  saveNoteVersion: async (patientId: string, content: string) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.post(`/api/patients/${patientId}/notes/versions`, { content });
      // return response.data;
      
      // For now, return mock success response after a short delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      const newVersion: NoteVersion = {
        id: Date.now().toString(),
        content,
        timestamp: new Date().toISOString(),
        doctorName: 'Dr. Current User' // In a real app, this would be the logged-in doctor's name
      };
      
      return { success: true, data: newVersion, message: 'Note version saved successfully' };
    } catch (error) {
      console.error('Error saving note version:', error);
      throw error;
    }
  },

  // Submit consultation feedback
  submitConsultation: async (consultationData: ConsultationFeedback) => {
    try {
      // In a real app, this would be an actual API call
      // const response = await api.post('/api/consultations', consultationData);
      // return response.data;
      
      // For now, return mock success response after a short delay
      await new Promise(resolve => setTimeout(resolve, 800));
      return { success: true, message: 'Consultation submitted successfully' };
    } catch (error) {
      console.error('Error submitting consultation:', error);
      throw error;
    }
  }
};
