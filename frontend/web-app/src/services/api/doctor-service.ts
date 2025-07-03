import api from './client';
import { ProfileData } from './types';
import { Patient, ConsultationFeedback, NoteVersion } from '@/types/patient';
import { authService } from './auth-service';
import axios, { AxiosError } from 'axios';
import { 
  transformToFrontendUser, 
  transformToFrontendPatientNote, 
  transformToFrontendConsultationFeedback,
  transformToBackendPatientNote,
  transformToBackendConsultationFeedback
} from './data-transformers';

// Debounce helper
const debounce = <F extends (...args: any[]) => any>(func: F, waitFor: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const debounced = (...args: Parameters<F>) => {
    if (timeout !== null) {
      clearTimeout(timeout);
      timeout = null;
    }
    timeout = setTimeout(() => func(...args), waitFor);
  };

  return debounced;
};

// Store last update time to throttle requests
let lastStatusUpdateTime = 0;
const STATUS_UPDATE_THROTTLE = 1000; // 1 second

// Track in-flight requests
const activeRequestsMap = new Map<string, AbortController>();

// Helper to create a new abort controller and cancel previous requests
const getRequestController = (requestKey: string) => {
  // We'll only cancel duplicate requests for specific operations
  // For doctor profile, we don't want to cancel since it's critical for the app
  if (requestKey !== 'doctorProfile' && activeRequestsMap.has(requestKey)) {
    activeRequestsMap.get(requestKey)?.abort();
    activeRequestsMap.delete(requestKey);
  }
  
  // Create new abort controller
  const controller = new AbortController();
  activeRequestsMap.set(requestKey, controller);
  return controller;
};

export const doctorService = {
  // Get doctor profile
  getDoctorProfile: async (retryCount = 0) => {
    // For doctor profile, we'll use a unique key each time to avoid cancellations
    const requestKey = `doctorProfile-${Date.now()}`;
    const controller = new AbortController();
    
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const response = await api.get('/doctor/me', {
        signal: controller.signal
      });
      
      // Request completed successfully
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
      
      // Handle request cancellation
      if (axios.isCancel(error)) {
        console.log('Doctor profile request was cancelled:', error.message);
        // Don't retry cancelled requests, but don't show error to user
        return {
          success: true, // Return success but with empty data
          data: null,
          wasCancelled: true
        };
      }
      
      // Implement retry logic with exponential backoff
      if (retryCount < 3) {
        const retryDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff: 1s, 2s, 4s
        console.log(`Retrying doctor profile fetch in ${retryDelay}ms...`);
        
        return new Promise(resolve => {
          setTimeout(async () => {
            const retryResult = await doctorService.getDoctorProfile(retryCount + 1);
            resolve(retryResult);
          }, retryDelay);
        });
      }
      
      // Handle specific error cases
      if (error.response?.status === 404) {
        return {
          success: false,
          error: 'Doctor profile not found. Please contact admin to set up your profile.'
        };
      }
      
      if (error.response?.status === 401) {
        // If unauthorized, try to refresh the token
        try {
          await authService.refreshToken();
          // Retry once more after token refresh
          return doctorService.getDoctorProfile(retryCount + 1);
        } catch (refreshError) {
          return {
            success: false,
            error: 'Your session has expired. Please log in again.'
          };
        }
      }
      
      return {
        success: false,
        error: error.response?.data?.detail || 'Failed to fetch doctor profile'
      };
    }
  },

  // Update doctor availability status
  updateStatus: async (status: { isAvailable: boolean; shiftStart?: string; shiftEnd?: string }) => {
    const requestKey = 'updateStatus';
    const controller = getRequestController(requestKey);
    
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');
      
      // Throttle requests to prevent excessive API calls
      const now = Date.now();
      if (now - lastStatusUpdateTime < STATUS_UPDATE_THROTTLE) {
        console.log('Throttling status update request');
        return {
          success: false,
          error: 'Please wait before updating status again'
        };
      }
      
      lastStatusUpdateTime = now;

      const response = await api.put('/doctor/status', {
        is_available: status.isAvailable,
        shift_start: status.shiftStart,
        shift_end: status.shiftEnd
      }, {
        signal: controller.signal
      });
      
      // Request completed successfully, remove from active requests
      activeRequestsMap.delete(requestKey);
      
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
      // Remove from active requests on error
      activeRequestsMap.delete(requestKey);
      
      console.error('Error updating status:', error);
      
      // Handle request cancellation
      if (axios.isCancel(error)) {
        console.log('Request was cancelled:', error.message);
        return {
          success: false,
          error: 'Request was cancelled'
        };
      }
      
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
  getDoctorQueue: async (retryCount = 0) => {
    // Generate a unique key for each queue request to avoid cancellations
    const requestKey = `doctorQueue-${Date.now()}`;
    const controller = new AbortController();
    
    try {
      const user = authService.getCurrentUser();
      if (!user) throw new Error('User not authenticated');

      const response = await api.get('/doctor/queue', {
        signal: controller.signal
      });
      
      // Handle empty array response
      if (response.data && Array.isArray(response.data)) {
        return {
          success: true,
          data: response.data
        };
      } else {
        // If response is not an array, handle as empty queue
        console.warn('Doctor queue API returned non-array data:', response.data);
        return {
          success: true,
          data: []
        };
      }
    } catch (error: any) {
      console.error('Error fetching doctor queue:', error);
      
      // Handle request cancellation
      if (axios.isCancel(error)) {
        console.log('Doctor queue request was cancelled:', error.message);
        return {
          success: true, // Return success with empty data
          data: [],
          wasCancelled: true
        };
      }
      
      // Implement retry logic with exponential backoff
      if (retryCount < 2) { // Maximum 2 retries (less than profile since this is polled)
        const retryDelay = Math.pow(2, retryCount) * 500; // Faster backoff: 500ms, 1000ms
        console.log(`Retrying doctor queue fetch in ${retryDelay}ms...`);
        
        return new Promise(resolve => {
          setTimeout(async () => {
            const retryResult = await doctorService.getDoctorQueue(retryCount + 1);
            resolve(retryResult);
          }, retryDelay);
        });
      }
      
      // Handle 404 (no queue) as empty array rather than error
      if (error.response?.status === 404) {
        return {
          success: true,
          data: []
        };
      }
      
      // Handle authentication issues
      if (error.response?.status === 401) {
        // If unauthorized, try to refresh the token
        try {
          await authService.refreshToken();
          // Retry once more after token refresh
          return doctorService.getDoctorQueue(retryCount + 1);
        } catch (refreshError) {
          // If refresh fails, return authentication error
          return {
            success: false,
            error: 'Your session has expired. Please log in again.',
            data: []
          };
        }
      }
      
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
