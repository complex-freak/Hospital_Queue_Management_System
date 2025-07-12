import React, { createContext, useState, useEffect, useContext } from 'react';
import { authService } from '@/services/api/auth-service';
import { User } from '@/services/api/data-transformers';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<{ success: boolean; userRole?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (userData: Partial<User>) => void;
  getProfile: () => Promise<void>;
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
        // Check if token exists
        const token = localStorage.getItem('token');
        if (token) {
          // Get user from localStorage first for immediate UI update
          const storedUser = authService.getStoredUser();
          if (storedUser) {
            setUser(storedUser);
            
            // Store userId in localStorage for reconnection
            localStorage.setItem('userId', storedUser.id);
          }
          
          // Then fetch latest user profile from server
          await getProfile();
        }
      } catch (err) {
        console.error('Auth check failed:', err);
        // If token/user is invalid, clear localStorage
        authService.logout();
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, []);
  
  // Unified login function for all user types
  const login = async (username: string, password: string): Promise<{ success: boolean; userRole?: string }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await authService.login({ username, password });
      
      if (result.success && result.data) {
        setUser(result.data.user || null);
        
        // Store userId for reconnection if user exists
        if (result.data.user?.id) {
          localStorage.setItem('userId', result.data.user.id);
        }
        
        return { 
          success: true, 
          userRole: result.data.userRole 
        };
      } else {
        setError(result.error || 'Login failed');
        return { success: false };
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };
  
  // Get user profile from the server
  const getProfile = async (): Promise<void> => {
    try {
      const result = await authService.getCurrentUserFromServer();
      if (result.success && result.data) {
        setUser(result.data);
        
        // Store userId for reconnection
        localStorage.setItem('userId', result.data.id);
      } else {
        // If getting current user fails, clear authentication
        console.error('Failed to get current user:', result.error);
        authService.logout();
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      // If there's an error, clear authentication
      authService.logout();
      setUser(null);
    }
  };
  
  // Logout function
  const logout = async () => {
    await authService.logout();
    setUser(null);
    
    // Clear userId from localStorage
    localStorage.removeItem('userId');
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
    logout,
    clearError,
    updateUser,
    getProfile,
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 