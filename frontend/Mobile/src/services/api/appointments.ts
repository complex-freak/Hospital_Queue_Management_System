import { Appointment, ConditionType } from '../../types';
import httpClient, { ApiResponse } from './index';
import { API_PATHS } from '../../config/env';
import { storageService } from '../storage/storage';
import { syncService, ConflictResolutionStrategy } from '../storage/syncService';
import { connectivityService } from '../connectivity/connectivityServices';

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
  queue_identifier?: string;
  doctor_name?: string;
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
  version?: number;
  // Queue information (added dynamically by backend)
  queue_position?: number;
  estimated_wait_time?: number;
  queue_number?: number;
  queue_identifier?: string;
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
  constructor() {
    // Set up conflict handler for appointments
    syncService.setConflictHandler('appointment', this.handleAppointmentConflict);
  }

  /**
   * Generate a random 4-character queue identifier
   */
  private generateQueueIdentifier(): string {
    const chars = 'ABCDEFGHIJKMNOPQRSTUVWXYZ23456789'; // Excluding similar characters
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Create a new appointment with offline support
   */
  public async createAppointment(data: CreateAppointmentRequest): Promise<ApiResponse<AppointmentResponse>> {
    try {
    // Convert undefined values to null for the backend
    const sanitizedData = {
      ...data,
      appointment_date: data.appointment_date || null,
    };
    
    console.log('Creating appointment with data:', sanitizedData);

      // Check if we're online
      if (connectivityService.isNetworkConnected()) {
        // Online - create immediately
        const response = await httpClient.post<AppointmentResponse>(
          API_PATHS.APPOINTMENTS.BASE, 
          sanitizedData
        );

        // If successful, cache the appointment
        if (response.isSuccess && response.data) {
          const frontendAppointment = this.transformAppointmentData(response.data);
          await storageService.updateAppointment(frontendAppointment);
        }

        return response;
      } else {
        // Offline - generate a temporary ID and queue action
        const tempId = `temp-${Date.now()}`;
        
        // Queue the action for sync
        await syncService.queueAction(
          API_PATHS.APPOINTMENTS.BASE,
          'POST',
          sanitizedData,
          tempId,
          'appointment'
        );

        // Create a placeholder appointment for the UI
        const placeholderAppointment: Appointment = {
          id: tempId,
          patient_id: 'placeholder',
          appointment_date: data.appointment_date || new Date().toISOString(),
          urgency: data.urgency as 'low' | 'normal' | 'high' | 'emergency',
          status: 'waiting',
          patientName: 'You', // Will be replaced with actual data when online
          conditionType: this.mapUrgencyToConditionType(data.urgency),
          createdAt: new Date().toISOString(),
          reasonForVisit: data.reason,
          additionalInformation: data.notes,
          _isOfflineCreated: true,
          _locallyModified: true,
          _lastModified: Date.now(),
          gender: 'other',
          dateOfBirth: '',
          phoneNumber: '',
          queue_number: 0,
          queue_identifier: this.generateQueueIdentifier(),
          currentPosition: 0,
          estimatedTime: 0
        };

        // Store in local cache
        await storageService.updateAppointment(placeholderAppointment);

        // Return a mock successful response
        return {
          data: {
            id: tempId,
            patient_id: 'placeholder',
            appointment_date: data.appointment_date || new Date().toISOString(),
            reason: data.reason || null,
            urgency: data.urgency,
            status: 'WAITING',
            notes: data.notes || null,
            created_at: new Date().toISOString(),
            updated_at: null,
            doctor_id: null,
            patient: {
              id: 'placeholder',
              first_name: 'Offline',
              last_name: 'User',
              phone_number: '',
              date_of_birth: null,
              gender: null
            },
            doctor: null,
            version: 1
          } as AppointmentResponse,
          status: 201,
          isSuccess: true,
          message: 'Appointment created offline. Will be synced when back online.'
        };
      }
    } catch (error) {
      console.error('Error in appointmentService.createAppointment:', error);
      throw error;
    }
  }

  /**
   * Get queue status for the current patient - requires online connection
   */
  public async getQueueStatus(): Promise<ApiResponse<QueueStatusResponse>> {
    // This needs online connection, no offline support
    return httpClient.get<QueueStatusResponse>(API_PATHS.APPOINTMENTS.QUEUE_STATUS);
  }

  /**
   * Get all appointments for the logged-in patient with offline support
   */
  public async getAppointments(): Promise<ApiResponse<AppointmentResponse[]>> {
    try {
      // Add logging to trace the request
      console.log('Fetching appointments from API:', API_PATHS.APPOINTMENTS.BASE);
      
      let response;
      let appointmentsData: AppointmentResponse[] = [];
      let shouldUpdateCache = false;
      
      // Try to get from network if online
      if (connectivityService.isNetworkConnected()) {
        try {
          response = await httpClient.get<AppointmentResponse[]>(API_PATHS.APPOINTMENTS.BASE);
          
          if (response.isSuccess) {
            appointmentsData = response.data;
            shouldUpdateCache = true;
          }
        } catch (error) {
          console.error('Network error fetching appointments:', error);
          // Fall back to cache
        }
      }
      
      // If we're offline or the network request failed, try to get from cache
      if (!connectivityService.isNetworkConnected() || !response?.isSuccess) {
        const cachedAppointments = await storageService.getAppointments();
        
        if (cachedAppointments?.length) {
          console.log(`Using ${cachedAppointments.length} cached appointments`);
          
          // Convert frontend appointments to API format for consistency
          return {
            data: cachedAppointments.map(app => this.transformToApiFormat(app)),
            status: 200,
            isSuccess: true,
            message: 'Data retrieved from cache'
          };
        } else if (!response?.isSuccess) {
          // No cache and network failed
          return {
            data: [],
            status: 503,
            isSuccess: false,
            message: 'No cached data available and network request failed'
          };
        }
      }
      
      // If we got data from network, update cache
      if (shouldUpdateCache && appointmentsData.length > 0) {
        // Transform and cache each appointment
        const frontendAppointments = appointmentsData.map(app => this.transformAppointmentData(app));
        await storageService.storeAppointments(frontendAppointments);
      }
      
      // Return network response or cached data
      return response || {
        data: [],
        status: 200,
        isSuccess: true,
        message: 'No appointments found'
      };
    } catch (error) {
      console.error('Error in appointmentService.getAppointments:', error);
      throw error;
    }
  }

  /**
   * Get appointment details by ID with offline support
   */
  public async getAppointmentById(id: string): Promise<ApiResponse<AppointmentResponse>> {
    try {
      console.log(`Fetching appointment details for ID: ${id}`);
      
      let response;
      let appointmentData: AppointmentResponse | null = null;
      
      // Try to get from network if online
      if (connectivityService.isNetworkConnected()) {
        try {
          response = await httpClient.get<AppointmentResponse>(`${API_PATHS.APPOINTMENTS.BASE}/${id}`);
          
          if (response.isSuccess) {
            appointmentData = response.data;
            
            // Cache the appointment
            const frontendAppointment = this.transformAppointmentData(appointmentData);
            await storageService.updateAppointment(frontendAppointment);
          }
        } catch (error) {
          console.error(`Network error fetching appointment ${id}:`, error);
          // Fall back to cache
        }
      }
      
      // If offline or network failed, try to get from cache
      if (!connectivityService.isNetworkConnected() || !response?.isSuccess) {
        const cachedAppointments = await storageService.getAppointments();
        
        if (cachedAppointments) {
          const cachedAppointment = cachedAppointments.find(app => app.id === id);
          
          if (cachedAppointment) {
            console.log(`Using cached appointment for ID: ${id}`);
            return {
              data: this.transformToApiFormat(cachedAppointment),
              status: 200,
              isSuccess: true,
              message: 'Data retrieved from cache'
            };
          }
        }
        
        // If we get here and have no response, we have no data
        if (!response?.isSuccess) {
          return {
            data: {} as AppointmentResponse,
            status: 404,
            isSuccess: false,
            message: 'Appointment not found in cache or network'
          };
        }
      }
      
      return response!;
    } catch (error) {
      console.error(`Error in appointmentService.getAppointmentById: ${error}`);
      throw error;
    }
  }

  /**
   * Update appointment details with offline support
   */
  public async updateAppointment(
    id: string, 
    data: Partial<CreateAppointmentRequest>
  ): Promise<ApiResponse<AppointmentResponse>> {
    try {
      // Check if we're online
      if (connectivityService.isNetworkConnected()) {
        // Online - update immediately
        const response = await httpClient.put<AppointmentResponse>(
          `${API_PATHS.APPOINTMENTS.BASE}/${id}`, 
          data
        );

        // If successful, update cache
        if (response.isSuccess) {
          const frontendAppointment = this.transformAppointmentData(response.data);
          await storageService.updateAppointment(frontendAppointment);
        }

        return response;
      } else {
        // Offline - update cache and queue action
        // First, get current appointment from cache
        const cachedAppointments = await storageService.getAppointments();
        const cachedAppointment = cachedAppointments?.find(app => app.id === id);

        if (!cachedAppointment) {
          return {
            data: {} as AppointmentResponse,
            status: 404,
            isSuccess: false,
            message: 'Cannot update appointment: not found in cache'
          };
        }

        // Update the cached appointment
        const updatedAppointment = {
          ...cachedAppointment,
          ...this.mapDataToFrontendFormat(data),
          _locallyModified: true,
          _lastModified: Date.now()
        };

        await storageService.updateAppointment(updatedAppointment);

        // Queue for sync
        await syncService.queueAction(
          `${API_PATHS.APPOINTMENTS.BASE}/${id}`,
          'PUT',
          data,
          id,
          'appointment'
        );

        // Return mock response
        return {
          data: this.transformToApiFormat(updatedAppointment),
          status: 202,
          isSuccess: true,
          message: 'Appointment updated offline. Will be synced when back online.'
        };
      }
    } catch (error) {
      console.error(`Error updating appointment ${id}:`, error);
      throw error;
    }
  }

  /**
   * Cancel an appointment with offline support
   */
  public async cancelAppointment(id: string): Promise<ApiResponse<AppointmentResponse>> {
    try {
      // Check if we're online
      if (connectivityService.isNetworkConnected()) {
        // Online - cancel immediately
        const response = await httpClient.put<AppointmentResponse>(
          `${API_PATHS.APPOINTMENTS.BASE}/${id}/cancel`, 
          {}
        );

        // If successful, update cache
        if (response.isSuccess) {
          const frontendAppointment = this.transformAppointmentData(response.data);
          await storageService.updateAppointment(frontendAppointment);
        }

        return response;
      } else {
        // Offline - update cache and queue action
        // First, get current appointment from cache
        const cachedAppointments = await storageService.getAppointments();
        const cachedAppointment = cachedAppointments?.find(app => app.id === id);

        if (!cachedAppointment) {
          return {
            data: {} as AppointmentResponse,
            status: 404,
            isSuccess: false,
            message: 'Cannot cancel appointment: not found in cache'
          };
        }

        // Update the cached appointment
        const cancelledAppointment = {
          ...cachedAppointment,
          status: 'cancelled' as 'cancelled',
          _locallyModified: true,
          _lastModified: Date.now()
        };

        await storageService.updateAppointment(cancelledAppointment);

        // Queue for sync
        await syncService.queueAction(
          `${API_PATHS.APPOINTMENTS.BASE}/${id}/cancel`,
          'PUT',
          {},
          id,
          'appointment'
        );

        // Return mock response
        return {
          data: this.transformToApiFormat(cancelledAppointment),
          status: 202,
          isSuccess: true,
          message: 'Appointment cancelled offline. Will be synced when back online.'
        };
      }
    } catch (error) {
      console.error(`Error cancelling appointment ${id}:`, error);
      throw error;
    }
  }

  /**
   * Handle appointment conflicts
   */
  private handleAppointmentConflict = async (conflict: any): Promise<ConflictResolutionStrategy> => {
    const { action, serverData } = conflict;
    
    // Default strategy is SERVER_WINS
    let strategy = ConflictResolutionStrategy.SERVER_WINS;
    
    // For cancel actions, local changes should win because the user intended to cancel
    if (action.endpoint.endsWith('/cancel')) {
      strategy = ConflictResolutionStrategy.LOCAL_WINS;
    } 
    // For update actions, merge the changes
    else if (action.method === 'PUT') {
      strategy = ConflictResolutionStrategy.MERGE;
    }
    
    return strategy;
  }

  /**
   * Map API data fields to frontend format
   */
  private mapDataToFrontendFormat(data: Partial<CreateAppointmentRequest>): Partial<Appointment> {
    const result: Partial<Appointment> = {};
    
    if (data.reason !== undefined) {
      result.reasonForVisit = data.reason;
    }
    
    if (data.notes !== undefined) {
      result.additionalInformation = data.notes;
    }
    
    if (data.urgency !== undefined) {
      result.conditionType = this.mapUrgencyToConditionType(data.urgency);
    }
    
    return result;
  }

  /**
   * Map urgency string to ConditionType
   */
  private mapUrgencyToConditionType(urgency?: string): ConditionType {
    if (!urgency) return 'normal';
    
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
    
    return conditionTypeMap[urgency] || 'normal';
  }

  /**
   * Transform frontend Appointment to API format
   */
  private transformToApiFormat(appointment: Appointment): AppointmentResponse {
    // Map conditionType to urgency
    const urgencyMap: { [key in ConditionType]: string } = {
      'emergency': 'EMERGENCY',
      'elderly': 'HIGH',
      'normal': 'NORMAL',
      'child': 'LOW'
    };
    
    // Map status from frontend to backend format
    const statusMap: { [key: string]: string } = {
      'scheduled': 'SCHEDULED',
      'waiting': 'WAITING',
      'in_progress': 'IN_PROGRESS',
      'ongoing': 'IN_PROGRESS',
      'completed': 'COMPLETED',
      'cancelled': 'CANCELLED'
    };
    
    // Create a mock API response from frontend data
    return {
      id: appointment.id,
      patient_id: appointment._patientId || 'placeholder',
      doctor_id: appointment.doctorName ? 'placeholder' : null,
      appointment_date: appointment.appointment_date || new Date().toISOString(),
      reason: appointment.reasonForVisit || null,
      urgency: urgencyMap[appointment.conditionType || 'normal'] || 'NORMAL',
      status: statusMap[appointment.status] || 'WAITING',
      notes: appointment.additionalInformation || null,
      created_at: appointment.createdAt || new Date().toISOString(),
      updated_at: appointment._lastModified ? new Date(appointment._lastModified).toISOString() : null,
      version: appointment._version || 1,
      patient: {
        id: appointment._patientId || 'placeholder',
        first_name: appointment.patientName?.split(' ')[0] || 'Offline',
        last_name: appointment.patientName?.split(' ')[1] || 'User',
        phone_number: appointment.phoneNumber || '',
        date_of_birth: appointment.dateOfBirth || null,
        gender: appointment.gender || null
      },
      doctor: appointment.doctorName ? {
        id: 'placeholder',
        first_name: appointment.doctorName.split(' ')[0] || '',
        last_name: appointment.doctorName.split(' ')[1] || '',
        specialty: ''
      } : null
    };
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
    const statusMap: { [key: string]: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' } = {
      'SCHEDULED': 'scheduled',
      'scheduled': 'scheduled',
      'WAITING': 'waiting',
      'waiting': 'waiting',
      'IN_PROGRESS': 'in_progress',
      'in_progress': 'in_progress',
      'COMPLETED': 'completed',
      'completed': 'completed',
      'CANCELLED': 'cancelled',
      'cancelled': 'cancelled',
      'NO_SHOW': 'no_show',
      'no_show': 'no_show',
    };

    // Create doctorName if doctor info exists
    const doctorName = apiData.doctor 
      ? `${apiData.doctor.first_name} ${apiData.doctor.last_name}`
      : undefined;

    // Transform to frontend format
    return {
      id: apiData.id,
      patient_id: apiData.patient_id,
      appointment_date: apiData.appointment_date,
      urgency: apiData.urgency as 'low' | 'normal' | 'high' | 'emergency',
      status: statusMap[apiData.status] || 'waiting',
      patientName: `${apiData.patient.first_name} ${apiData.patient.last_name}`,
      gender: (apiData.patient.gender as 'male' | 'female') || 'other',
      dateOfBirth: apiData.patient.date_of_birth || '',
      phoneNumber: apiData.patient.phone_number,
      conditionType: conditionTypeMap[apiData.urgency] || 'normal',
      queue_number: apiData.queue_number || queueData?.your_number || 0,
      queue_identifier: apiData.queue_identifier || queueData?.queue_identifier || undefined,
      currentPosition: apiData.queue_position || queueData?.queue_position || 0,
      estimatedTime: apiData.estimated_wait_time || queueData?.estimated_wait_time || 0,
      doctorName: queueData?.doctor_name || doctorName,
      createdAt: apiData.created_at,
      reasonForVisit: apiData.reason || undefined,
      additionalInformation: apiData.notes || undefined,
      _patientId: apiData.patient_id,
      _version: apiData.version || 1,
      _lastSynced: Date.now()
    };
  }
}

export const appointmentService = new AppointmentService();
export default appointmentService;