import apiClient from '../api/apiClient';
import {
    User,
    AuthCredentials,
    AuthResponse,
    RegistrationData,
    ResetPasswordData
} from '../../types';

/**
 * Authentication Service for handling user authentication operations
 */
class AuthService {
    private readonly AUTH_ENDPOINT = '/auth';
    private readonly TOKEN_KEY = 'auth_token';
    private readonly REFRESH_TOKEN_KEY = 'refresh_token';
    private readonly USER_KEY = 'user';
    private readonly EXPIRES_AT_KEY = 'expires_at';

    /**
     * Login user with email and password
     */
    public async login(credentials: AuthCredentials): Promise<User> {
        const response = await apiClient.post<AuthResponse>(
            `${this.AUTH_ENDPOINT}/login`,
            credentials
        );

        // Store authentication data
        this.setAuthData(response);

        return response.user;
    }

    /**
     * Register a new user
     */
    public async register(data: RegistrationData): Promise<User> {
        const response = await apiClient.post<AuthResponse>(
            `${this.AUTH_ENDPOINT}/register`,
            data
        );

        // Store authentication data
        this.setAuthData(response);

        return response.user;
    }

    /**
     * Logout the current user
     */
    public async logout(): Promise<void> {
        try {
            // Call logout endpoint if the user is authenticated
            if (this.isAuthenticated()) {
                await apiClient.post(`${this.AUTH_ENDPOINT}/logout`);
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local auth data
            this.clearAuthData();
        }
    }

    /**
     * Request password reset
     */
    public async requestPasswordReset(email: string): Promise<void> {
        await apiClient.post<void>(`${this.AUTH_ENDPOINT}/password/reset-request`, { email });
    }

    /**
     * Verify password reset code
     */
    public async verifyResetCode(email: string, code: string): Promise<boolean> {
        const response = await apiClient.post<{ valid: boolean }>(
            `${this.AUTH_ENDPOINT}/password/verify-code`,
            { email, code }
        );
        return response.valid;
    }

    /**
     * Reset password with verification code
     */
    public async resetPassword(data: ResetPasswordData): Promise<void> {
        await apiClient.post<void>(`${this.AUTH_ENDPOINT}/password/reset`, data);
    }

    /**
     * Check if the current token needs refresh
     */
    public async refreshTokenIfNeeded(): Promise<void> {
        const expiresAt = this.getExpiresAt();
        const refreshToken = this.getRefreshToken();

        // Check if token is about to expire (within 5 minutes)
        if (expiresAt && refreshToken && Date.now() > expiresAt - 5 * 60 * 1000) {
            try {
                const response = await apiClient.post<AuthResponse>(
                    `${this.AUTH_ENDPOINT}/refresh-token`,
                    { refreshToken }
                );

                // Update authentication data
                this.setAuthData(response);
            } catch (error) {
                // If refresh fails, log out the user
                this.clearAuthData();
                throw error;
            }
        }
    }

    /**
     * Get the current user if authenticated
     */
    public getCurrentUser(): User | null {
        const userJson = this.getFromStorage(this.USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    }

    /**
     * Check if the user is authenticated
     */
    public async isAuthenticated(): Promise<boolean> {
        const token = await this.getTokenAsync();
        const expiresAt = await this.getExpiresAtAsync();

        // Check if token exists and is not expired
        return Boolean(token && expiresAt && Date.now() < expiresAt);
    }

    /**
     * Get the current authentication token (async version)
     */
    public async getTokenAsync(): Promise<string | null> {
        return this.getFromStorageAsync(this.TOKEN_KEY);
    }

    /**
     * Get token expiration timestamp (async version)
     */
    public async getExpiresAtAsync(): Promise<number | null> {
        const expiresAtStr = await this.getFromStorageAsync(this.EXPIRES_AT_KEY);
        return expiresAtStr ? parseInt(expiresAtStr, 10) : null;
    }

    /**
     * Get data from storage (async)
     */
    private async getFromStorageAsync(key: string): Promise<string | null> {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Web implementation
            return window.localStorage.getItem(key);
        } else {
            // In React Native environment
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                return await AsyncStorage.getItem(key);
            } catch (error) {
                console.warn('AsyncStorage not available:', error);
                return null;
            }
        }
    }

    /**
     * Get the refresh token
     */
    public getRefreshToken(): string | null {
        return this.getFromStorage(this.REFRESH_TOKEN_KEY);
    }

    /**
     * Get the current authentication token
     */
    public getToken(): string | null {
        return this.getFromStorage(this.TOKEN_KEY);
    }

    /**
     * Get token expiration timestamp
     */
    public getExpiresAt(): number | null {
        const expiresAtStr = this.getFromStorage(this.EXPIRES_AT_KEY);
        return expiresAtStr ? parseInt(expiresAtStr, 10) : null;
    }

    /**
     * Store authentication data
     */
    private setAuthData(authResponse: AuthResponse): void {
        // Store tokens and user data
        this.saveToStorage(this.TOKEN_KEY, authResponse.token);
        this.saveToStorage(this.REFRESH_TOKEN_KEY, authResponse.refreshToken);
        this.saveToStorage(this.EXPIRES_AT_KEY, authResponse.expiresAt.toString());
        this.saveToStorage(this.USER_KEY, JSON.stringify(authResponse.user));

        // Set token in API client
        apiClient.setAuthToken(authResponse.token);
    }

    /**
     * Clear all authentication data
     */
    private clearAuthData(): void {
        // Remove from storage
        this.removeFromStorage(this.TOKEN_KEY);
        this.removeFromStorage(this.REFRESH_TOKEN_KEY);
        this.removeFromStorage(this.EXPIRES_AT_KEY);
        this.removeFromStorage(this.USER_KEY);

        // Clear token in API client
        apiClient.setAuthToken(null);
    }

    /**
     * Save data to storage (abstracted to support different platforms)
     * Implementation depends on the platform (localStorage for web, AsyncStorage for React Native)
     */
    private saveToStorage(key: string, value: string): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Web implementation
            window.localStorage.setItem(key, value);
        } else {
            // In React Native environment
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                AsyncStorage.setItem(key, value);
            } catch (error) {
                console.warn('AsyncStorage not available:', error);
            }
        }
    }

    /**
     * Get data from storage
     */
    private getFromStorage(key: string): string | null {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Web implementation
            return window.localStorage.getItem(key);
        } else {
            // In React Native environment
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                // AsyncStorage is async but we need sync behavior here
                // This is a workaround - in a real app, refactor to use async/await properly
                let value = null;
                AsyncStorage.getItem(key).then((result: string | null) => {
                    value = result;
                });
                return value;
            } catch (error) {
                console.warn('AsyncStorage not available:', error);
                return null;
            }
        }
    }

    /**
     * Remove data from storage
     */
    private removeFromStorage(key: string): void {
        if (typeof window !== 'undefined' && window.localStorage) {
            // Web implementation
            window.localStorage.removeItem(key);
        } else {
            // In React Native environment
            try {
                const AsyncStorage = require('@react-native-async-storage/async-storage').default;
                AsyncStorage.removeItem(key);
            } catch (error) {
                console.warn('AsyncStorage not available:', error);
            }
        }
    }
}

// Create singleton instance
const authService = new AuthService();

export default authService; 