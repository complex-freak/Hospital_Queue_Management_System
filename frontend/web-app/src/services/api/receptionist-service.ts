import api from './client';
import { mockQueue } from './mock-data';

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
      // In a real app, this would be an API call
      // const response = await api.get('/patients');
      // return response.data;
      
      // For now, return mock data
      return {
        success: true,
        data: mockQueue.map(patient => ({
          ...patient,
          registrationDate: new Date(Date.now() - Math.random() * 10000000).toISOString(),
        })),
      };
    } catch (error) {
      console.error('Error fetching all patients:', error);
      return { success: false, error: 'Failed to fetch patients' };
    }
  },
  
  // Register a new patient
  registerPatient: async (patientData: PatientRegistrationData) => {
    try {
      // In a real app, this would be an API call
      // const response = await api.post('/patients/register', patientData);
      // return response.data;
      
      // For now, simulate a successful response
      await new Promise(resolve => setTimeout(resolve, 800));
      
      return {
        success: true,
        data: {
          id: `P${Math.floor(Math.random() * 1000)}`,
          ...patientData,
          checkInTime: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error registering patient:', error);
      return { success: false, error: 'Failed to register patient' };
    }
  },
  
  // Save a draft registration
  savePatientDraft: async (draftData: RegistrationDraft) => {
    try {
      // In a real app, this would be an API call
      // const response = await api.post('/patients/drafts', draftData);
      // return response.data;
      
      // For now, simulate a successful response
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: true,
        data: {
          ...draftData,
          lastUpdated: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Error saving patient draft:', error);
      return { success: false, error: 'Failed to save draft' };
    }
  },
  
  // Get a draft registration
  getPatientDraft: async (draftId: string) => {
    try {
      // In a real app, this would be an API call
      // const response = await api.get(`/patients/drafts/${draftId}`);
      // return response.data;
      
      // For now, simulate a successful response with data from localStorage
      const draftData = localStorage.getItem('patientRegistrationDraft');
      if (draftData) {
        const draft = JSON.parse(draftData);
        if (draft.draftId === draftId) {
          return {
            success: true,
            data: draft,
          };
        }
      }
      
      return { success: false, error: 'Draft not found' };
    } catch (error) {
      console.error('Error fetching patient draft:', error);
      return { success: false, error: 'Failed to fetch draft' };
    }
  },
  
  // Update patient priority
  updatePatientPriority: async (patientId: string, priority: string) => {
    try {
      // In a real app, this would be an API call
      // const response = await api.patch(`/patients/${patientId}/priority`, { priority });
      // return response.data;
      
      // For now, simulate a successful response
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: true,
        data: { id: patientId, priority },
      };
    } catch (error) {
      console.error('Error updating patient priority:', error);
      return { success: false, error: 'Failed to update priority' };
    }
  },
  
  // Remove patient from queue
  removeFromQueue: async (patientId: string, reason: string) => {
    try {
      // In a real app, this would be an API call
      // const response = await api.post(`/patients/${patientId}/remove`, { reason });
      // return response.data;
      
      // For now, simulate a successful response
      await new Promise(resolve => setTimeout(resolve, 300));
      
      return {
        success: true,
        data: { id: patientId, removed: true, reason },
      };
    } catch (error) {
      console.error('Error removing patient from queue:', error);
      return { success: false, error: 'Failed to remove patient' };
    }
  },
};

export default receptionistService; 