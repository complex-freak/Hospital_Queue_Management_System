// API Services
import httpClient from './api';
import authService from './api/auth';
import appointmentService from './api/appointments';

export {
  // API Client
  httpClient,
  
  // Services
  authService,
  appointmentService,
};

// Default export all services
export default {
  httpClient,
  authService,
  appointmentService,
};