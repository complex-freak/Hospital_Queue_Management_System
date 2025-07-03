import api from './client';
import { transformToFrontendUser, transformToBackendUserData } from './data-transformers';

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
    } catch (error: any) {
      console.error('Doctor login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to login. Please check your credentials.'
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
    } catch (error: any) {
      console.error('Receptionist login error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to login. Please check your credentials.'
      };
    }
  },
  
  // Logout
  logout: async () => {
    try {
      // Determine the appropriate API endpoint based on user role
      const user = authService.getCurrentUser();
      let endpoint = '/admin/logout';
      
      if (user?.role === 'doctor') {
        endpoint = '/doctor/logout';
      } else if (user?.role === 'receptionist' || user?.role === 'staff') {
        endpoint = '/staff/logout';
      }
      
      // Call the logout endpoint
      await api.post(endpoint);
      
      // Clear local storage regardless of API response
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      return { success: true };
    } catch (error) {
      // Even if the API call fails, we still want to clear local storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      console.error('Logout error:', error);
      return { success: true };
    }
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
      // Determine the appropriate API endpoint based on user role
      const user = authService.getCurrentUser();
      let endpoint = '/admin/change-password';
      
      if (user?.role === 'doctor') {
        endpoint = '/doctor/change-password';
      } else if (user?.role === 'receptionist' || user?.role === 'staff') {
        endpoint = '/staff/change-password';
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
  
  // Get user profile
  getProfile: async () => {
    try {
      // Determine the appropriate API endpoint based on user role
      const user = authService.getCurrentUser();
      let endpoint = '/admin/me';
      
      if (user?.role === 'doctor') {
        endpoint = '/doctor/me';
      } else if (user?.role === 'receptionist' || user?.role === 'staff') {
        endpoint = '/staff/me';
      }
      
      const response = await api.get(endpoint);
      
      return {
        success: true,
        data: transformToFrontendUser(response.data)
      };
    } catch (error: any) {
      console.error('Get profile error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch user profile.'
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
  },
  
  // Refresh the authentication token
  refreshToken: async () => {
    try {
      const currentToken = localStorage.getItem('token');
      if (!currentToken) {
        throw new Error('No token available to refresh');
      }
      
      // Determine the appropriate API endpoint based on user role
      const user = authService.getCurrentUser();
      let endpoint = '/admin/refresh-token';
      
      if (user?.role === 'doctor') {
        endpoint = '/doctor/refresh-token';
      } else if (user?.role === 'receptionist' || user?.role === 'staff') {
        endpoint = '/staff/refresh-token';
      }
      
      const response = await api.post(endpoint, {}, {
        headers: {
          'Authorization': `Bearer ${currentToken}`
        }
      });
      
      if (response.data.access_token) {
        // Store the new token in localStorage
        localStorage.setItem('token', response.data.access_token);
        return {
          success: true,
          data: {
            accessToken: response.data.access_token,
            tokenType: response.data.token_type || 'bearer'
          }
        };
      }
      
      return { success: false, error: 'Invalid response from server' };
    } catch (error: any) {
      console.error('Token refresh error:', error);
      
      // Clear token if it's invalid or expired
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
      }
      
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to refresh token.'
      };
    }
  }
};

export default authService; 