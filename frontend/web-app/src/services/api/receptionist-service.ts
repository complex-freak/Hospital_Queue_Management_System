import api from './client';
import { transformToBackendAppointment, transformToFrontendUser } from './data-transformers';

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
        data: response.data.map((patient: any) => transformToFrontendUser(patient)),
      };
    } catch (error) {
      console.error('Error fetching all patients:', error);
      return { success: false, error: 'Failed to fetch patients' };
    }
  },
  
  // Register a new patient
  registerPatient: async (patientData: PatientRegistrationData) => {
    try {
      // Transform data to match backend schema
      const backendData = {
        first_name: patientData.firstName,
        last_name: patientData.lastName,
        date_of_birth: patientData.dateOfBirth,
        gender: patientData.gender,
        email: patientData.email,
        phone_number: patientData.phone,
        emergency_contact: patientData.emergencyContactPhone,
        emergency_contact_name: patientData.emergencyContactName,
        emergency_contact_relationship: patientData.emergencyContactRelation,
        // Generate a temporary password for the patient
        password: `Temp${Math.random().toString(36).substring(2, 10)}!`,
        // Additional medical data
        medical_data: {
          allergies: patientData.allergies,
          medications: patientData.medications,
          medical_history: patientData.medicalHistory,
        },
        // Consent data
        consent: {
          treatment: patientData.consentToTreatment,
          share_data: patientData.consentToShareData || false
        }
      };
      
      // Register the patient
      const registerResponse = await api.post('/staff/patients/register', backendData);
      
      // Create an appointment for the patient
      const appointmentData = {
        patient_id: registerResponse.data.id,
        reason: patientData.reason,
        urgency: mapPriorityToUrgency(patientData.priority),
        status: 'waiting'
      };
      
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
    } catch (error: any) {
      console.error('Error registering patient:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to register patient' 
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
        console.warn('Backend draft endpoint not available, using localStorage instead');
        
        // Fallback to localStorage if endpoint doesn't exist
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
        
        return {
          success: true,
          data: response.data.data,
        };
      } catch (backendError) {
        console.warn('Backend draft endpoint not available, using localStorage instead');
        
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
    } catch (error: any) {
      console.error('Error updating patient priority:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to update priority' 
      };
    }
  },
  
  // Remove patient from queue
  removeFromQueue: async (patientId: string, reason: string) => {
    try {
      const response = await api.post(`/staff/appointments/${patientId}/cancel`, { 
        reason: reason 
      });
      
      return {
        success: true,
        data: { 
          id: patientId, 
          removed: true, 
          reason: reason,
          status: response.data.status
        },
      };
    } catch (error: any) {
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
    } catch (error: any) {
      console.error('Error fetching queue statistics:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch queue statistics' 
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