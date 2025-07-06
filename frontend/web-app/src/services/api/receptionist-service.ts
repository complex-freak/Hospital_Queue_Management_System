import api from './client';
import { transformToBackendAppointment, transformToFrontendUser } from './data-transformers';

// Backend API response types
interface BackendUserResponse {
  id: string;
  first_name?: string;
  last_name?: string;
  phone_number?: string;
  email?: string;
  username?: string;
  gender?: 'male' | 'female' | 'other';
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  role?: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
  };
  specialization?: string;
  department?: string;
  license_number?: string;
  is_available?: boolean;
  patient_count?: number;
}

interface ApiError {
  response?: {
    data?: {
      detail?: string;
    };
  };
  message?: string;
}

// Types
export interface PatientRegistrationData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  email?: string;
  phone: string;
  reason: string;
  priority: string;
  appointmentDate: string;
  allergies?: string;
  medications?: string;
  medicalHistory?: string;
  consentToTreatment: boolean;
  consentToShareData?: boolean;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelation: string;
  registeredBy?: string;
  registrationDate?: string;
}

export interface RegistrationDraft extends PatientRegistrationData {
  draftId: string;
  lastUpdated: string;
}

// Receptionist service API endpoints
export const receptionistService = {
  // Get all patients (both in queue and historical)
  getAllPatients: async () => {
    try {
      const response = await api.get('/staff/patients');
      
      return {
        success: true,
        data: Array.isArray(response.data) ? response.data.map((patient: BackendUserResponse) => transformToFrontendUser(patient)) : [],
      };
    } catch (error) {
      console.error('Error fetching all patients:', error);
      return { success: false, error: 'Failed to fetch patients' };
    }
  },
  
  // Get all doctors
  getAllDoctors: async () => {
    try {
      const response = await api.get('/staff/doctors');
      
      return {
        success: true,
        data: Array.isArray(response.data) ? response.data.map((doctor: BackendUserResponse) => transformToFrontendUser(doctor)) : [],
      };
    } catch (error) {
      console.error('Error fetching doctors:', error);
      return { success: false, error: 'Failed to fetch doctors' };
    }
  },
  
  // Register a new patient
  registerPatient: async (patientData: PatientRegistrationData) => {
    try {
      // Ensure phone number has international format with + prefix
      const phoneNumber = patientData.phone.startsWith('+') 
        ? patientData.phone 
        : `+${patientData.phone}`;
      
      // Format emergency contact phone number
      const emergencyPhone = patientData.emergencyContactPhone.startsWith('+')
        ? patientData.emergencyContactPhone
        : `+${patientData.emergencyContactPhone}`;
      
      // Transform data to match backend schema
      const backendData = {
        first_name: patientData.firstName,
        last_name: patientData.lastName,
        date_of_birth: patientData.dateOfBirth,
        gender: patientData.gender,
        email: patientData.email,
        appointment_date: patientData.appointmentDate,
        phone_number: phoneNumber,
        emergency_contact: emergencyPhone,
        emergency_contact_name: patientData.emergencyContactName,
        emergency_contact_relationship: patientData.emergencyContactRelation,
        // Generate a temporary password for the patient
        password: `Temp${Math.random().toString(36).substring(2, 10)}!`,
        // No nested objects - these fields aren't in the PatientCreate schema
        // and should be handled separately if needed
      };
      
      // Debug log the exact data being sent
      console.log('Patient registration data being sent to backend:', JSON.stringify(backendData));
      
      // Register the patient
      const registerResponse = await api.post('/staff/patients/register', backendData);
      
      // Create an appointment for the patient
      const appointmentData = {
        patient_id: registerResponse.data.id,
        reason: patientData.reason,
        urgency: mapPriorityToUrgency(patientData.priority),
        status: 'waiting',
        appointment_date: patientData.appointmentDate,
      };
      
      // Debug log the appointment data
      console.log('Appointment data being sent to backend:', JSON.stringify(appointmentData));
      
      const appointmentResponse = await api.post('/staff/appointments', appointmentData);
      
      return {
        success: true,
        data: {
          id: registerResponse.data.id,
          ...patientData,
          appointmentId: appointmentResponse.data.id,
          checkInTime: appointmentResponse.data.created_at,
        },
      };
    } catch (error: unknown) {
      // Log detailed error information
      console.error('Error registering patient:', error);
      const apiError = error as ApiError;
      console.error('Error response data:', apiError.response?.data);
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Failed to register patient' 
      };
    }
  },
  
  // Save a draft registration
  savePatientDraft: async (draftData: RegistrationDraft) => {
    try {
      // Save to the backend if API endpoint exists
      try {
        const response = await api.post('/staff/patients/drafts', {
          draft_id: draftData.draftId,
          data: draftData,
          last_updated: new Date().toISOString()
        });
        
        return {
          success: true,
          data: {
            ...draftData,
            lastUpdated: response.data.last_updated,
          },
        };
      } catch (backendError) {
        console.warn('Backend draft endpoint error:', backendError.message);
        
        // Fallback to localStorage if endpoint doesn't exist or fails
        localStorage.setItem('patientRegistrationDraft-' + draftData.draftId, JSON.stringify({
          ...draftData,
          lastUpdated: new Date().toISOString(),
        }));
        
        return {
          success: true,
          data: {
            ...draftData,
            lastUpdated: new Date().toISOString(),
          },
        };
      }
    } catch (error) {
      console.error('Error saving patient draft:', error);
      return { success: false, error: 'Failed to save draft' };
    }
  },
  
  // Get a draft registration
  getPatientDraft: async (draftId: string) => {
    try {
      // Try to get from backend
      try {
        const response = await api.get(`/staff/patients/drafts/${draftId}`);
        
        if (response.data && response.data.data) {
          return {
            success: true,
            data: response.data.data,
          };
        }
        throw new Error('Invalid response format');
      } catch (backendError) {
        console.warn('Backend draft endpoint error:', backendError.message);
        
        // Fallback to localStorage
        const draftData = localStorage.getItem('patientRegistrationDraft-' + draftId);
        if (draftData) {
          const draft = JSON.parse(draftData);
          return {
            success: true,
            data: draft,
          };
        }
        
        return { success: false, error: 'Draft not found' };
      }
    } catch (error) {
      console.error('Error fetching patient draft:', error);
      return { success: false, error: 'Failed to fetch draft' };
    }
  },
  
  // Update patient priority
  updatePatientPriority: async (patientId: string, priority: string) => {
    try {
      const response = await api.patch(`/staff/appointments/${patientId}/priority`, { 
        urgency: mapPriorityToUrgency(priority)
      });
      
      return {
        success: true,
        data: { 
          id: patientId, 
          priority: priority,
          updatedAt: response.data.updated_at
        },
      };
    } catch (error) {
      console.error('Error updating patient priority:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to update priority' 
      };
    }
  },
  
  // Remove patient from queue
  removeFromQueue: async (appointmentId: string, reason: string) => {
    try {
      const response = await api.post(`/staff/appointments/${appointmentId}/cancel`, { 
        reason: reason 
      });
      
      return {
        success: true,
        data: { 
          id: appointmentId, 
          removed: true, 
          reason: reason,
          status: response.data.status || 'cancelled'
        },
      };
    } catch (error) {
      console.error('Error removing patient from queue:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to remove patient' 
      };
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
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch queue statistics' 
      };
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
        data: { 
          id: appointmentId, 
          doctorId: doctorId,
          assignedAt: response.data.assigned_at || new Date().toISOString()
        },
      };
    } catch (error) {
      console.error('Error assigning patient to doctor:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to assign patient to doctor' 
      };
    }
  }
};

// Helper function to map frontend priority to backend urgency levels
function mapPriorityToUrgency(priority: string): string {
  const priorityMap: Record<string, string> = {
    'emergency': 'emergency',
    'urgent': 'high',
    'high': 'high',
    'normal': 'normal',
    'low': 'low'
  };
  
  return priorityMap[priority.toLowerCase()] || 'normal';
}

export default receptionistService; 