import api from './client';
import { mockQueue } from './mock-data';
import { queueService } from './queue-service';
import { doctorService } from './doctor-service';
import { notificationService } from './notification-service';
import { receptionistService } from './receptionist-service';
import { authService } from './auth-service';
import type { ProfileData } from './types';
import type { PatientRegistrationData, RegistrationDraft } from './receptionist-service';
import type { LoginCredentials, RegisterData, ChangePasswordData } from './auth-service';

// Combine all services into a single apiService object for backward compatibility
export const apiService = {
  ...queueService,
  ...doctorService,
  ...notificationService,
  ...receptionistService,
  ...authService,
};

// Re-export everything for proper imports
export { 
  api as default,
  mockQueue,
  queueService,
  doctorService,
  notificationService,
  receptionistService,
  authService,
};

// Re-export types correctly with 'export type'
export type { 
  ProfileData,
  PatientRegistrationData,
  RegistrationDraft,
  LoginCredentials,
  RegisterData,
  ChangePasswordData,
};
