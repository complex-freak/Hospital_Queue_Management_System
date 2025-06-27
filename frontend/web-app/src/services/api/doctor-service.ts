import api from './client';
import { ProfileData } from './types';
import { Patient, ConsultationFeedback, NoteVersion } from '@/types/patient';
import { authService } from './auth-service';
import { 
  transformToFrontendUser, 
  transformToFrontendPatientNote, 
  transformToFrontendConsultationFeedback,
  transformToBackendPatientNote,
  transformToBackendConsultationFeedback
} from './data-transformers';

export const doctorService = {
  // Get doctor profile
  getDoctorProfile: async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const response = await api.get('/doctor/me');
      
      return { 
        success: true, 
        data: {
          id: response.data.id,
          userId: response.data.user_id,
          isAvailable: response.data.is_available,
          specialization: response.data.specialization,
          department: response.data.department,
          licenseNumber: response.data.license_number,
          consultationFee: response.data.consultation_fee,
          shiftStart: response.data.shift_start,
          shiftEnd: response.data.shift_end,
          // Transform additional fields as needed
        }
      };
    } catch (error: any) {
      console.error('Error fetching doctor profile:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch doctor profile'
      };
    }
  },

  // Update doctor availability status
  updateStatus: async (status: { isAvailable: boolean; shiftStart?: string; shiftEnd?: string }) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const response = await api.put('/doctor/status', {
        is_available: status.isAvailable,
        shift_start: status.shiftStart,
        shift_end: status.shiftEnd
      });
      
      return { 
        success: true, 
        message: 'Status updated successfully',
        data: {
          id: response.data.id,
          userId: response.data.user_id,
          isAvailable: response.data.is_available,
          specialization: response.data.specialization,
          department: response.data.department,
          shiftStart: response.data.shift_start,
          shiftEnd: response.data.shift_end,
        }
      };
    } catch (error: any) {
      console.error('Error updating status:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update status'
      };
    }
  },

  // Update doctor profile
  updateProfile: async (profileData: ProfileData) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      const response = await api.put('/doctor/profile', {
        specialization: profileData.specialization,
        license_number: profileData.licenseNumber,
        department: profileData.department,
        consultation_fee: profileData.consultationFee,
        bio: profileData.bio,
        education: profileData.education,
        experience: profileData.experience
      });
      
      return { 
        success: true, 
        message: 'Profile updated successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update profile'
      };
    }
  },

  // Get detailed patient information
  getPatientDetails: async (patientId: string) => {
    try {
      const response = await api.get(`/doctor/patients/${patientId}`);
      
      return {
        success: true,
        data: transformToFrontendUser(response.data)
      };
    } catch (error: any) {
      console.error('Error fetching patient details:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch patient details'
      };
    }
  },

  // Save medical notes for a patient
  savePatientNotes: async (patientId: string, notes: string) => {
    try {
      const noteData = transformToBackendPatientNote({
        content: notes,
        patientId: patientId
      });
      
      const response = await api.post(`/doctor/patients/${patientId}/notes`, noteData);
      
      return { 
        success: true, 
        message: 'Notes saved successfully',
        data: transformToFrontendPatientNote(response.data)
      };
    } catch (error: any) {
      console.error('Error saving patient notes:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to save notes'
      };
    }
  },

  // Get patient notes
  getPatientNotes: async (patientId: string) => {
    try {
      const response = await api.get(`/doctor/patients/${patientId}/notes`);
      
      // Transform notes data to match frontend format
      const transformedNotes = response.data.map((note: any) => 
        transformToFrontendPatientNote(note)
      );
      
      return { 
        success: true, 
        data: transformedNotes 
      };
    } catch (error: any) {
      console.error('Error fetching patient notes:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch patient notes',
        data: []
      };
    }
  },

  // Get note history for a specific note
  getNoteHistory: async (noteId: string) => {
    try {
      const response = await api.get(`/doctor/notes/${noteId}/history`);
      
      // Transform history data to match frontend format
      const transformedHistory = response.data.map((note: any) => 
        transformToFrontendPatientNote(note)
      );
      
      return { 
        success: true, 
        data: transformedHistory 
      };
    } catch (error: any) {
      console.error('Error fetching note history:', error);
      
      // If endpoint is not yet implemented, return empty array
      if (error.response?.status === 404) {
        return {
          success: true,
          data: []
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch notes history',
        data: []
      };
    }
  },

  // Submit consultation feedback
  submitConsultation: async (appointmentId: string, consultationData: ConsultationFeedback) => {
    try {
      const feedbackData = transformToBackendConsultationFeedback(consultationData);
      
      const response = await api.post(`/doctor/appointments/${appointmentId}/feedback`, feedbackData);
      
      return { 
        success: true, 
        message: 'Consultation submitted successfully',
        data: transformToFrontendConsultationFeedback(response.data)
      };
    } catch (error: any) {
      console.error('Error submitting consultation:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to submit consultation'
      };
    }
  },
  
  // Get consultation feedback for an appointment
  getConsultationFeedback: async (appointmentId: string) => {
    try {
      const response = await api.get(`/doctor/appointments/${appointmentId}/feedback`);
      
      return { 
        success: true, 
        data: transformToFrontendConsultationFeedback(response.data)
      };
    } catch (error: any) {
      console.error('Error fetching consultation feedback:', error);
      
      // If feedback doesn't exist yet
      if (error.response?.status === 404) {
        return {
          success: true,
          data: null
        };
      }
      
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch consultation feedback'
      };
    }
  },
  
  // Update consultation feedback
  updateConsultationFeedback: async (feedbackId: string, consultationData: Partial<ConsultationFeedback>) => {
    try {
      const feedbackData = transformToBackendConsultationFeedback(consultationData);
      
      const response = await api.put(`/doctor/feedback/${feedbackId}`, feedbackData);
      
      return { 
        success: true, 
        message: 'Consultation feedback updated successfully',
        data: transformToFrontendConsultationFeedback(response.data)
      };
    } catch (error: any) {
      console.error('Error updating consultation feedback:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to update consultation feedback'
      };
    }
  },
  
  // Get doctor queue
  getDoctorQueue: async () => {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const response = await api.get('/doctor/queue');
      
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching doctor queue:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch doctor queue',
        data: []
      };
    }
  },
  
  // Get next patient
  getNextPatient: async () => {
    try {
      const response = await api.get('/doctor/queue/next');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching next patient:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch next patient'
      };
    }
  },
  
  // Mark patient as served
  markPatientServed: async (queueId: string, notes?: string) => {
    try {
      const response = await api.post(`/doctor/queue/${queueId}/serve`, { notes });
      return {
        success: true,
        data: response.data,
        message: 'Patient marked as served'
      };
    } catch (error: any) {
      console.error('Error marking patient as served:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to mark patient as served'
      };
    }
  },
  
  // Get dashboard stats
  getDashboardStats: async () => {
    try {
      const response = await api.get('/doctor/dashboard/stats');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch dashboard stats'
      };
    }
  },

  // Mark patient as seen
  markPatientSeen: async (queueId: string) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const response = await api.post(`/doctor/queue/${queueId}/serve`);
      
      return { 
        success: true, 
        data: response.data
      };
    } catch (error: any) {
      console.error('Error marking patient as seen:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to mark patient as seen'
      };
    }
  },

  // Skip patient
  skipPatient: async (queueId: string) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const response = await api.post(`/doctor/queue/${queueId}/skip`);
      
      return { 
        success: true, 
        data: response.data
      };
    } catch (error: any) {
      console.error('Error skipping patient:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to skip patient'
      };
    }
  }
};

export default doctorService;
