import { Appointment, ConditionType } from '../../types';
import httpClient, { ApiResponse } from './index';
import { API_PATHS } from '../../config/env';

// Types for API requests and responses
export interface CreateAppointmentRequest {
  reason?: string;
  urgency: string; // Maps to conditionType in frontend
  appointment_date?: string;
  notes?: string;
}

export interface QueueStatusResponse {
  queue_position: number;
  estimated_wait_time: number | null;
  current_serving: number | null;
  total_in_queue: number;
  your_number: number;
  status: string; // 'waiting', 'called', 'in_progress', 'completed', 'skipped'
}

export interface AppointmentResponse {
  id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_date: string;
  reason: string | null;
  urgency: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  patient: {
    id: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    date_of_birth: string | null;
    gender: string | null;
  };
  doctor: {
    id: string;
    first_name: string;
    last_name: string;
    specialty: string;
  } | null;
}

class AppointmentService {
  /**
   * Create a new appointment with offline support
   */
  public async createAppointment(data: CreateAppointmentRequest): Promise<ApiResponse<AppointmentResponse>> {
    // Using regular post instead of offline support to ensure accurate error reporting
    // Convert undefined values to null for the backend
    const sanitizedData = {
      ...data,
      appointment_date: data.appointment_date || null,
    };
    
    console.log('Creating appointment with data:', sanitizedData);
    return httpClient.post<AppointmentResponse>(API_PATHS.APPOINTMENTS.BASE, sanitizedData);
  }

  /**
   * Get queue status for an appointment - requires online connection
   */
  public async getQueueStatus(appointmentId: string): Promise<ApiResponse<QueueStatusResponse>> {
    return httpClient.get<QueueStatusResponse>(`${API_PATHS.APPOINTMENTS.QUEUE_STATUS}?appointment_id=${appointmentId}`);
  }

  /**
   * Get all appointments for the logged-in patient
   */
  public async getAppointments(): Promise<ApiResponse<AppointmentResponse[]>> {
    try {
      // Add logging to trace the request
      console.log('Fetching appointments from API:', API_PATHS.APPOINTMENTS.BASE);
      const response = await httpClient.get<AppointmentResponse[]>(API_PATHS.APPOINTMENTS.BASE);
      console.log('Appointments fetch response:', response.isSuccess ? 'Success' : 'Failed');
      return response;
    } catch (error) {
      console.error('Error in appointmentService.getAppointments:', error);
      throw error;
    }
  }

  /**
   * Get appointment details by ID
   */
  public async getAppointmentById(id: string): Promise<ApiResponse<AppointmentResponse>> {
    return httpClient.get<AppointmentResponse>(`${API_PATHS.APPOINTMENTS.BASE}/${id}`);
  }

  /**
   * Update appointment details with offline support
   */
  public async updateAppointment(
    id: string, 
    data: Partial<CreateAppointmentRequest>
  ): Promise<ApiResponse<AppointmentResponse>> {
    return httpClient.putWithOfflineSupport<AppointmentResponse>(`${API_PATHS.APPOINTMENTS.BASE}/${id}`, data);
  }

  /**
   * Cancel an appointment with offline support
   */
  public async cancelAppointment(id: string): Promise<ApiResponse<AppointmentResponse>> {
    return httpClient.putWithOfflineSupport<AppointmentResponse>(`${API_PATHS.APPOINTMENTS.BASE}/${id}/cancel`, {});
  }

  /**
   * Transform API appointment data to frontend Appointment type
   */
  public transformAppointmentData(apiData: AppointmentResponse, queueData?: QueueStatusResponse): Appointment {
    // Map urgency to conditionType (case-insensitive)
    const conditionTypeMap: { [key: string]: ConditionType } = {
      'EMERGENCY': 'emergency',
      'emergency': 'emergency',
      'HIGH': 'elderly',
      'high': 'elderly',
      'NORMAL': 'normal',
      'normal': 'normal',
      'LOW': 'child',
      'low': 'child',
    };

    // Map status from backend to frontend format (case-insensitive)
    const statusMap: { [key: string]: 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'cancelled' } = {
      'SCHEDULED': 'scheduled',
      'scheduled': 'scheduled',
      'WAITING': 'waiting',
      'waiting': 'waiting',
      'IN_PROGRESS': 'ongoing',
      'in_progress': 'ongoing',
      'COMPLETED': 'completed',
      'completed': 'completed',
      'CANCELLED': 'cancelled',
      'cancelled': 'cancelled',
      'NO_SHOW': 'cancelled',
      'no_show': 'cancelled',
    };

    // Create doctorName if doctor info exists
    const doctorName = apiData.doctor 
      ? `${apiData.doctor.first_name} ${apiData.doctor.last_name}`
      : undefined;

    // Transform to frontend format
    return {
      id: apiData.id,
      patientName: `${apiData.patient.first_name} ${apiData.patient.last_name}`,
      gender: (apiData.patient.gender as 'male' | 'female') || 'other',
      dateOfBirth: apiData.patient.date_of_birth || '',
      phoneNumber: apiData.patient.phone_number,
      conditionType: conditionTypeMap[apiData.urgency] || 'normal',
      queueNumber: queueData?.your_number || 0,
      currentPosition: queueData?.queue_position || 0,
      estimatedTime: queueData?.estimated_wait_time || 0,
      doctorName,
      status: statusMap[apiData.status] || 'waiting',
      createdAt: apiData.created_at,
    };
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;