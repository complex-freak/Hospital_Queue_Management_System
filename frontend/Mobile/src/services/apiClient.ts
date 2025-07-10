import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// API configuration
const API_URL = 'http://localhost:8000/api'; // Change for production
const API_TIMEOUT = 30000; // 30 seconds

/**
 * API client for making HTTP requests from the mobile app
 */
class ApiClient {
    private client: AxiosInstance;
    private readonly AUTH_TOKEN_KEY = 'auth_token';

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
            async (config) => {
                // Get token from storage
                const token = await AsyncStorage.getItem(this.AUTH_TOKEN_KEY);
                
                // Add authorization header if token exists
                if (token && config.headers) {
                    config.headers['Authorization'] = `Bearer ${token}`;
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
     * Make a DELETE request
     */
    public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
        const response = await this.client.delete<T>(url, config);
        return response.data;
    }

    /**
     * Handle API errors
     */
    private handleApiError = (error: any): Promise<never> => {
        // Parse the error and return a standardized format
        const apiError = {
            status: error.response?.status || 0,
            message: error.response?.data?.message || error.message || 'An unknown error occurred',
            errors: error.response?.data?.errors,
        };

        return Promise.reject(apiError);
    };
}

// Create singleton instance
const apiClient = new ApiClient();

export default apiClient; 