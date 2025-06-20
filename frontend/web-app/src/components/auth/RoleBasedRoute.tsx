import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';

interface RoleBasedRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleBasedRoute: React.FC<RoleBasedRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  
  // Check if user has the required role
  if (!user || !allowedRoles.includes(user.role)) {
    // If user is authenticated but doesn't have the right role,
    // redirect them to their appropriate dashboard
    if (user) {
      if (user.role === 'doctor') {
        return <Navigate to="/doctor/dashboard" replace />;
      }
      if (user.role === 'receptionist' || user.role === 'staff') {
        return <Navigate to="/receptionist/dashboard" replace />;
      }
      if (user.role === 'admin') {
        return <Navigate to="/admin/dashboard" replace />;
      }
    }
    
    // If not authenticated at all, they will be caught by the ProtectedRoute component
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

export default RoleBasedRoute; 