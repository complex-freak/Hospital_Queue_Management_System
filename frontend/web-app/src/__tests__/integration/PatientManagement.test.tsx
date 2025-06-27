import { describe, test, expect, vi, beforeEach } from 'vitest';
import { receptionistService } from '../../services/api/receptionist-service';
import api from '../../services/api/client';

// Mock the API client
vi.mock('../../services/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Patient Management API Integration', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  test('getAllPatients should fetch and transform patients data', async () => {
    // Mock API response
    const mockPatients = [
      {
        id: '123',
        first_name: 'John',
        last_name: 'Doe',
        phone_number: '1234567890',
        email: 'john@example.com',
        date_of_birth: '1990-01-01',
        gender: 'male',
        is_active: true
      }
    ];
    
    (api.get as any).mockResolvedValueOnce({ data: mockPatients });
    
    const result = await receptionistService.getAllPatients();
    
    expect(api.get).toHaveBeenCalledWith('/staff/patients');
    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].fullName).toBe('John Doe');
    expect(result.data[0].phoneNumber).toBe('1234567890');
  });
  
  test('registerPatient should create a patient and appointment', async () => {
    // Mock API responses
    const mockPatientResponse = {
      data: {
        id: '123',
        first_name: 'John',
        last_name: 'Doe'
      }
    };
    
    const mockAppointmentResponse = {
      data: {
        id: '456',
        created_at: '2023-05-01T10:00:00Z'
      }
    };
    
    (api.post as any)
      .mockResolvedValueOnce(mockPatientResponse)
      .mockResolvedValueOnce(mockAppointmentResponse);
    
    const patientData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      phone: '1234567890',
      email: 'john@example.com',
      reason: 'Checkup',
      priority: 'normal',
      consentToTreatment: true,
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '0987654321',
      emergencyContactRelation: 'Spouse'
    };
    
    const result = await receptionistService.registerPatient(patientData);
    
    expect(api.post).toHaveBeenCalledTimes(2);
    expect(api.post).toHaveBeenCalledWith('/staff/patients/register', expect.any(Object));
    expect(api.post).toHaveBeenCalledWith('/staff/appointments', expect.any(Object));
    expect(result.success).toBe(true);
    expect(result.data.id).toBe('123');
    expect(result.data.appointmentId).toBe('456');
  });
  
  test('savePatientDraft should save draft registration', async () => {
    // Mock API response
    const mockResponse = {
      data: {
        draft_id: 'draft123',
        last_updated: '2023-05-01T10:00:00Z'
      }
    };
    
    (api.post as any).mockResolvedValueOnce(mockResponse);
    
    const draftData = {
      draftId: 'draft123',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'male',
      phone: '1234567890',
      reason: 'Checkup',
      priority: 'normal',
      consentToTreatment: true,
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '0987654321',
      emergencyContactRelation: 'Spouse',
      lastUpdated: '2023-05-01T09:00:00Z'
    };
    
    const result = await receptionistService.savePatientDraft(draftData);
    
    expect(api.post).toHaveBeenCalledWith('/staff/patients/drafts', expect.any(Object));
    expect(result.success).toBe(true);
  });
  
  test('updatePatientPriority should update appointment priority', async () => {
    // Mock API response
    const mockResponse = {
      data: {
        id: '123',
        urgency: 'high',
        updated_at: '2023-05-01T10:00:00Z'
      }
    };
    
    (api.patch as any).mockResolvedValueOnce(mockResponse);
    
    const result = await receptionistService.updatePatientPriority('123', 'elderly');
    
    expect(api.patch).toHaveBeenCalledWith('/staff/appointments/123/priority', { urgency: 'high' });
    expect(result.success).toBe(true);
    expect(result.data.priority).toBe('elderly');
  });
  
  test('removeFromQueue should cancel an appointment', async () => {
    // Mock API response
    const mockResponse = {
      data: {
        id: '123',
        status: 'cancelled',
        updated_at: '2023-05-01T10:00:00Z'
      }
    };
    
    (api.post as any).mockResolvedValueOnce(mockResponse);
    
    const result = await receptionistService.removeFromQueue('123', 'Patient request');
    
    expect(api.post).toHaveBeenCalledWith('/staff/appointments/123/cancel', { reason: 'Patient request' });
    expect(result.success).toBe(true);
    expect(result.data.removed).toBe(true);
  });
}); 