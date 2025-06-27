import axios from 'axios';
import { toast } from '@/hooks/use-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1', // Use environment variable or default
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 seconds timeout
});

// Track ongoing requests to prevent duplicates
const pendingRequests = new Map();

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Generate request key
    const requestKey = `${config.method}:${config.url}`;
    
    // Check if we have a pending request with the same signature
    if (pendingRequests.has(requestKey)) {
      const controller = new AbortController();
      config.signal = controller.signal;
      controller.abort('Duplicate request canceled');
    }
    
    // Store this request
    pendingRequests.set(requestKey, true);
    
    // We'll clean up in the response interceptor instead
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    // Clear from pending requests
    const requestKey = `${response.config.method}:${response.config.url}`;
    pendingRequests.delete(requestKey);
    
    return response;
  },
  async (error) => {
    // Clear from pending requests if this was a tracked request
    if (error.config) {
      const requestKey = `${error.config.method}:${error.config.url}`;
      pendingRequests.delete(requestKey);
    }
    
    // Handle different error scenarios
    if (axios.isCancel(error)) {
      // Request was cancelled, likely a duplicate
      console.log('Request cancelled:', error.message);
      return Promise.reject(error);
    }
    
    const { response } = error;
    
    // Handle different error statuses
    if (response) {
      switch (response.status) {
        case 401:
          // Unauthorized - clear local storage and redirect to login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          
          // Only show toast and redirect if we're not already on the login page
          if (!window.location.pathname.includes('/login')) {
            toast({
              title: 'Session Expired',
              description: 'Your session has expired. Please log in again.',
              variant: 'destructive',
            });
            
            // Redirect to login page
            window.location.href = '/login';
          }
          break;
        case 403:
          toast({
            title: 'Access Denied',
            description: 'You do not have permission to perform this action.',
            variant: 'destructive',
          });
          break;
        case 404:
          // Don't show toast for 404s as they might be expected in some cases
          console.log('Resource not found:', error.config?.url);
          break;
        case 429:
          toast({
            title: 'Too Many Requests',
            description: 'Please slow down your requests and try again later.',
            variant: 'destructive',
          });
          break;
        case 500:
        case 502:
        case 503:
        case 504:
          toast({
            title: 'Server Error',
            description: 'The server encountered an error. Please try again later.',
            variant: 'destructive',
          });
          break;
        default:
          // Only show toast for errors that aren't 404
          if (response.status !== 404) {
            toast({
              title: `Error (${response.status})`,
              description: response.data?.message || response.data?.detail || 'Something went wrong. Please try again.',
              variant: 'destructive',
            });
          }
      }
    } else if (error.request) {
      // The request was made but no response was received
      // Network error or server is down
      toast({
        title: 'Network Error',
        description: 'Unable to connect to the server. Please check your internet connection and try again.',
        variant: 'destructive',
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error('Request setup error:', error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;
