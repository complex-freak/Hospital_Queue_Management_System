import api from './client';
import { transformToFrontendUser, transformToBackendUserData } from './data-transformers';

export interface LoginCredentials {
  username: string;
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
  user?: any;
}

// Authentication service for the web app
export const authService = {
  // Staff/receptionist login
  login: async (credentials: LoginCredentials) => {
    try {
      const response = await api.post('/staff/login', credentials);
      
      if (response.data.access_token) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // If user data is returned with the token, store it
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(transformToFrontendUser(response.data.user)));
        }
        
        return {
          success: true,
          data: {
            accessToken: response.data.access_token,
            tokenType: response.data.token_type || 'bearer',
            user: response.data.user ? transformToFrontendUser(response.data.user) : undefined
          }
        };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error: any) {
      console.error('Login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to login. Please check your credentials.'
      };
    }
  },
  
  // Doctor login
  doctorLogin: async (credentials: LoginCredentials) => {
    try {
      const response = await api.post('/doctor/login', credentials);
      
      if (response.data.access_token) {
        // Store the token in localStorage
        localStorage.setItem('token', response.data.access_token);
        
        // If user data is returned with the token, store it
        if (response.data.user) {
          localStorage.setItem('user', JSON.stringify(transformToFrontendUser(response.data.user)));
        }
        
        return {
          success: true,
          data: {
            accessToken: response.data.access_token,
            tokenType: response.data.token_type || 'bearer',
            user: response.data.user ? transformToFrontendUser(response.data.user) : undefined
          }
        };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error: any) {
      console.error('Doctor login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to login. Please check your credentials.'
      };
    }
  },
  
  // Logout
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    return { success: true };
  },
  
  // Check if user is authenticated
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },
  
  // Get current user
  getCurrentUser: () => {
    const userJSON = localStorage.getItem('user');
    if (userJSON) {
      try {
        return JSON.parse(userJSON);
      } catch (e) {
        console.error('Error parsing user data:', e);
        return null;
      }
    }
    return null;
  },
  
  // Register new user (for admin usage)
  register: async (userData: RegisterData) => {
    try {
      const response = await api.post('/admin/users', transformToBackendUserData(userData));
      
      return {
        success: true,
        data: transformToFrontendUser(response.data)
      };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to register user.'
      };
    }
  },
  
  // Change password
  changePassword: async (passwordData: ChangePasswordData) => {
    try {
      // Adapt to appropriate API endpoint based on user role
      const user = authService.getCurrentUser();
      let endpoint = '/staff/change-password';
      
      if (user?.role === 'doctor') {
        endpoint = '/doctor/change-password';
      } else if (user?.role === 'admin') {
        endpoint = '/admin/change-password';
      }
      
      const response = await api.post(endpoint, {
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword
      });
      
      return {
        success: true,
        message: 'Password changed successfully'
      };
    } catch (error: any) {
      console.error('Change password error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to change password.'
      };
    }
  },
  
  // Get user roles (for admin usage)
  getRoles: async () => {
    try {
      const response = await api.get('/admin/roles');
      return {
        success: true,
        data: response.data
      };
    } catch (error: any) {
      console.error('Get roles error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch roles.'
      };
    }
  }
};

export default authService; 