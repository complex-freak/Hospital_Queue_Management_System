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
  login: (username: string, password: string, role?: string) => Promise<void>;
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
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      setIsLoading(true);
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
        
        // Configure axios with the token
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      } catch (error) {
        console.error('Authentication error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        axios.defaults.headers.common['Authorization'] = '';
      } finally {
        setIsLoading(false);
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string, role: string = 'doctor') => {
    setIsLoading(true);
    try {
      // This would be a real API call in production
      // For now, we'll simulate a successful login if credentials match
      let isValidCredentials = false;
      let userData: User | null = null;
      
      if (role === 'doctor' && username === 'doctor' && password === 'password') {
        isValidCredentials = true;
        userData = {
          id: 'd1',
          name: 'Dr. Jane Smith',
          role: 'doctor'
        };
      } else if (role === 'receptionist' && username === 'receptionist' && password === 'password') {
        isValidCredentials = true;
        userData = {
          id: 'r1',
          name: 'Robert Johnson',
          role: 'receptionist'
        };
      } else if (role === 'admin' && username === 'admin' && password === 'admin123') {
        isValidCredentials = true;
        userData = {
          id: 'a1',
          name: 'Admin User',
          role: 'admin'
        };
      }
      
      if (isValidCredentials && userData) {
        const token = `mock-jwt-token-${role}`; // In a real app, this would come from your backend
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        
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
    localStorage.removeItem('user');
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
