
import api from './client';
import { mockQueue } from './mock-data';
import { queueService } from './queue-service';
import { doctorService } from './doctor-service';
import { notificationService } from './notification-service';
import type { ProfileData } from './types';

// Combine all services into a single apiService object for backward compatibility
export const apiService = {
  ...queueService,
  ...doctorService,
  ...notificationService,
};

// Re-export everything for proper imports
export { 
  api as default,
  mockQueue,
  queueService,
  doctorService,
  notificationService,
};

// Re-export types correctly with 'export type'
export type { ProfileData };
