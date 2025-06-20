import React, { useContext } from 'react';
import { useAuth as useNewAuth, AuthProvider } from '@/context/auth-context';

// This file serves as a compatibility layer for code that still imports from the old location

// This is a compatibility layer to maintain backward compatibility with code
// that imports useAuth from the old location
export const useAuth = () => {
  const auth = useNewAuth();
  
  // Return interface that matches old auth context API
  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: auth.isAuthenticated,
    login: async (username: string, password: string, role?: string) => {
      try {
        // Call the appropriate login function based on role
        let success = false;
        if (role === 'doctor') {
          success = await auth.doctorLogin(username, password);
        } else if (role === 'receptionist' || role === 'staff') {
          success = await auth.receptionistLogin(username, password);
        } else {
          success = await auth.login(username, password);
        }
        
        // Convert to the old API's void return type
        if (!success) {
          throw new Error('Login failed');
        }
      } catch (error) {
        throw error;
      }
    },
    logout: auth.logout,
    error: auth.error,
    clearError: auth.clearError,
    updateUser: auth.updateUser,
    getProfile: auth.getProfile
  };
};

// Re-export the original AuthProvider for backward compatibility
export { AuthProvider };

export default useAuth;
