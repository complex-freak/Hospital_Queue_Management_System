export type PriorityLevel = 'Low' | 'Medium' | 'High';

export interface PatientHistory {
  visitDate: string;
  diagnosis: string;
  treatment: string;
  notes: string;
  doctorName: string;
}

export interface NoteVersion {
  id: string;
  content: string;
  timestamp: string;
  doctorName: string;
}

export interface Patient {
  id: string;
  name: string;
  priority: PriorityLevel;
  status: string;
  registeredTime: Date;
  department: string;
  reason: string;
  checkInTime: string;
  age?: number;
  gender?: string;
  contactNumber?: string;
  medicalHistory?: PatientHistory[];
  allergies?: string[];
  currentMedications?: string[];
  vitalSigns?: {
    bloodPressure?: string;
    heartRate?: number;
    temperature?: number;
    respiratoryRate?: number;
  };
  notes?: string;
  noteHistory?: NoteVersion[];
}

export interface ConsultationFeedback {
  patientId: string;
  appointmentId?: string;
  doctorId?: string;
  diagnosis: string;
  treatment: string;
  prescription: string;
  followUpDate?: string;
  followUp?: {
    date?: string;
    instructions?: string;
  };
  notes: string;
  duration?: number;
}
