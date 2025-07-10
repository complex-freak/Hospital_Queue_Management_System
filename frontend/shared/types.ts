/**
 * Shared type definitions for the CVD Diagnosis app 
 * Used by both web and mobile frontends
 */

// User types
export type UserRole = 'patient' | 'clinician' | 'admin';

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

export interface Patient extends User {
    role: 'patient';
    dateOfBirth?: string;
    gender?: 'Male' | 'Female' | 'Other';
    phone?: string;
    address?: Address;
    emergencyContact?: EmergencyContact;
}

export interface Clinician extends User {
    role: 'clinician';
    specialty?: string;
    licenseNumber?: string;
    hospital?: string;
    department?: string;
}

export interface Admin extends User {
    role: 'admin';
}

// Health data types
export interface VitalSigns {
    bloodPressureSystolic: number;
    bloodPressureDiastolic: number;
    heartRate: number;
    respiratoryRate?: number;
    temperature?: number;
    weight?: number; // in kg
    height?: number; // in cm
    bloodOxygen?: number; // percentage
    timestamp: string; // ISO date string
}

export interface MedicalCondition {
    id: string;
    name: string;
    diagnosedAt: string; // ISO date
    status: 'active' | 'resolved' | 'unknown';
    notes?: string;
}

export interface Medication {
    id: string;
    name: string;
    dosage: string;
    frequency: string;
    startDate: string; // ISO date
    endDate?: string; // ISO date
    active: boolean;
    notes?: string;
}

export interface FamilyHistory {
    condition: string;
    relationship: string;
    ageAtDiagnosis?: number;
    notes?: string;
}

export interface Lifestyle {
    smokingStatus: 'never' | 'former' | 'current' | 'unknown';
    smokingPackYears?: number;
    alcoholUse: 'none' | 'light' | 'moderate' | 'heavy' | 'unknown';
    alcoholUnitsPerWeek?: number;
    exerciseFrequency: 'none' | 'light' | 'moderate' | 'vigorous' | 'unknown';
    exerciseMinutesPerWeek?: number;
    diet?: string;
}

export interface LabResult {
    id: string;
    testName: string;
    value: number | string;
    unit?: string;
    referenceRange?: string;
    takenAt: string; // ISO date
    notes?: string;
}

// Risk assessment types
export interface RiskAssessment {
    id: string;
    patientId: string;
    clinicianId: string;
    assessmentDate: string; // ISO date
    riskScore: number;
    riskLevel: 'low' | 'moderate' | 'high' | 'very-high';
    riskFactors: RiskFactor[];
    recommendations: Recommendation[];
    nextAssessmentDue?: string; // ISO date
}

export interface RiskFactor {
    name: string;
    severity: 'mild' | 'moderate' | 'severe';
    description: string;
    modifiable: boolean;
}

export interface Recommendation {
    category: 'lifestyle' | 'medication' | 'monitoring' | 'referral';
    description: string;
    priority: 'low' | 'medium' | 'high';
    timeframe?: string;
}

// Report types
export interface Report {
    id: string;
    title: string;
    description?: string;
    createdAt: string; // ISO date
    createdBy: string; // User ID
    templateId: string;
    patientId?: string; // Optional - can be for a single patient or multiple patients
    type: ReportType;
    status: ReportStatus;
    format: ReportFormat;
    scheduledFor?: string; // ISO date for scheduled reports
    lastGenerated?: string; // ISO date
    data: ReportData;
    sharingEnabled: boolean;
    sharedWith?: string[]; // User IDs
    recipients?: string[]; // Email addresses for auto-sending
}

export type ReportType =
    | 'patient-summary'
    | 'risk-assessment'
    | 'progress-tracker'
    | 'batch-summary'
    | 'clinic-analytics'
    | 'custom';

export type ReportStatus =
    | 'draft'
    | 'generated'
    | 'scheduled'
    | 'sent'
    | 'archived';

export type ReportFormat =
    | 'pdf'
    | 'csv'
    | 'excel'
    | 'html';

export interface ReportTemplate {
    id: string;
    name: string;
    description: string;
    type: ReportType;
    createdBy: string; // User ID
    createdAt: string; // ISO date
    updatedAt: string; // ISO date
    isSystemTemplate: boolean; // Whether it's a built-in template
    sections: ReportSection[];
    headerConfig: HeaderConfig;
    footerConfig: FooterConfig;
    styling: ReportStyling;
}

export interface ReportSection {
    id: string;
    title: string;
    type: SectionType;
    content?: string; // For static content
    dataSource?: string; // For dynamic sections, reference to what data to include
    visualizationType?: string; // e.g., 'chart', 'table', 'gauge'  
    includeInTOC: boolean;
    order: number;
    conditionalDisplay?: {
        condition: string; // E.g., "riskLevel === 'high'"
        operator?: 'AND' | 'OR';
    }[];
}

export type SectionType =
    | 'text'
    | 'patient-info'
    | 'vital-signs'
    | 'risk-visualization'
    | 'recommendations'
    | 'medication-list'
    | 'chart'
    | 'table'
    | 'comparison'
    | 'image';

export interface HeaderConfig {
    showLogo: boolean;
    logoPosition?: 'left' | 'center' | 'right';
    showTitle: boolean;
    showDate: boolean;
    showPageNumber: boolean;
    customText?: string;
}

export interface FooterConfig {
    showPageNumber: boolean;
    showDate: boolean;
    disclaimerText?: string;
    contactInfo?: string;
}

export interface ReportStyling {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    fontSize: string; // e.g., '12pt'
    includeCoverPage: boolean;
}

export interface ReportData {
    patientInfo?: Patient;
    assessments?: RiskAssessment[];
    vitalSigns?: VitalSigns[];
    medications?: Medication[];
    labResults?: LabResult[];
    customData?: Record<string, any>;
}

export interface ReportSchedule {
    id: string;
    reportTemplateId: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    dayOfWeek?: number; // 0-6 for weekly reports
    dayOfMonth?: number; // 1-31 for monthly reports
    timeOfDay: string; // HH:MM format
    recipients: string[]; // Email addresses
    nextScheduledFor: string; // ISO date
    createdBy: string; // User ID
    createdAt: string; // ISO date
    updatedAt: string; // ISO date
    active: boolean;
}

// Supporting types
export interface Address {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
}

export interface EmergencyContact {
    name: string;
    relationship: string;
    phone: string;
    email?: string;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: any;
} 

// Authentication types
export interface AuthCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface RegistrationData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: UserRole;
}

export interface ResetPasswordData {
  email: string;
  code: string;
  password: string;
} 