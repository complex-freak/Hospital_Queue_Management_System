import api from './client';
import { mockQueue } from './mock-data';
import { queueService } from './queue-service';
import { doctorService } from './doctor-service';
import { notificationService } from './notification-service';
import { receptionistService } from './receptionist-service';
import type { ProfileData } from './types';
import type { PatientRegistrationData, RegistrationDraft } from './receptionist-service';

// Combine all services into a single apiService object for backward compatibility
export const apiService = {
  ...queueService,
  ...doctorService,
  ...notificationService,
  ...receptionistService,
};

// Re-export everything for proper imports
export { 
  api as default,
  mockQueue,
  queueService,
  doctorService,
  notificationService,
  receptionistService,
};

// Re-export types correctly with 'export type'
export type { 
  ProfileData,
  PatientRegistrationData,
  RegistrationDraft,
};
