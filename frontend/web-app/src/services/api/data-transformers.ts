/**
 * Data transformers for converting between backend and frontend data formats
 * Used to standardize data exchange between API and UI components
 */

// Type definitions matching our frontend models
export interface User {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  isAuthenticated: boolean;
  isProfileComplete?: boolean;
  email?: string;
  gender?: 'male' | 'female' | 'other';
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  role?: string;
  username?: string;
}

export interface Appointment {
  id: string;
  patientName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  phoneNumber: string;
  conditionType: 'emergency' | 'elderly' | 'child' | 'normal';
  queueNumber: number;
  currentPosition: number;
  estimatedTime: number;
  doctorName?: string;
  status: 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

// Backend to Frontend transformers

/**
 * Transform backend user data to frontend User format
 */
export const transformToFrontendUser = (backendUser: any): User => {
  // Handle different user types (staff, doctor, patient)
  const isPatient = backendUser.phone_number !== undefined;
  const isDoctor = backendUser.user?.first_name !== undefined;
  
  if (isPatient) {
    // Transform patient data
    return {
      id: backendUser.id,
      fullName: `${backendUser.first_name} ${backendUser.last_name}`,
      firstName: backendUser.first_name,
      lastName: backendUser.last_name,
      phoneNumber: backendUser.phone_number,
      email: backendUser.email || undefined,
      gender: backendUser.gender,
      dateOfBirth: backendUser.date_of_birth ? new Date(backendUser.date_of_birth).toISOString().split('T')[0] : undefined,
      address: backendUser.address,
      emergencyContact: backendUser.emergency_contact,
      emergencyContactName: backendUser.emergency_contact_name,
      emergencyContactRelationship: backendUser.emergency_contact_relationship,
      isAuthenticated: true,
      isProfileComplete: !!(backendUser.email && backendUser.gender && backendUser.date_of_birth),
      role: 'patient'
    };
  } else if (isDoctor) {
    // Transform doctor data (which might have nested user data)
    const userData = backendUser.user || {};
    return {
      id: backendUser.id,
      fullName: `${userData.first_name} ${userData.last_name}`,
      firstName: userData.first_name,
      lastName: userData.last_name,
      email: userData.email,
      username: userData.username,
      isAuthenticated: true,
      isProfileComplete: true,
      role: 'doctor'
    };
  } else {
    // Transform staff/admin user data
    return {
      id: backendUser.id,
      fullName: `${backendUser.first_name} ${backendUser.last_name}`,
      firstName: backendUser.first_name,
      lastName: backendUser.last_name,
      email: backendUser.email,
      username: backendUser.username,
      isAuthenticated: true,
      isProfileComplete: true,
      role: backendUser.role?.toLowerCase() || 'staff'
    };
  }
};

/**
 * Transform backend appointment data to frontend Appointment format
 */
export const transformToFrontendAppointment = (backendAppointment: any): Appointment => {
  // Extract and transform patient data
  const patient = backendAppointment.patient || {};
  const doctor = backendAppointment.doctor || {};
  const queue = backendAppointment.queue_entry || {};
  
  // Map urgency to condition type
  const urgencyToConditionType: Record<string, 'emergency' | 'elderly' | 'child' | 'normal'> = {
    'emergency': 'emergency',
    'high': 'elderly',
    'normal': 'normal',
    'low': 'child'
  };
  
  // Map status to frontend format
  const statusMap: Record<string, 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'cancelled'> = {
    'scheduled': 'scheduled',
    'waiting': 'waiting',
    'in_progress': 'ongoing',
    'completed': 'completed',
    'cancelled': 'cancelled',
    'no_show': 'cancelled'
  };

  return {
    id: backendAppointment.id,
    patientName: `${patient.first_name || ''} ${patient.last_name || ''}`.trim(),
    gender: patient.gender || 'other',
    dateOfBirth: patient.date_of_birth ? new Date(patient.date_of_birth).toISOString().split('T')[0] : '',
    phoneNumber: patient.phone_number || '',
    conditionType: urgencyToConditionType[backendAppointment.urgency] || 'normal',
    queueNumber: queue.queue_number || 0,
    currentPosition: queue.queue_position || 0,
    estimatedTime: queue.estimated_wait_time || 0,
    doctorName: doctor.user ? `Dr. ${doctor.user.first_name || ''} ${doctor.user.last_name || ''}`.trim() : undefined,
    status: statusMap[backendAppointment.status] || 'scheduled',
    createdAt: backendAppointment.created_at ? new Date(backendAppointment.created_at).toISOString() : new Date().toISOString()
  };
};

/**
 * Transform backend notification data to frontend Notification format
 */
export const transformToFrontendNotification = (backendNotification: any): Notification => {
  return {
    id: backendNotification.id,
    title: backendNotification.subject || 'Notification',
    message: backendNotification.message,
    read: backendNotification.status === 'read',
    createdAt: backendNotification.created_at 
      ? new Date(backendNotification.created_at).toISOString()
      : new Date().toISOString()
  };
};

// Frontend to Backend transformers

/**
 * Transform frontend user data to backend format
 */
export const transformToBackendUserData = (frontendUser: any) => {
  return {
    username: frontendUser.username,
    email: frontendUser.email,
    password: frontendUser.password,
    first_name: frontendUser.firstName,
    last_name: frontendUser.lastName,
    role: frontendUser.role
  };
};

/**
 * Transform frontend appointment data to backend format
 */
export const transformToBackendAppointment = (frontendAppointment: any) => {
  // Map condition type to urgency
  const conditionTypeToUrgency: Record<string, string> = {
    'emergency': 'emergency',
    'elderly': 'high',
    'normal': 'normal',
    'child': 'low'
  };
  
  // Map status to backend format
  const statusMap: Record<string, string> = {
    'scheduled': 'scheduled',
    'waiting': 'waiting',
    'ongoing': 'in_progress',
    'completed': 'completed',
    'cancelled': 'cancelled'
  };
  
  return {
    patient_id: frontendAppointment.patientId,
    doctor_id: frontendAppointment.doctorId,
    appointment_date: frontendAppointment.appointmentDate,
    reason: frontendAppointment.reason,
    urgency: conditionTypeToUrgency[frontendAppointment.conditionType] || 'normal',
    status: statusMap[frontendAppointment.status] || 'scheduled'
  };
};

/**
 * Transform frontend notification data to backend format
 */
export const transformToBackendNotification = (frontendNotification: any) => {
  return {
    recipient: frontendNotification.recipient,
    type: frontendNotification.type || 'push',
    message: frontendNotification.message,
    subject: frontendNotification.title
  };
}; 