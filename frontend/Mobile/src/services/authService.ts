import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock user data for testing
export interface User {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'patient' | 'clinician' | 'admin';
    createdAt: string;
    updatedAt: string;
    active: boolean;
    dateOfBirth?: string;
    gender?: 'Male' | 'Female' | 'Other';
    phone?: string;
}

export interface AuthCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    token: string;
    refreshToken: string;
    expiresAt: number;
    user: User;
}

export interface AuthError {
    code: string;
    message: string;
    details?: any;
}

// Mock user accounts for testing
const MOCK_USERS = [
    {
        id: '1',
        email: 'witnessreuben6@gmail.com',
        password: 'password123',
        firstName: 'Witness',
        lastName: 'Reuben',
        role: 'patient' as const,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        active: true,
        dateOfBirth: '2001-03-10',
        gender: 'Female' as const,
        phone: '+255 623 753 648'
    },
    {
        id: '2',
        email: 'doctor@example.com',
        password: 'password123',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'clinician' as const,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
        active: true
    }
];

/**
 * Authentication Service for React Native mobile app
 */
class AuthService {
    private readonly TOKEN_KEY = 'auth_token';
    private readonly REFRESH_TOKEN_KEY = 'refresh_token';
    private readonly USER_KEY = 'user';
    private readonly EXPIRES_AT_KEY = 'expires_at';
    private readonly IS_MOCK_MODE = true; // Toggle for mock mode

    /**
     * Login with email and password
     */
    public async login(credentials: AuthCredentials): Promise<AuthResponse> {
        try {
            if (this.IS_MOCK_MODE) {
                return await this.mockLogin(credentials);
            }
            
            // Real API implementation would go here
            throw new Error('API login not implemented');
            
        } catch (error) {
            // Standardize error format
            const authError: AuthError = this.handleAuthError(error, 'login');
            throw authError;
        }
    }

    /**
     * Register a new user
     */
    public async register(userData: any): Promise<AuthResponse> {
        try {
            if (this.IS_MOCK_MODE) {
                return await this.mockRegister(userData);
            }
            
            // Real API implementation would go here
            throw new Error('API registration not implemented');
            
        } catch (error) {
            const authError: AuthError = this.handleAuthError(error, 'register');
            throw authError;
        }
    }

    /**
     * Logout the current user
     */
    public async logout(): Promise<void> {
        try {
            // For both mock and real implementations, just clear the local auth data
            await this.clearAuthData();
        } catch (error) {
            console.error('Logout error:', error);
        }
    }

    /**
     * Check if the user is authenticated
     */
    public async isAuthenticated(): Promise<boolean> {
        try {
            const token = await AsyncStorage.getItem(this.TOKEN_KEY);
            const expiresAtStr = await AsyncStorage.getItem(this.EXPIRES_AT_KEY);
            const expiresAt = expiresAtStr ? parseInt(expiresAtStr, 10) : null;

            return Boolean(token && expiresAt && Date.now() < expiresAt);
        } catch (error) {
            console.error('Error checking authentication status:', error);
            return false;
        }
    }

    /**
     * Get the current user
     */
    public async getCurrentUser(): Promise<User | null> {
        try {
            const userJson = await AsyncStorage.getItem(this.USER_KEY);
            return userJson ? JSON.parse(userJson) : null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    /**
     * Set auth data after login/registration
     */
    public async setAuthData(data: AuthResponse): Promise<void> {
        try {
            await AsyncStorage.setItem(this.TOKEN_KEY, data.token);
            await AsyncStorage.setItem(this.REFRESH_TOKEN_KEY, data.refreshToken);
            await AsyncStorage.setItem(this.EXPIRES_AT_KEY, data.expiresAt.toString());
            await AsyncStorage.setItem(this.USER_KEY, JSON.stringify(data.user));
        } catch (error) {
            console.error('Error setting auth data:', error);
            throw this.handleAuthError(error, 'storage');
        }
    }

    /**
     * Clear auth data on logout
     */
    public async clearAuthData(): Promise<void> {
        try {
            await AsyncStorage.removeItem(this.TOKEN_KEY);
            await AsyncStorage.removeItem(this.REFRESH_TOKEN_KEY);
            await AsyncStorage.removeItem(this.EXPIRES_AT_KEY);
            await AsyncStorage.removeItem(this.USER_KEY);
        } catch (error) {
            console.error('Error clearing auth data:', error);
        }
    }

    /**
     * Mock login for testing
     */
    private async mockLogin(credentials: AuthCredentials): Promise<AuthResponse> {
        // Simulate network delay
        await this.delay(800);

        const user = MOCK_USERS.find(u => 
            u.email.toLowerCase() === credentials.email.toLowerCase() && 
            u.password === credentials.password
        );

        if (!user) {
            throw new Error('Invalid email or password');
        }

        const { password, ...userWithoutPassword } = user;
        
        // Create auth response with mock token
        const authResponse: AuthResponse = {
            token: 'mock-token-' + Math.random().toString(36).substring(2),
            refreshToken: 'mock-refresh-token-' + Math.random().toString(36).substring(2),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
            user: userWithoutPassword as User
        };

        await this.setAuthData(authResponse);
        return authResponse;
    }

    /**
     * Mock registration for testing
     */
    private async mockRegister(userData: any): Promise<AuthResponse> {
        // Simulate network delay
        await this.delay(1200);

        // Check if user already exists
        const existingUser = MOCK_USERS.find(u => 
            u.email.toLowerCase() === userData.email.toLowerCase()
        );

        if (existingUser) {
            throw new Error('Email already registered');
        }

        // Create mock user
        const newUser = {
            id: (MOCK_USERS.length + 1).toString(),
            email: userData.email,
            password: userData.password,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: 'patient' as const,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            active: true,
            dateOfBirth: userData.dateOfBirth,
            gender: userData.gender,
            phone: userData.phone
        };

        // In a real app, we would add to database - here we just create the response
        const { password, ...userWithoutPassword } = newUser;
        
        // Create auth response
        const authResponse: AuthResponse = {
            token: 'mock-token-' + Math.random().toString(36).substring(2),
            refreshToken: 'mock-refresh-token-' + Math.random().toString(36).substring(2),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours from now
            user: userWithoutPassword as User
        };

        await this.setAuthData(authResponse);
        return authResponse;
    }

    /**
     * Helper to create delay for simulating network requests
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Standardize error handling across auth operations
     */
    private handleAuthError(error: any, operation: string): AuthError {
        console.error(`Auth error during ${operation}:`, error);
        
        // Create standardized error format
        return {
            code: error.code || 'auth_error',
            message: error.message || `An error occurred during ${operation}`,
            details: error.details || error
        };
    }
}

const authService = new AuthService();
export default authService; 