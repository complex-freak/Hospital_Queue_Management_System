import api from './client';
import { transformToFrontendUser, transformToBackendUserData } from './data-transformers';

export interface UserData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
  department?: string;
  status?: 'active' | 'inactive';
  password?: string;
}

export interface UserUpdateData {
  firstName?: string;
  lastName?: string;
  email?: string;
  department?: string;
  status?: 'active' | 'inactive';
}

// User management service for the web app
export const userService = {
  // Get all users
  getUsers: async (roleFilter?: string, statusFilter?: string) => {
    try {
      let url = '/admin/users';
      const queryParams = [];
      
      if (roleFilter && roleFilter !== 'all') {
        queryParams.push(`role_filter=${roleFilter}`);
      }
      
      // Add query parameters if they exist
      if (queryParams.length > 0) {
        url += '?' + queryParams.join('&');
      }
      
      const response = await api.get(url);
      
      // Transform backend users to frontend format
      const users = response.data.map((user: any) => {
        const frontendUser = transformToFrontendUser(user);
        
        // Add status field if it doesn't exist (based on is_active)
        if (!frontendUser.status) {
          frontendUser.status = user.is_active ? 'active' : 'inactive';
        }
        
        return frontendUser;
      });
      
      // Filter by status if needed (since backend might not support this filter)
      let filteredUsers = users;
      if (statusFilter && statusFilter !== 'all') {
        filteredUsers = users.filter(user => user.status === statusFilter);
      }
      
      return {
        success: true,
        data: filteredUsers
      };
    } catch (error: any) {
      console.error('Get users error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch users.'
      };
    }
  },
  
  // Get a specific user
  getUser: async (userId: string) => {
    try {
      const response = await api.get(`/admin/users/${userId}`);
      return {
        success: true,
        data: transformToFrontendUser(response.data)
      };
    } catch (error: any) {
      console.error('Get user error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to fetch user.'
      };
    }
  },
  
  // Create a new user
  createUser: async (userData: UserData) => {
    try {
      // Transform to backend format
      const backendData = {
        username: userData.username,
        email: userData.email,
        password: userData.password,
        first_name: userData.firstName,
        last_name: userData.lastName,
        role: userData.role
      };
      
      const response = await api.post('/admin/users', backendData);
      
      return {
        success: true,
        data: transformToFrontendUser(response.data)
      };
    } catch (error: any) {
      console.error('Create user error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to create user.'
      };
    }
  },
  
  // Update a user
  updateUser: async (userId: string, userData: UserUpdateData) => {
    try {
      // Transform to backend format
      const backendData = {
        email: userData.email,
        first_name: userData.firstName,
        last_name: userData.lastName,
        is_active: userData.status === 'active'
      };
      
      const response = await api.put(`/admin/users/${userId}`, backendData);
      
      return {
        success: true,
        data: transformToFrontendUser(response.data)
      };
    } catch (error: any) {
      console.error('Update user error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to update user.'
      };
    }
  },
  
  // Delete a user (soft delete by deactivating)
  deleteUser: async (userId: string) => {
    try {
      await api.delete(`/admin/users/${userId}`);
      
      return {
        success: true
      };
    } catch (error: any) {
      console.error('Delete user error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to delete user.'
      };
    }
  },
  
  // Toggle user status (activate/deactivate)
  toggleUserStatus: async (userId: string, active: boolean) => {
    try {
      const backendData = {
        is_active: active
      };
      
      const response = await api.put(`/admin/users/${userId}`, backendData);
      
      return {
        success: true,
        data: transformToFrontendUser(response.data)
      };
    } catch (error: any) {
      console.error('Toggle user status error:', error);
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Failed to update user status.'
      };
    }
  }
}; 