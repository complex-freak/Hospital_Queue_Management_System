
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from '@/hooks/use-toast';

interface User {
  id: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      setIsLoading(true);
      checkAuthStatus(token);
    } else {
      setIsLoading(false);
    }
  }, []);

  const checkAuthStatus = async (token: string) => {
    try {
      // Configure axios with the token
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      
      // In a real application, you would verify the token with your backend
      // For now, we'll simulate a successful response
      const userData = {
        id: '1',
        name: 'Dr. Jane Smith',
        role: 'doctor'
      };
      
      setUser(userData);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Authentication error:', error);
      localStorage.removeItem('token');
      axios.defaults.headers.common['Authorization'] = '';
      toast({
        title: "Authentication Error",
        description: "Your session has expired. Please log in again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    setIsLoading(true);
    try {
      // This would be a real API call in production
      // For now, we'll simulate a successful login if credentials match
      if (username === 'doctor' && password === 'password') {
        const token = 'mock-jwt-token'; // In a real app, this would come from your backend
        localStorage.setItem('token', token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
        const userData = {
          id: '1',
          name: 'Dr. Jane Smith',
          role: 'doctor'
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.name}!`,
        });
      } else {
        throw new Error('Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login Failed",
        description: "Invalid username or password. Please try again.",
        variant: "destructive"
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    axios.defaults.headers.common['Authorization'] = '';
    setUser(null);
    setIsAuthenticated(false);
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
