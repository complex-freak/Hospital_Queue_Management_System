import axios from 'axios';
import { toast } from '@/hooks/use-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1', // Use environment variable or default
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
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
          toast({
            title: 'Not Found',
            description: 'The requested resource was not found.',
            variant: 'destructive',
          });
          break;
        case 429:
          toast({
            title: 'Too Many Requests',
            description: 'Please slow down your requests and try again later.',
            variant: 'destructive',
          });
          break;
        case 500:
          toast({
            title: 'Server Error',
            description: 'An internal server error occurred. Please try again later.',
            variant: 'destructive',
          });
          break;
        default:
          toast({
            title: 'Error',
            description: response.data?.message || response.data?.detail || 'Something went wrong. Please try again.',
            variant: 'destructive',
          });
      }
    } else {
      // Network error
      toast({
        title: 'Network Error',
        description: 'Please check your internet connection and try again.',
        variant: 'destructive',
      });
    }
    
    return Promise.reject(error);
  }
);

export default api;
