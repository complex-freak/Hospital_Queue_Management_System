
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth-context';
import { Loader } from '@/components/ui/loader';

const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
