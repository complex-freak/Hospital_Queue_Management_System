import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError } from '../../types';

// API configuration
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
const API_TIMEOUT = 30000; // 30 seconds

/**
 * Base API client for making HTTP requests
 */
class ApiClient {
    private client: AxiosInstance;
    private authToken: string | null = null;

    constructor() {
        // Create axios instance
        this.client = axios.create({
            baseURL: API_URL,
            timeout: API_TIMEOUT,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Setup request interceptor for authentication
        this.client.interceptors.request.use(
            (config) => {
                if (this.authToken) {
                    config.headers['Authorization'] = `Bearer ${this.authToken}`;
                }
                return config;
            },
            (error) => {
                return Promise.reject(error);
            }
        );

        // Setup response interceptor for error handling
        this.client.interceptors.response.use(
            (response) => response,
            this.handleApiError
        );
    }

    /**
     * Set the authentication token for API requests
     */
    public setAuthToken(token: string | null): void {
        this.authToken = token;
    }

    /**
     * Get the current authentication token
     */
    public getAuthToken(): string | null {
        return this.authToken;
    }

    /**
     * Make a GET request
     */
    public async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.get<T>(url, config);
        return response.data;
    }

    /**
     * Make a POST request
     */
    public async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.post<T>(url, data, config);
        return response.data;
    }

    /**
     * Make a PUT request
     */
    public async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.put<T>(url, data, config);
        return response.data;
    }

    /**
     * Make a PATCH request
     */
    public async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.patch<T>(url, data, config);
        return response.data;
    }

    /**
     * Make a DELETE request
     */
    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.delete<T>(url, config);
        return response.data;
    }

    /**
     * Handle API errors
     */
    private handleApiError = (error: AxiosError): Promise<never> => {
        if (error.response) {
            // Server responded with an error status code
            const { status, data } = error.response;

            // Handle 401 Unauthorized errors
            if (status === 401) {
                // Clear auth token
                this.setAuthToken(null);

                // Trigger authentication event for auth service to handle
                this.triggerAuthEvent('unauthorized');
            }

            // Format error response
            const apiError: ApiError = {
                status,
                message: (data as any)?.message || 'An unknown error occurred',
                errors: (data as any)?.errors,
            };

            return Promise.reject(apiError);
        } else if (error.request) {
            // Request was made but no response was received
            const apiError: ApiError = {
                status: 0,
                message: 'No response received from the server. Please check your internet connection.',
            };
            return Promise.reject(apiError);
        } else {
            // Something happened in setting up the request
            const apiError: ApiError = {
                status: 0,
                message: error.message || 'An unknown error occurred',
            };
            return Promise.reject(apiError);
        }
    };

    /**
     * Trigger authentication event
     */
    private triggerAuthEvent(eventType: 'unauthorized' | 'token-refresh'): void {
        // Using custom event to communicate with auth service
        const event = new CustomEvent('auth:event', {
            detail: { type: eventType }
        });

        // Dispatch event for auth service to handle
        document.dispatchEvent(event);
    }
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient; 