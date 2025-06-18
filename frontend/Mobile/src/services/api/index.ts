import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, DeviceEventEmitter } from 'react-native';
import { API_URL, AUTH_CONFIG, REQUEST_CONFIG } from '../../config/env';
import { connectivityService } from '../connectivity/connectivityServices';
import { syncService } from '../storage/syncService';

// Types
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  isSuccess: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}

export interface ApiError {
  status: number;
  message: string;
  errors?: Record<string, string[]>;
  data?: any;
}

// Extended request config type to add _retry property
interface ExtendedRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

class HttpClient {
  private instance: AxiosInstance;
  private isRefreshing = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL: string = API_URL) {
    console.log('HttpClient initialized with base URL:', baseURL);
    this.instance = axios.create({
      baseURL,
      timeout: REQUEST_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': `HospitalApp/${Platform.OS}`,
      },
    });

    this.setupInterceptors();
    
    // Load token on initialization
    this.loadTokenFromStorage();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.instance.interceptors.request.use(
      async (config) => {
        // Add token to requests if available
        const token = await AsyncStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        // Log request for debugging
        console.log(`🚀 Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, { 
          headers: config.headers,
          data: config.data
        });
        
        return config;
      },
      (error) => {
        console.log('❌ Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => {
        console.log(`✅ Response: ${response.status}`, { 
          url: response.config.url, 
          data: response.data
        });
        return response;
      },
      async (error: AxiosError) => {
        console.log('❌ Response Error:', { 
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
          message: error.message 
        });
        const originalRequest = error.config as ExtendedRequestConfig | undefined;

        // Handle 401 Unauthorized errors (token expired)
        if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
          // Emit token invalid event for React Native
          DeviceEventEmitter.emit('auth_token_invalid');
          
          if (this.isRefreshing) {
            // If already refreshing, wait for new token
            return new Promise((resolve) => {
              this.refreshSubscribers.push((token: string) => {
                if (originalRequest.headers) {
                  originalRequest.headers['Authorization'] = `Bearer ${token}`;
                }
                resolve(this.instance(originalRequest));
              });
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            // Attempt to refresh token (placeholder for now)
            // In a real implementation, you would call your refresh token endpoint
            await AsyncStorage.removeItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
            this.isRefreshing = false;
            this.refreshSubscribers = [];
            return Promise.reject(error);
          } catch (refreshError) {
            this.isRefreshing = false;
            this.refreshSubscribers = [];
            return Promise.reject(error);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private formatResponse<T>(response: AxiosResponse<T>): ApiResponse<T> {
    return {
      data: response.data,
      status: response.status,
      isSuccess: true,
    };
  }

  private formatError(error: AxiosError): ApiError {
    const status = error.response?.status || 500;
    let message = error?.message || 'Unknown error occurred';
    
    // Get a more specific error message if available
    if (error.response?.data) {
      const data = error.response.data as any;
      if (typeof data === 'string') {
        message = data;
      } else if (data.message) {
        message = data.message;
      } else if (data.detail) {
        message = typeof data.detail === 'string' 
          ? data.detail 
          : 'Validation error occurred';
      } else if (status === 401) {
        message = 'Authentication failed';
      } else if (status === 403) {
        message = 'You do not have permission to access this resource';
      } else if (status === 404) {
        message = 'The requested resource was not found';
      } else if (status === 500) {
        message = 'Server error occurred';
      }
    }
    
    // Log the full error for debugging
    console.log(`API Error (${status}): ${message}`, {
      url: error.config?.url,
      method: error.config?.method,
      data: error.response?.data
    });

    let errors: Record<string, string[]> | undefined = undefined;
    if (
      error.response?.data && 
      typeof error.response.data === 'object'
    ) {
      const data = error.response.data as any;
      if (data.errors) {
        errors = data.errors;
      } else if (data.detail && Array.isArray(data.detail)) {
        // Handle FastAPI validation errors
        errors = {};
        data.detail.forEach((item: any) => {
          const field = item.loc.slice(1).join('.');
          if (!errors![field]) {
            errors![field] = [];
          }
          errors![field].push(item.msg);
        });
      }
    }

    // Add full response data for debugging
    const responseData = error.response?.data || {};

    return {
      status,
      message,
      errors,
      data: responseData
    };
  }

  // HTTP methods
  public async get<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      console.log(`Making GET request to: ${url}`);
      const response = await this.instance.get<T>(url, config);
      return this.formatResponse<T>(response);
    } catch (error) {
      console.error(`GET request failed for URL: ${url}`, error);
      const formattedError = this.formatError(error as AxiosError);
      console.log(`Formatted error: ${JSON.stringify(formattedError)}`);
      return {
        data: null as unknown as T,
        status: formattedError.status,
        isSuccess: false,
        message: formattedError.message,
        errors: formattedError.errors
      };
    }
  }

  public async post<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.post<T>(url, data, config);
      return this.formatResponse<T>(response);
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  public async put<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.put<T>(url, data, config);
      return this.formatResponse<T>(response);
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }

  public async delete<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      const response = await this.instance.delete<T>(url, config);
      return this.formatResponse<T>(response);
    } catch (error) {
      throw this.formatError(error as AxiosError);
    }
  }
  
  // Offline support methods
  public async postWithOfflineSupport<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // Try online request first
      if (connectivityService.isNetworkConnected()) {
        const response = await this.post<T>(url, data, config);
        return response;
      } else {
        // No connection, queue for later
        const actionId = await syncService.queueAction(url, 'POST', data);
        
        // Return mock response
        return {
          data: { id: actionId, ...data } as unknown as T,
          status: 202, // Accepted
          isSuccess: true,
          message: 'Request queued for processing when online',
        };
      }
    } catch (error) {
      // If error is not connectivity-related, throw it
      if (connectivityService.isNetworkConnected()) {
        throw this.formatError(error as AxiosError);
      }
      
      // Otherwise queue for later
      const actionId = await syncService.queueAction(url, 'POST', data);
      
      // Return mock response
      return {
        data: { id: actionId, ...data } as unknown as T,
        status: 202, // Accepted
        isSuccess: true,
        message: 'Request queued for processing when online',
      };
    }
  }

  public async putWithOfflineSupport<T = any>(
    url: string,
    data?: any,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // Try online request first
      if (connectivityService.isNetworkConnected()) {
        const response = await this.put<T>(url, data, config);
        return response;
      } else {
        // No connection, queue for later
        const actionId = await syncService.queueAction(url, 'PUT', data);
        
        // Return mock response
        return {
          data: { id: actionId, ...data } as unknown as T,
          status: 202, // Accepted
          isSuccess: true,
          message: 'Request queued for processing when online',
        };
      }
    } catch (error) {
      // If error is not connectivity-related, throw it
      if (connectivityService.isNetworkConnected()) {
        throw this.formatError(error as AxiosError);
      }
      
      // Otherwise queue for later
      const actionId = await syncService.queueAction(url, 'PUT', data);
      
      // Return mock response
      return {
        data: { id: actionId, ...data } as unknown as T,
        status: 202, // Accepted
        isSuccess: true,
        message: 'Request queued for processing when online',
      };
    }
  }

  public async deleteWithOfflineSupport<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    try {
      // Try online request first
      if (connectivityService.isNetworkConnected()) {
        const response = await this.delete<T>(url, config);
        return response;
      } else {
        // No connection, queue for later
        const actionId = await syncService.queueAction(url, 'DELETE', null);
        
        // Return mock response
        return {
          data: { id: actionId } as unknown as T,
          status: 202, // Accepted
          isSuccess: true,
          message: 'Delete request queued for processing when online',
        };
      }
    } catch (error) {
      // If error is not connectivity-related, throw it
      if (connectivityService.isNetworkConnected()) {
        throw this.formatError(error as AxiosError);
      }
      
      // Otherwise queue for later
      const actionId = await syncService.queueAction(url, 'DELETE', null);
      
      // Return mock response
      return {
        data: { id: actionId } as unknown as T,
        status: 202, // Accepted
        isSuccess: true,
        message: 'Delete request queued for processing when online',
      };
    }
  }
  
  // Token management
  public async setToken(token: string): Promise<void> {
    try {
      console.log('Setting token in HTTP client');
      // Set in default headers
      this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Also save to AsyncStorage
      await AsyncStorage.setItem(AUTH_CONFIG.ACCESS_TOKEN_KEY, token);
    } catch (error) {
      console.error('Error setting token:', error);
    }
  }

  public async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
  }

  public async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
  }

  // Load token from storage on initialization
  private async loadTokenFromStorage(): Promise<void> {
    try {
      const token = await AsyncStorage.getItem(AUTH_CONFIG.ACCESS_TOKEN_KEY);
      if (token) {
        console.log('Token found in storage, setting in HTTP client');
        // Set default authorization header
        this.instance.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Error loading token from storage:', error);
    }
  }
}

// Create and export a singleton instance
export const httpClient = new HttpClient();
export default httpClient;