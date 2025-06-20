// Environment configuration

// Environment Types
type Environment = 'development' | 'staging' | 'production';

// Current environment
export const ENVIRONMENT: Environment = 'development';

// API URLs for different environments
const API_URLS = {
  development: 'http://192.168.173.140:8000', // Local development (using your IP address)
  staging: 'https://staging-api.hospitalapp.com',
  production: 'https://api.hospitalapp.com',
};

// Authentication
export const AUTH_CONFIG = {
  ACCESS_TOKEN_KEY: 'access_token',
  REFRESH_TOKEN_KEY: 'refresh_token',
  TOKEN_EXPIRY_BUFFER: 300, // 5 minutes in seconds
};

// Storage Keys
export const STORAGE_KEYS = {
  USER_DATA: 'user',
  APPOINTMENTS: 'appointments',
  NOTIFICATIONS: 'notifications',
  SETTINGS: 'settings',
  OFFLINE_QUEUE: 'offline_queue', 
  QUEUE_STATUS: 'queue_status',
  SYNC_INFO: 'sync_info',
  CONNECTION_INFO: 'connection_info',
  CACHE_VERSION: 'cache_version',
  LAST_SYNC_TIMESTAMP: 'last_sync_timestamp',
  PUSH_NOTIFICATION_TOKEN: 'push_notification_token',
};

// Request Configuration
export const REQUEST_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
};

// API Paths
export const API_PATHS = {
  AUTH: {
    REGISTER: '/api/v1/patient/register',
    LOGIN: '/api/v1/patient/login',
    PROFILE: '/api/v1/patient/profile',
    COMPLETE_PROFILE: '/api/v1/patient/complete-profile',
    DELETE_ACCOUNT: '/api/v1/patient/delete-account',
    CHANGE_PASSWORD: '/api/v1/patient/change-password',
  },
  APPOINTMENTS: {
    BASE: '/api/v1/patient/appointments',
    QUEUE_STATUS: '/api/v1/patient/queue-status',
  },
  NOTIFICATIONS: {
    BASE: '/api/v1/patient/notifications',
    READ: (id: string) => `/api/v1/patient/notifications/${id}/read`,
    DEVICE_TOKEN: '/api/v1/patient/device-token',
  },
  SETTINGS: {
    BASE: '/api/v1/patient/settings',
  }
};

// Version Information
export const APP_VERSION = '1.0.0';

// Feature Flags
export const FEATURES = {
  OFFLINE_MODE: true,
  PUSH_NOTIFICATIONS: true,
  BIOMETRIC_AUTH: false,
};

// Export API URL based on current environment
export const API_URL = API_URLS[ENVIRONMENT];

// Default export for all config
export default {
  ENVIRONMENT,
  API_URL,
  AUTH_CONFIG,
  STORAGE_KEYS,
  REQUEST_CONFIG,
  API_PATHS,
  APP_VERSION,
  FEATURES,
}; 