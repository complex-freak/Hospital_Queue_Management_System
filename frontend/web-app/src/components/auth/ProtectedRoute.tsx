import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/context/auth-context';
import LoadingScreen from '@/components/ui/loading-screen';

interface ProtectedRouteProps {
  requiredRoles?: string[];
}

const ProtectedRoute = ({ requiredRoles = [] }: ProtectedRouteProps) => {
  const { isAuthenticated, user, isLoading } = useAuth();

  // Show loading screen while authentication state is being determined
  if (isLoading) {
    return <LoadingScreen />;
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If roles are specified and user doesn't have required role, redirect to appropriate dashboard
  if (requiredRoles.length > 0 && user?.role && !requiredRoles.includes(user.role)) {
    if (user.role === 'doctor') {
      return <Navigate to="/doctor/dashboard" replace />;
    } else if (user.role === 'receptionist' || user.role === 'staff') {
      return <Navigate to="/receptionist/dashboard" replace />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/" replace />;
  }

  // If authenticated and has required role, render the children
  return <Outlet />;
};

export default ProtectedRoute;
