// Define the ProfileData type for updateProfile
export interface ProfileData {
  name: string;
  email: string;
  specialization: string;
  bio?: string;
  contactNumber?: string;
  licenseNumber?: string;
  department?: string;
  consultationFee?: number;
  education?: string;
  experience?: string;
}

// Common types for API services

export interface ApiError {
  response?: {
    data?: {
      detail?: string;
      message?: string;
    };
  };
  message?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  wasCancelled?: boolean;
}
