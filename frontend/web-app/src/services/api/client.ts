import axios from 'axios';
import { toast } from '@/hooks/use-toast';

// Create axios instance with default config
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000', // Use environment variable or default
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track if token refresh is in progress to avoid multiple refreshes
let isRefreshingToken = false;
// Queue of requests that are waiting for token refresh
let refreshSubscribers: Array<(token: string) => void> = [];

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

/**
 * Refresh the access token using the refresh token if available
 * @returns Promise with the new token
 */
const refreshToken = async (): Promise<string> => {
  try {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }
    
    const response = await axios.post(
      `${api.defaults.baseURL}/auth/refresh-token`,
      { refresh_token: refreshToken },
      { headers: { 'Content-Type': 'application/json' } }
    );
    
    const { access_token, refresh_token } = response.data;
    
    // Store the new tokens
    localStorage.setItem('token', access_token);
    if (refresh_token) {
      localStorage.setItem('refreshToken', refresh_token);
    }
    
    return access_token;
  } catch (error) {
    // If refresh token is invalid, clear auth data and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw error;
  }
};

/**
 * Subscribe to token refresh and continue with the request once token is refreshed
 * @param callback Function to execute with the new token
 */
const subscribeTokenRefresh = (callback: (token: string) => void) => {
  refreshSubscribers.push(callback);
};

/**
 * Notify all subscribers that the token has been refreshed
 * @param token The new token
 */
const onTokenRefreshed = (token: string) => {
  refreshSubscribers.forEach((callback) => callback(token));
  refreshSubscribers = [];
};

// Add response interceptor
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const { response } = error;
    
    // Handle token refresh for 401 errors, but avoid infinite loops
    if (response && response.status === 401 && !originalRequest._retry) {
      if (isRefreshingToken) {
        // Wait for token refresh
        return new Promise<string>((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers['Authorization'] = `Bearer ${token}`;
            resolve(axios(originalRequest));
          });
        });
      }
      
      originalRequest._retry = true;
      isRefreshingToken = true;
      
      try {
        const newToken = await refreshToken();
        isRefreshingToken = false;
        onTokenRefreshed(newToken);
        
        // Retry the original request with the new token
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        isRefreshingToken = false;
        
        // Handle token refresh failure
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
        
        return Promise.reject(refreshError);
      }
    }
    
    // Handle different error statuses
    if (response) {
      switch (response.status) {
        case 401:
          // Only redirect if not a token refresh attempt
          if (originalRequest.url !== '/auth/refresh-token') {
            // Unauthorized - clear local storage and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');
            window.location.href = '/login';
            toast({
              title: 'Session Expired',
              description: 'Please log in again to continue.',
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
