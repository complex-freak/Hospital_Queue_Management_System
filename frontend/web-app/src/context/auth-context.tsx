import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '@/services/api/auth-service';
import { User } from '@/services/api/data-transformers';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  doctorLogin: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook for using the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check for existing authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        // Get user from localStorage
        const currentUser = authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // If token/user is invalid, clear localStorage
        authService.logout();
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.login({ username, password });
      
      if (result.success && result.data) {
        setUser(result.data.user || null);
        return true;
      } else {
        setError(result.error || 'Login failed');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Doctor login function
  const doctorLogin = async (username: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.doctorLogin({ username, password });
      
      if (result.success && result.data) {
        setUser(result.data.user || null);
        return true;
      } else {
        setError(result.error || 'Login failed');
        return false;
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      return false;
    } finally {
      setIsLoading(false);
    }
  };
  
  // Logout function
  const logout = () => {
    authService.logout();
    setUser(null);
  };
  
  // Clear error function
  const clearError = () => {
    setError(null);
  };
  
  // Update user data
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };
  
  // Context value
  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    error,
    login,
    doctorLogin,
    logout,
    clearError,
    updateUser,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 