export interface User {
    id: string;
    fullName: string;
    phoneNumber: string;
    isAuthenticated: boolean;
}

export type ConditionType = 'emergency' | 'elderly' | 'child' | 'normal';
export type Gender = 'male' | 'female';

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
    status: 'waiting' | 'ongoing' | 'completed' | 'cancelled';
    createdAt: string;
}

export interface Notification {
    id: string;
    title: string;
    message: string;
    read: boolean;
    createdAt: string;
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