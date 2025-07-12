import api from './client';
import { transformToFrontendUser, transformToBackendUserData, User } from './data-transformers';
import { ApiError } from './types';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface PatientLoginCredentials {
  phone_number: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'staff' | 'receptionist' | 'doctor' | 'admin';
}

export interface PatientRegisterData {
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
  email?: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
}

export interface ChangePasswordData {
  currentPassword: string;
  newPassword: string;
}

export interface UserRole {
  id: string;
  name: string;
  permissions: string[];
}

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn?: number;
  refreshToken?: string;
  user?: User;
}

// Authentication service for the web app
export const authService = {
  // Unified login for all user types
  login: async (credentials: LoginCredentials) => {
    try {
      const response = await api.post('/auth/login', {
        username: credentials.username,
        password: credentials.password
      });
      
      if (response.data.access_token) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // Create user object from response data
        const userData = transformToFrontendUser({
          id: response.data.user_id,
          username: response.data.username,
          role: response.data.user_role
        });
        localStorage.setItem('user', JSON.stringify(userData));
        
        return {
          success: true,
          data: {
            accessToken: response.data.access_token,
            tokenType: response.data.token_type || 'bearer',
            user: userData,
            userRole: response.data.user_role
          }
        };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error: unknown) {
      console.error('Login error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Failed to login. Please check your credentials.'
      };
    }
  },
  

  
  // Patient login (for mobile app)
  patientLogin: async (credentials: PatientLoginCredentials) => {
    try {
      const response = await api.post('/patient/login', {
        phone_number: credentials.phone_number,
        password: credentials.password
      });
      
      if (response.data.access_token) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // Try to fetch patient profile
        try {
          const profileResponse = await api.get('/patient/profile', {
            headers: { 'Authorization': `Bearer ${response.data.access_token}` }
          });
          
          if (profileResponse.data) {
            const userData = transformToFrontendUser({
              ...profileResponse.data,
              role: 'patient'
            });
            localStorage.setItem('user', JSON.stringify(userData));
            
            return {
              success: true,
              data: {
                accessToken: response.data.access_token,
                tokenType: response.data.token_type || 'bearer',
                user: userData
              }
            };
          }
        } catch (profileError) {
          console.error('Error fetching patient profile:', profileError);
        }
        
        return {
          success: true,
          data: {
            accessToken: response.data.access_token,
            tokenType: response.data.token_type || 'bearer'
          }
        };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error: unknown) {
      console.error('Patient login error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Failed to login. Please check your credentials.'
      };
    }
  },
  
  // Register new user (staff/admin)
  register: async (userData: RegisterData) => {
    try {
      // Transform frontend data to backend format
      const backendData = transformToBackendUserData({
        username: userData.username,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role
      });

      const response = await api.post('/admin/register', backendData);
      
      if (response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return { success: false, error: 'Registration failed' };
    } catch (error: unknown) {
      console.error('Registration error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Registration failed. Please try again.'
      };
    }
  },
  
  // Register new patient
  registerPatient: async (patientData: PatientRegisterData) => {
    try {
      const response = await api.post('/patient/register', patientData);
      
      if (response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return { success: false, error: 'Patient registration failed' };
    } catch (error: unknown) {
      console.error('Patient registration error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Patient registration failed. Please try again.'
      };
    }
  },
  
  // Register patient by staff
  registerPatientByStaff: async (patientData: PatientRegisterData) => {
    try {
      const response = await api.post('/staff/patients/register', patientData);
      
      if (response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return { success: false, error: 'Patient registration failed' };
    } catch (error: unknown) {
      console.error('Patient registration error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Patient registration failed. Please try again.'
      };
    }
  },
  
  // Logout
  logout: async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (token) {
        // Use unified logout endpoint
        try {
          await api.post('/auth/logout', {}, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
        } catch (logoutError) {
          console.warn('Logout endpoint call failed:', logoutError);
        }
      }
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Logout error:', error);
      // Clear local storage even if logout request fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userId');
      return { success: true };
    }
  },
  
  // Change password
  changePassword: async (passwordData: ChangePasswordData) => {
    try {
      const response = await api.post('/staff/change-password', {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      
      if (response.data) {
        return {
          success: true,
          data: response.data
        };
      }
      
      return { success: false, error: 'Password change failed' };
    } catch (error: unknown) {
      console.error('Password change error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Password change failed. Please try again.'
      };
    }
  },
  
  // Get current user (synchronous - from localStorage)
  getCurrentUser: () => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      
      if (!token || !user) {
        return null;
      }
      
      return JSON.parse(user);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  },
  
  // Get current user from server (async)
  getCurrentUserFromServer: async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        return { success: false, error: 'No token found' };
      }
      
      // Use unified endpoint
      const response = await api.get('/auth/me');
      
      if (response.data) {
        const userData = transformToFrontendUser(response.data);
        localStorage.setItem('user', JSON.stringify(userData));
        
        return {
          success: true,
          data: userData
        };
      }
      
      return { success: false, error: 'Failed to get user data' };
    } catch (error: unknown) {
      console.error('Get current user error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Failed to get user data.'
      };
    }
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    return !!(token && user);
  },
  
  // Get stored user data
  getStoredUser: () => {
    try {
      const user = localStorage.getItem('user');
      return user ? JSON.parse(user) : null;
    } catch (error) {
      console.error('Error parsing stored user:', error);
      return null;
    }
  }
};

export default authService; 