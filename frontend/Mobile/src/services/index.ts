// API Services
import httpClient from './api';
import authService from './api/auth';
import appointmentService from './api/appointments';
import notificationService from './api/notifications';
import settingsService from './api/settings';
import connectivityService from './connectivity/connectivityServices';
import syncService from './storage/syncService';

export {
  // API Client
  httpClient,
  
  // Services
  authService,
  appointmentService,
  notificationService,
  settingsService,
  
  // Utility Services
  connectivityService,
  syncService,
};

// Default export all services
export default {
  httpClient,
  authService,
  appointmentService,
  notificationService,
  settingsService,
  connectivityService,
  syncService,
};