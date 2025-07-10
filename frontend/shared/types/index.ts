// Common types shared between web and mobile applications

// User role types
export type UserRole = 'patient' | 'clinician' | 'admin';

// Base user interface
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    createdAt: string;
    updatedAt: string;
    active: boolean;
}

// Patient specific interface
export interface Patient extends User {
    role: 'patient';
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phone?: string;
    address?: Address;
    emergencyContact?: EmergencyContact;
    medicalHistory?: MedicalHistory;
    deviceId?: string; // For mobile device identification
}

// Clinician specific interface
export interface Clinician extends User {
    role: 'clinician';
    specialty?: string;
    licenseNumber?: string;
    hospital?: string;
    department?: string;
}

// Address interface
export interface Address {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

// Emergency contact
export interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
}

// Medical history
export interface MedicalHistory {
    conditions: string[];
    medications: Medication[];
    allergies: string[];
    familyHistory: string[];
    surgeries: Surgery[];
}

// Medication
export interface Medication {
    name: string;
    dosage: string;
    frequency: string;
    startDate: string;
    endDate?: string;
}

// Surgery
export interface Surgery {
    procedure: string;
    date: string;
    hospital?: string;
}

// Authentication related types
export interface AuthCredentials {
    email: string;
    password: string;
}

export interface RegistrationData {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    dateOfBirth?: string;
    gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
    phone?: string;
}

export interface AuthResponse {
    user: User;
    token: string;
    refreshToken: string;
    expiresAt: number;
}

export interface ResetPasswordData {
    email: string;
    code?: string;
    newPassword?: string;
}

// Health data types
export interface VitalSigns {
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    heartRate: number;
    respiratoryRate?: number;
    temperature?: number;
    weight?: number;
    height?: number;
    bloodOxygen?: number;
    timestamp: string;
}

export interface LabResult {
    id: string;
    patientId: string;
    testName: string;
    testDate: string;
    result: string;
    unit?: string;
    normalRange?: string;
    isAbnormal?: boolean;
    notes?: string;
}

// Risk assessment types
export interface RiskAssessment {
    id: string;
    patientId: string;
    date: string;
    riskScore: number; // 0-100
    riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
    contributingFactors: ContributingFactor[];
    recommendations: Recommendation[];
}

export interface ContributingFactor {
    factor: string;
    impact: number; // 1-10
    description: string;
    modifiable: boolean;
}

export interface Recommendation {
    id: string;
    title: string;
    description: string;
    priority: 'high' | 'medium' | 'low';
    category: 'lifestyle' | 'medication' | 'clinical_followup' | 'tests';
    timeframe?: string;
}

// Report types
export interface Report {
    id: string;
    patientId: string;
    clinicianId: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    sections: ReportSection[];
    status: 'draft' | 'final' | 'shared';
}

export interface ReportSection {
    title: string;
    content: string;
    dataType?: 'text' | 'chart' | 'table' | 'image';
    data?: any;
}

// API related types
export interface ApiError {
    status: number;
    message: string;
    errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
    data: T[];
    meta: {
        currentPage: number;
        totalPages: number;
        totalItems: number;
        itemsPerPage: number;
    };
}

// Notification types
export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'alert' | 'reminder' | 'info';
    priority: 'high' | 'normal' | 'low';
    read: boolean;
    createdAt: string;
    metadata?: Record<string, any>;
} 