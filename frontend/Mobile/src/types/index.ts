export interface User {
    id: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    phoneNumber: string;
    isAuthenticated: boolean;
    isProfileComplete?: boolean;
    email?: string;
    gender?: 'male' | 'female' | 'other';
    dateOfBirth?: string;
    address?: string;
    emergencyContact?: string;
    emergencyContactName?: string;
    emergencyContactRelationship?: string;
}

export type ConditionType = 'emergency' | 'elderly' | 'child' | 'normal';
export type Gender = 'male' | 'female' | 'other';

export interface Appointment {
    id: string;
    patient_id: string;
    doctor_id?: string;
    appointment_date: string;
    reason?: string;
    urgency: 'low' | 'normal' | 'high' | 'emergency';
    status: 'scheduled' | 'waiting' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
    notes?: string;
    created_at?: string;
    updated_at?: string;
    
    // Queue information (added dynamically by backend)
    queue_position?: number;
    estimated_wait_time?: number;
    queue_number?: number;
    queue_identifier?: string;
    
    // Relationships (loaded by backend)
    patient?: {
        id: string;
        first_name: string;
        last_name: string;
        phone_number: string;
        email?: string;
        date_of_birth?: string;
        gender?: string;
        address?: string;
        emergency_contact?: string;
        emergency_contact_name?: string;
        emergency_contact_relationship?: string;
        is_active: boolean;
        created_at?: string;
        updated_at?: string;
    };
    
    doctor?: {
        id: string;
        user_id: string;
        specialization?: string;
        license_number?: string;
        department?: string;
        consultation_fee?: number;
        is_available: boolean;
        shift_start?: string;
        shift_end?: string;
        bio?: string;
        education?: string;
        experience?: string;
        user?: {
            id: string;
            username: string;
            email?: string;
            first_name: string;
            last_name: string;
            role: string;
            is_active: boolean;
            created_at?: string;
            updated_at?: string;
        };
    };
    
    // Legacy fields for backward compatibility
    patientName?: string;
    gender?: Gender;
    dateOfBirth?: string;
    phoneNumber?: string;
    conditionType?: ConditionType;
    currentPosition?: number;
    estimatedTime?: number;
    doctorName?: string;
    createdAt?: string;
    reasonForVisit?: string;
    additionalInformation?: string;
    
    // Properties for offline sync
    _isOfflineCreated?: boolean;
    _locallyModified?: boolean;
    _lastModified?: number;
    _patientId?: string;
    _version?: number;
    _lastSynced?: number;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
    // Properties for offline sync
    _isOfflineCreated?: boolean;
    _locallyModified?: boolean;
    _lastModified?: number;
    _version?: number;
    _lastSynced?: number;
}

export interface AuthState {
    user: User | null;
    loading: boolean;
    error: string | null;
}

export interface QueueState {
    appointment: Appointment | null;
    loading: boolean;
    error: string | null;
}

export interface NotificationState {
    notifications: Notification[];
    loading: boolean;
    error: string | null;
}

export interface AppSettings {
    language: string;
    notificationsEnabled: boolean;
    version: string;
}

// Types for offline sync
export interface SyncInfo {
    pendingActions: number;
    lastSyncTime: number | null;
    syncInProgress: boolean;
}

export interface ConnectionInfo {
    isConnected: boolean;
    lastChecked: number;
    connectionType: string | null;
} 