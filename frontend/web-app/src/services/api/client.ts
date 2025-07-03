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

// Handle global errors in a more user-friendly way
const handleErrorToast = (error) => {
  // Don't show toasts for canceled requests or if the page is hidden
  if (axios.isCancel(error) || document.visibilityState === 'hidden') {
    return;
  }
  
  const { response } = error;
  
  // Handle different error statuses
  if (response) {
    switch (response.status) {
      case 401:
        // Only show toast if we're not already on the login page
        if (!window.location.pathname.includes('/login')) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive',
          });
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
  } else if (error.request && !window.navigator.onLine) {
    toast({
      title: 'Network Error',
      description: 'You appear to be offline. Please check your internet connection.',
      variant: 'destructive',
    });
  } else if (error.request) {
    // The request was made but no response was received
    toast({
      title: 'Server Unavailable',
      description: 'Unable to connect to the server. Please try again later.',
      variant: 'destructive',
    });
  }
};

// Add request interceptor
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');
    
    // If token exists, add to headers
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // If the request already has a signal, we need to create a new AbortController
    // that will abort if either the original signal aborts or we need to abort for other reasons
    let currentController = null;
    
    if (config.signal) {
      const originalSignal = config.signal;
      currentController = new AbortController();
      
      // Set up signal listener for the original signal
      originalSignal.addEventListener('abort', () => {
        currentController.abort('Original request aborted');
      });
      
      // Use the new controller's signal
      config.signal = currentController.signal;
    }
    
    // Generate request key for tracking duplicates
    const requestKey = `${config.method}:${config.url}`;
    
    // Check if we have a pending request with the same signature
    // Only cancel duplicate GET requests that aren't critical API calls
    const isCriticalPath = config.url?.includes('/doctor/me') || config.url?.includes('/me');
    if (pendingRequests.has(requestKey) && 
        config.method?.toLowerCase() === 'get' &&
        !isCriticalPath) {
      // Only cancel duplicate GET requests
      if (!currentController) {
        currentController = new AbortController();
        config.signal = currentController.signal;
      }
      
      // Cancel with a more specific message
      currentController.abort('Duplicate request canceled');
    }
    
    // Store this request
    // For critical paths, use a unique key to avoid cancellation conflicts
    if (isCriticalPath) {
      pendingRequests.set(`${requestKey}-${Date.now()}`, true);
    } else {
      pendingRequests.set(requestKey, true);
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
      // Request was cancelled, don't trigger a global error
      console.log('Request cancelled:', error.message);
      return Promise.reject(error);
    }
    
    // Handle 401 Unauthorized errors by clearing storage
    if (error.response?.status === 401) {
      // Unauthorized - clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        // Redirect to login page
        window.location.href = '/login';
      }
    }
    
    // Show appropriate toast notifications
    handleErrorToast(error);
    
    return Promise.reject(error);
  }
);

export default api;
