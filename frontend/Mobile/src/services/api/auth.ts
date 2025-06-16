import httpClient, { ApiResponse } from './index';
import { User } from '../../types';
import { API_PATHS } from '../../config/env';

// Types
export interface LoginRequest {
  phone_number: string;
  password: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  phone_number: string;
  password: string;
  email?: string;
  gender?: string;
  date_of_birth?: string;
}

export interface ProfileUpdateRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
}

export interface CompleteProfileRequest {
  email: string;
  date_of_birth: string | null;
  gender: string;
  address: string;
  emergency_contact: string;
  emergency_contact_name: string;
  emergency_contact_relationship: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  email?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  emergency_contact_name?: string;
  emergency_contact_relationship?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

// Service class
export class AuthService {
  // Register a new patient
  async register(userData: RegisterRequest): Promise<ApiResponse<UserResponse>> {
    return httpClient.post<UserResponse>(API_PATHS.AUTH.REGISTER, userData);
  }

  // Login user
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await httpClient.post<LoginResponse>(API_PATHS.AUTH.LOGIN, credentials);
    
    // Store token if login successful
    if (response.isSuccess && response.data.access_token) {
      await httpClient.setToken(response.data.access_token);
    }
    
    return response;
  }

  // Get user profile
  async getProfile(): Promise<ApiResponse<UserResponse>> {
    return httpClient.get<UserResponse>(API_PATHS.AUTH.PROFILE);
  }

  // Update user profile
  async updateProfile(profileData: ProfileUpdateRequest): Promise<ApiResponse<UserResponse>> {
    return httpClient.put<UserResponse>(API_PATHS.AUTH.PROFILE, profileData);
  }

  // Complete profile during onboarding
  async completeProfile(profileData: CompleteProfileRequest): Promise<ApiResponse<UserResponse>> {
    return httpClient.post<UserResponse>(API_PATHS.AUTH.COMPLETE_PROFILE, profileData);
  }

  // Logout user
  async logout(): Promise<void> {
    await httpClient.removeToken();
  }

  // Transform backend user format to frontend format
  transformUserResponse(userResponse: UserResponse): User {
    // Check if profile is complete by verifying all required fields are present
    const isProfileComplete = !!(
      userResponse.email && 
      userResponse.gender && 
      userResponse.date_of_birth && 
      userResponse.address && 
      userResponse.emergency_contact &&
      userResponse.emergency_contact_name &&
      userResponse.emergency_contact_relationship
    );

    return {
      id: userResponse.id,
      firstName: userResponse.first_name,
      lastName: userResponse.last_name,
      fullName: `${userResponse.first_name} ${userResponse.last_name}`,
      phoneNumber: userResponse.phone_number,
      isAuthenticated: true,
      isProfileComplete,
      email: userResponse.email,
      dateOfBirth: userResponse.date_of_birth,
      gender: (userResponse.gender as 'male' | 'female' | 'other'),
      address: userResponse.address,
      emergencyContact: userResponse.emergency_contact,
      emergencyContactName: userResponse.emergency_contact_name,
      emergencyContactRelationship: userResponse.emergency_contact_relationship,
    };
  }

    // Delete user account
  async deleteAccount(): Promise<ApiResponse<any>> {
    return httpClient.delete<any>(API_PATHS.AUTH.DELETE_ACCOUNT);
  }

  // Change password
  async changePassword(data: { current_password: string; new_password: string }): Promise<ApiResponse<any>> {
    return httpClient.post<any>(API_PATHS.AUTH.CHANGE_PASSWORD, data);
  }
}

// Create and export a singleton instance
export const authService = new AuthService();
export default authService;