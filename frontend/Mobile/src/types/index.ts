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
    patientName: string;
    gender: Gender;
    dateOfBirth: string;
    phoneNumber: string;
    conditionType: ConditionType;
    queueNumber: number;
    currentPosition: number;
    estimatedTime: number;
    doctorName?: string;
    status: 'scheduled' | 'waiting' | 'ongoing' | 'completed' | 'cancelled';
    createdAt: string;
    reasonForVisit?: string;
    additionalInformation?: string;
    // Properties for offline sync
    _isOfflineCreated?: boolean;
    _locallyModified?: boolean;
    _lastModified?: number;
    _patientId?: string;
    _version?: number;
    _lastSynced?: number;
    appointmentDate?: string;
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