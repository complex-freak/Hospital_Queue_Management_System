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
  // Admin login
  login: async (credentials: LoginCredentials) => {
    try {
      // Map credentials to backend format (if needed)
      const response = await api.post('/admin/login', {
        username: credentials.username,
        password: credentials.password
      });
      
      if (response.data.access_token) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // Try to fetch user profile since it's not returned with token
        try {
          const userResponse = await api.get('/admin/me', {
            headers: { 'Authorization': `Bearer ${response.data.access_token}` }
          });
          
          if (userResponse.data) {
            const userData = transformToFrontendUser(userResponse.data);
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
          console.error('Error fetching user profile:', profileError);
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
      console.error('Login error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Failed to login. Please check your credentials.'
      };
    }
  },
  
  // Doctor login
  doctorLogin: async (credentials: LoginCredentials) => {
    try {
      const response = await api.post('/doctor/login', {
        username: credentials.username,
        password: credentials.password
      });
      
      if (response.data.access_token) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // Try to fetch doctor profile
        try {
          const profileResponse = await api.get('/doctor/me', {
            headers: { 'Authorization': `Bearer ${response.data.access_token}` }
          });
          
          if (profileResponse.data) {
            const userData = transformToFrontendUser({
              ...profileResponse.data,
              role: 'doctor'
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
          console.error('Error fetching doctor profile:', profileError);
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
      console.error('Doctor login error:', error);
      const apiError = error as ApiError;
      return { 
        success: false, 
        error: apiError.response?.data?.detail || 'Failed to login. Please check your credentials.'
      };
    }
  },
  
  // Staff (receptionist) login
  receptionistLogin: async (credentials: LoginCredentials) => {
    try {
      // Use staff login endpoint for receptionists
      const response = await api.post('/staff/login', {
        username: credentials.username,
        password: credentials.password
      });
      
      if (response.data.access_token) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // Try to fetch user profile
        try {
          const userResponse = await api.get('/staff/me', {
            headers: { 'Authorization': `Bearer ${response.data.access_token}` }
          });
          
          if (userResponse.data) {
            const userData = transformToFrontendUser(userResponse.data);
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
          console.error('Error fetching user profile:', profileError);
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
      console.error('Receptionist login error:', error);
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
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (token) {
        // Determine logout endpoint based on user role
        let logoutEndpoint = '/staff/logout';
        if (user.role === 'doctor') {
          logoutEndpoint = '/doctor/logout';
        } else if (user.role === 'admin') {
          logoutEndpoint = '/admin/logout';
        } else if (user.role === 'patient') {
          logoutEndpoint = '/patient/logout';
        }
        
        await api.post(logoutEndpoint);
      }
      
      // Clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return { success: true };
    } catch (error: unknown) {
      console.error('Logout error:', error);
      // Clear local storage even if logout request fails
      localStorage.removeItem('token');
      localStorage.removeItem('user');
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
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      
      if (!token) {
        return { success: false, error: 'No token found' };
      }
      
      // Determine endpoint based on user role
      let endpoint = '/staff/me';
      if (user.role === 'doctor') {
        endpoint = '/doctor/me';
      } else if (user.role === 'admin') {
        endpoint = '/admin/me';
      } else if (user.role === 'patient') {
        endpoint = '/patient/profile';
      }
      
      const response = await api.get(endpoint);
      
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