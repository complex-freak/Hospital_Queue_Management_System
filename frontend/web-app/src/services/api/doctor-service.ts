import api from './client';
import { ProfileData } from './types';
import { Patient, ConsultationFeedback, NoteVersion } from '@/types/patient';
import { authService } from './auth-service';
import { transformToFrontendUser } from './data-transformers';

export const doctorService = {
  // Update doctor availability status
  updateStatus: async (status: { isAvailable: boolean; shiftStart?: string; shiftEnd?: string }) => {
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const response = await api.post('/doctor/status', {
        is_available: status.isAvailable,
        shift_start: status.shiftStart,
        shift_end: status.shiftEnd
      });
      
      return { 
        success: true, 
        message: 'Status updated successfully',
        data: response.data
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
      const response = await api.post(`/doctor/patients/${patientId}/notes`, { 
        content: notes 
      });
      
      return { 
        success: true, 
        message: 'Notes saved successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error saving patient notes:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to save notes'
      };
    }
  },

  // Get note history for a patient
  getNoteHistory: async (patientId: string) => {
    try {
      const response = await api.get(`/doctor/patients/${patientId}/notes/history`);
      
      // Transform history data to match frontend format
      const transformedHistory: NoteVersion[] = response.data.map((note: any) => ({
        id: note.id,
        content: note.content,
        timestamp: new Date(note.created_at).toISOString(),
        doctorName: note.doctor_name || 'Unknown Doctor'
      }));
      
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
        error: error.response?.data?.detail || 'Failed to fetch notes history'
      };
    }
  },

  // Save a new version of notes
  saveNoteVersion: async (patientId: string, content: string) => {
    try {
      const response = await api.post(`/doctor/patients/${patientId}/notes/versions`, { 
        content: content 
      });
      
      // Transform to frontend format
      const transformedNote: NoteVersion = {
        id: response.data.id,
        content: response.data.content,
        timestamp: new Date(response.data.created_at).toISOString(),
        doctorName: response.data.doctor_name || 'Unknown Doctor'
      };
      
      return { 
        success: true, 
        data: transformedNote, 
        message: 'Note version saved successfully' 
      };
    } catch (error: any) {
      console.error('Error saving note version:', error);
      
      // If endpoint is not yet implemented, fallback to regular notes
      if (error.response?.status === 404) {
        return doctorService.savePatientNotes(patientId, content);
      }
      
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to save note version'
      };
    }
  },

  // Submit consultation feedback
  submitConsultation: async (consultationData: ConsultationFeedback) => {
    try {
      const response = await api.post('/doctor/consultations', {
        patient_id: consultationData.patientId,
        appointment_id: consultationData.appointmentId,
        diagnosis: consultationData.diagnosis,
        treatment: consultationData.treatment,
        prescription: consultationData.prescription,
        follow_up: consultationData.followUp,
        notes: consultationData.notes,
        duration: consultationData.duration
      });
      
      return { 
        success: true, 
        message: 'Consultation submitted successfully',
        data: response.data
      };
    } catch (error: any) {
      console.error('Error submitting consultation:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to submit consultation'
      };
    }
  },
  
  // Get doctor queue
  getDoctorQueue: async () => {
    try {
      const response = await api.get('/doctor/queue');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Error fetching doctor queue:', error);
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch doctor queue'
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
  }
};

export default doctorService;
