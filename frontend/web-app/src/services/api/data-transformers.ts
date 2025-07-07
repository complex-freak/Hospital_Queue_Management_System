/**
 * Data transformers for converting between backend and frontend data formats
 * Used to standardize data exchange between API and UI components
 */

// Backend data interfaces (snake_case for API communication)
interface BackendUser {
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

interface BackendAppointment {
  id: string;
  patient_id?: string;
  doctor_id?: string;
  appointment_date?: string;
  urgency?: string;
  reason?: string;
  status?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  patient?: {
    id: string;
    first_name?: string;
    last_name?: string;
    gender?: string;
    date_of_birth?: string;
    phone_number?: string;
    email?: string;
    address?: string;
    emergency_contact?: string;
    emergency_contact_name?: string;
    emergency_contact_relationship?: string;
    is_active?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  doctor?: {
    id: string;
    user_id?: string;
    specialization?: string;
    license_number?: string;
    department?: string;
    consultation_fee?: number;
    is_available?: boolean;
    shift_start?: string;
    shift_end?: string;
    bio?: string;
    education?: string;
    experience?: string;
    user?: {
      id: string;
      first_name?: string;
      last_name?: string;
      email?: string;
      username?: string;
      role?: string;
      is_active?: boolean;
      created_at?: string;
      updated_at?: string;
    };
  };
  queue_entry?: {
    queue_number?: number;
    queue_position?: number;
    estimated_wait_time?: number;
    queue_identifier?: string;
  };
}

interface BackendNotification {
  id: string;
  patient_id?: string;
  user_id?: string;
  type?: string;
  recipient?: string;
  subject?: string;
  message: string;
  is_read?: boolean;
  status?: string;
  sent_at?: string;
  created_at?: string;
  updated_at?: string;
}

interface BackendPatientNote {
  id: string;
  content: string;
  version: number;
  created_at?: string;
  doctor_name?: string;
  doctor_id: string;
  patient_id: string;
}

interface BackendConsultationFeedback {
  id: string;
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  follow_up_date?: string;
  notes?: string;
  duration?: number;
  doctor_name?: string;
  patient_name?: string;
  created_at?: string;
}

interface BackendQueueData {
  appointment?: BackendAppointment;
  queue_number?: number;
  queue_position?: number;
  estimated_wait_time?: number;
}

// Frontend data interfaces (camelCase for UI components)
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
  specialization?: string;
  department?: string;
  licenseNumber?: string;
  isAvailable?: boolean;
  patientCount?: number;
}

export interface Appointment {
  id: string;
  patientName: string;
  gender: 'male' | 'female' | 'other';
  dateOfBirth: string;
  phoneNumber: string;
  conditionType: 'emergency' | 'elderly' | 'child' | 'normal';
  reason: string;
  queueNumber: number;
  currentPosition: number;
  estimatedTime: number;
  doctorName?: string;
  status: 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  // Additional fields for API communication
  patient_id?: string;
  doctor_id?: string;
  appointment_date?: string;
  urgency?: string;
  notes?: string;
  updated_at?: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  // Additional fields for API communication
  patient_id?: string;
  user_id?: string;
  type?: string;
  recipient?: string;
  subject?: string;
  is_read?: boolean;
  status?: string;
  sent_at?: string;
  updated_at?: string;
}

export interface PatientNote {
  id: string;
  content: string;
  version: number;
  createdAt: string;
  doctorName: string;
  doctorId: string;
  patientId: string;
}

export interface ConsultationFeedback {
  id: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  followUpDate?: string;
  notes?: string;
  duration: number;
  doctorName?: string;
  patientName?: string;
  createdAt: string;
}

// Enum mapping functions
const mapUrgencyToConditionType = (urgency: string): 'emergency' | 'elderly' | 'child' | 'normal' => {
  switch (urgency) {
    case 'emergency': return 'emergency';
    case 'high': return 'emergency';
    case 'normal': return 'normal';
    case 'low': return 'normal';
    default: return 'normal';
  }
};

const mapConditionTypeToUrgency = (conditionType: string): string => {
  switch (conditionType) {
    case 'emergency': return 'emergency';
    case 'elderly': return 'normal';
    case 'child': return 'normal';
    case 'normal': return 'normal';
    default: return 'normal';
  }
};

const mapStatusToFrontend = (status: string): 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'cancelled' => {
  switch (status) {
    case 'scheduled': return 'scheduled';
    case 'waiting': return 'waiting';
    case 'in_progress': return 'ongoing';
    case 'serving': return 'ongoing';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    case 'no_show': return 'cancelled';
    case 'skipped': return 'cancelled';
    default: return 'waiting';
  }
};

const mapStatusToBackend = (status: string): string => {
  switch (status) {
    case 'scheduled': return 'scheduled';
    case 'waiting': return 'waiting';
    case 'ongoing': return 'in_progress';
    case 'completed': return 'completed';
    case 'cancelled': return 'cancelled';
    default: return 'waiting';
  }
};

// Backend to Frontend transformers

/**
 * Transform backend user data to frontend User format
 */
export const transformToFrontendUser = (backendUser: BackendUser): User => {
  // Handle different user types (staff, doctor, patient)
  const isPatient = backendUser.phone_number !== undefined;
  const isDoctor = backendUser.user?.first_name !== undefined || backendUser.specialization !== undefined;
  
  if (isPatient) {
    // Transform patient data
    return {
      id: backendUser.id,
      fullName: `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim(),
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
    // Transform doctor data
    const user = backendUser.user;
    return {
      id: backendUser.id,
      fullName: user ? `${user.first_name} ${user.last_name}` : 'Unknown Doctor',
      firstName: user?.first_name,
      lastName: user?.last_name,
      email: user?.email,
      username: user?.username,
      role: 'doctor',
      specialization: backendUser.specialization,
      department: backendUser.department,
      licenseNumber: backendUser.license_number,
      isAvailable: backendUser.is_available,
      patientCount: backendUser.patient_count,
      isAuthenticated: true,
      isProfileComplete: true
    };
  } else {
    // Transform staff/admin data
    return {
      id: backendUser.id,
      fullName: `${backendUser.first_name || ''} ${backendUser.last_name || ''}`.trim(),
      firstName: backendUser.first_name,
      lastName: backendUser.last_name,
      email: backendUser.email,
      username: backendUser.username,
      role: backendUser.role || 'staff',
      isAuthenticated: true,
      isProfileComplete: true
    };
  }
};

/**
 * Transform backend appointment data to frontend Appointment format
 */
export const transformToFrontendAppointment = (backendData: BackendAppointment | BackendQueueData): Appointment => {
  const appointment = 'appointment' in backendData ? backendData.appointment : backendData;
  if (!appointment) {
    throw new Error('Invalid appointment data');
  }

  // Type guard to ensure we have a BackendAppointment
  if ('patient' in appointment) {
    const patient = appointment.patient;
    const doctor = appointment.doctor;
    const queueEntry = 'queue_entry' in backendData ? backendData.queue_entry : appointment.queue_entry;

    return {
      id: appointment.id,
      patientName: patient ? `${patient.first_name || ''} ${patient.last_name || ''}`.trim() : 'Unknown Patient',
      gender: (patient?.gender as 'male' | 'female' | 'other') || 'other',
      dateOfBirth: patient?.date_of_birth ? new Date(patient.date_of_birth).toISOString().split('T')[0] : '',
      phoneNumber: patient?.phone_number || '',
      conditionType: mapUrgencyToConditionType(appointment.urgency || 'normal'),
      reason: appointment.reason || '',
      queueNumber: queueEntry?.queue_number || 0,
      currentPosition: queueEntry?.queue_position || 0,
      estimatedTime: queueEntry?.estimated_wait_time || 0,
      doctorName: doctor?.user ? `${doctor.user.first_name || ''} ${doctor.user.last_name || ''}`.trim() : undefined,
      status: mapStatusToFrontend(appointment.status || 'waiting'),
      createdAt: appointment.created_at ? new Date(appointment.created_at).toISOString() : new Date().toISOString(),
      // API communication fields
      patient_id: appointment.patient_id,
      doctor_id: appointment.doctor_id,
      appointment_date: appointment.appointment_date,
      urgency: appointment.urgency,
      notes: appointment.notes,
      updated_at: appointment.updated_at
    };
  }

  // Handle BackendQueueData case
  throw new Error('Invalid appointment data structure');
};

/**
 * Transform backend notification data to frontend Notification format
 */
export const transformToFrontendNotification = (backendNotification: BackendNotification): Notification => {
  return {
    id: backendNotification.id,
    title: backendNotification.subject || backendNotification.message,
    message: backendNotification.message,
    read: backendNotification.is_read || false,
    createdAt: backendNotification.created_at ? new Date(backendNotification.created_at).toISOString() : new Date().toISOString(),
    // API communication fields
    patient_id: backendNotification.patient_id,
    user_id: backendNotification.user_id,
    type: backendNotification.type,
    recipient: backendNotification.recipient,
    subject: backendNotification.subject,
    is_read: backendNotification.is_read,
    status: backendNotification.status,
    sent_at: backendNotification.sent_at,
    updated_at: backendNotification.updated_at
  };
};

/**
 * Transform backend patient note data to frontend PatientNote format
 */
export const transformToFrontendPatientNote = (backendNote: BackendPatientNote): PatientNote => {
  return {
    id: backendNote.id,
    content: backendNote.content,
    version: backendNote.version,
    createdAt: backendNote.created_at ? new Date(backendNote.created_at).toISOString() : new Date().toISOString(),
    doctorName: backendNote.doctor_name || 'Unknown Doctor',
    doctorId: backendNote.doctor_id,
    patientId: backendNote.patient_id
  };
};

/**
 * Transform backend consultation feedback data to frontend ConsultationFeedback format
 */
export const transformToFrontendConsultationFeedback = (backendFeedback: BackendConsultationFeedback): ConsultationFeedback => {
  return {
    id: backendFeedback.id,
    diagnosis: backendFeedback.diagnosis || '',
    treatment: backendFeedback.treatment || '',
    prescription: backendFeedback.prescription || '',
    followUpDate: backendFeedback.follow_up_date ? new Date(backendFeedback.follow_up_date).toISOString().split('T')[0] : undefined,
    notes: backendFeedback.notes,
    duration: backendFeedback.duration || 0,
    doctorName: backendFeedback.doctor_name,
    patientName: backendFeedback.patient_name,
    createdAt: backendFeedback.created_at ? new Date(backendFeedback.created_at).toISOString() : new Date().toISOString()
  };
};

// Frontend to Backend transformers

interface FrontendUserData {
  username?: string;
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  phoneNumber?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  emergencyContact?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
}

interface FrontendAppointmentData {
  patientId?: string;
  doctorId?: string;
  appointmentDate?: string;
  reason?: string;
  conditionType?: string;
  status?: string;
  urgency?: string;
  notes?: string;
}

interface FrontendNotificationData {
  recipient?: string;
  type?: string;
  message?: string;
  title?: string;
  patientId?: string;
  userId?: string;
}

interface FrontendPatientNoteData {
  content?: string;
  patientId?: string;
  doctorId?: string; 
  previousVersionId?: string;
}

interface FrontendConsultationFeedbackData {
  diagnosis?: string;
  treatment?: string;
  prescription?: string;
  followUpDate?: string;
  duration?: number;
  appointmentId?: string;
  doctorId?: string;
}

interface FrontendQueueData {
  priorityScore?: number;
  status?: 'waiting' | 'called' | 'served' | 'cancelled';
  estimatedWaitTime?: number;
}

/**
 * Transform frontend user data to backend format
 */
export const transformToBackendUserData = (frontendUser: FrontendUserData) => {
  return {
    username: frontendUser.username,
    email: frontendUser.email,
    password: frontendUser.password,
    first_name: frontendUser.firstName,
    last_name: frontendUser.lastName,
    role: frontendUser.role,
    phone_number: frontendUser.phoneNumber,
    gender: frontendUser.gender,
    date_of_birth: frontendUser.dateOfBirth ? new Date(frontendUser.dateOfBirth).toISOString() : undefined,
    address: frontendUser.address,
    emergency_contact: frontendUser.emergencyContact,
    emergency_contact_name: frontendUser.emergencyContactName,
    emergency_contact_relationship: frontendUser.emergencyContactRelationship
  };
};

/**
 * Transform frontend appointment data to backend format
 */
export const transformToBackendAppointment = (frontendAppointment: FrontendAppointmentData) => {
  return {
    patient_id: frontendAppointment.patientId,
    doctor_id: frontendAppointment.doctorId,
    appointment_date: frontendAppointment.appointmentDate ? new Date(frontendAppointment.appointmentDate).toISOString() : undefined,
    reason: frontendAppointment.reason,
    urgency: frontendAppointment.urgency || mapConditionTypeToUrgency(frontendAppointment.conditionType || 'normal'),
    status: frontendAppointment.status ? mapStatusToBackend(frontendAppointment.status) : undefined,
    notes: frontendAppointment.notes
  };
};

/**
 * Transform frontend notification data to backend format
 */
export const transformToBackendNotification = (frontendNotification: FrontendNotificationData) => {
  return {
    recipient: frontendNotification.recipient,
    type: frontendNotification.type || 'system',
    message: frontendNotification.message,
    subject: frontendNotification.title,
    patient_id: frontendNotification.patientId,
    user_id: frontendNotification.userId
  };
};

/**
 * Transform frontend patient note data to backend format
 */
export const transformToBackendPatientNote = (frontendNote: FrontendPatientNoteData) => {
  return {
    content: frontendNote.content,
    patient_id: frontendNote.patientId,
    doctor_id: frontendNote.doctorId, // Add doctor_id field
    previous_version_id: frontendNote.previousVersionId
  };
};

/**
 * Transform frontend consultation feedback data to backend format
 */
export const transformToBackendConsultationFeedback = (frontendFeedback: FrontendConsultationFeedbackData) => {
  return {
    diagnosis: frontendFeedback.diagnosis,
    treatment: frontendFeedback.treatment,
    prescription: frontendFeedback.prescription,
    follow_up_date: frontendFeedback.followUpDate ? new Date(frontendFeedback.followUpDate).toISOString() : undefined,
    duration: frontendFeedback.duration,
    appointment_id: frontendFeedback.appointmentId,
    doctor_id: frontendFeedback.doctorId
  };
};

/**
 * Transform backend queue data to frontend format
 */
export const transformToFrontendQueueData = (backendData: BackendQueueData | BackendAppointment): Appointment => {
  // If it's a queue data object with appointment
  if ('appointment' in backendData && backendData.appointment) {
    return transformToFrontendAppointment(backendData.appointment);
  }
  
  // If it's a direct appointment object
  if ('patient' in backendData) {
    return transformToFrontendAppointment(backendData);
  }
  
  // Fallback for queue-only data
  const appointment = backendData as BackendAppointment;
  const patient = appointment.patient || {
    id: '',
    first_name: undefined,
    last_name: undefined,
    gender: undefined,
    date_of_birth: undefined,
    phone_number: undefined,
    email: undefined,
    address: undefined,
    emergency_contact: undefined,
    emergency_contact_name: undefined,
    emergency_contact_relationship: undefined,
    is_active: undefined,
    created_at: undefined,
    updated_at: undefined
  };
  const doctor = appointment.doctor || {
    id: '',
    user_id: undefined,
    specialization: undefined,
    license_number: undefined,
    department: undefined,
    consultation_fee: undefined,
    is_available: undefined,
    shift_start: undefined,
    shift_end: undefined,
    bio: undefined,
    education: undefined,
    experience: undefined,
    user: undefined
  };
  const queueEntry = appointment.queue_entry || {
    queue_number: undefined,
    queue_position: undefined,
    estimated_wait_time: undefined,
    queue_identifier: undefined
  };
  
  return {
    id: appointment.id || '',
    patientName: patient.first_name && patient.last_name 
      ? `${patient.first_name} ${patient.last_name}`.trim() 
      : patient.first_name || patient.last_name || 'Unknown Patient',
    gender: (patient.gender as 'male' | 'female' | 'other') || 'other',
    dateOfBirth: patient.date_of_birth ? new Date(patient.date_of_birth).toISOString().split('T')[0] : '',
    phoneNumber: patient.phone_number || '',
    conditionType: mapUrgencyToConditionType(appointment.urgency || 'normal'),
    reason: appointment.reason || '',
    queueNumber: queueEntry.queue_number || 0,
    currentPosition: queueEntry.queue_position || 0,
    estimatedTime: queueEntry.estimated_wait_time || 0,
    doctorName: doctor.user ? `${doctor.user.first_name || ''} ${doctor.user.last_name || ''}`.trim() : undefined,
    status: mapStatusToFrontend(appointment.status || 'waiting'),
    createdAt: appointment.created_at ? new Date(appointment.created_at).toISOString() : new Date().toISOString(),
    // API communication fields
    patient_id: appointment.patient_id,
    doctor_id: appointment.doctor_id,
    appointment_date: appointment.appointment_date,
    urgency: appointment.urgency,
    notes: appointment.notes,
    updated_at: appointment.updated_at
  };
};

/**
 * Transform frontend queue data to backend format
 */
export const transformToBackendQueueData = (frontendQueue: FrontendQueueData) => {
  const statusMap = {
    waiting: 'waiting',
    called: 'called',
    served: 'served',
    cancelled: 'cancelled'
  };
  
  return {
    priority_score: frontendQueue.priorityScore,
    status: frontendQueue.status ? statusMap[frontendQueue.status] : undefined,
    estimated_wait_time: frontendQueue.estimatedWaitTime
  };
}; 