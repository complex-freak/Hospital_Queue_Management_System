import api from './client';
import { queueService } from './queue-service';
import { doctorService } from './doctor-service';
import { notificationService } from './notification-service';
import { receptionistService } from './receptionist-service';
import { authService } from './auth-service';
import { userService } from './user-service';
import { adminService } from './admin-service';
import type { ProfileData } from './types';
import type { PatientRegistrationData, RegistrationDraft } from './receptionist-service';
import type { LoginCredentials, RegisterData, ChangePasswordData } from './auth-service';
import type { UserData, UserUpdateData } from './user-service';
import type { 
  DashboardStats, 
  AuditLogEntry, 
  SystemSettings, 
  QueueSettings 
} from './admin-service';

// Combine all services into a single apiService object for backward compatibility
export const apiService = {
  ...queueService,
  ...doctorService,
  ...notificationService,
  ...receptionistService,
  ...authService,
  ...userService,
  ...adminService,
};

// Re-export everything for proper imports
export { 
  api as default,
  queueService,
  doctorService,
  notificationService,
  receptionistService,
  authService,
  userService,
  adminService,
};

// Re-export types
export type {
  ProfileData,
  PatientRegistrationData,
  RegistrationDraft,
  LoginCredentials,
  RegisterData,
  ChangePasswordData,
  UserData,
  UserUpdateData,
  DashboardStats,
  AuditLogEntry,
  SystemSettings,
  QueueSettings
};
