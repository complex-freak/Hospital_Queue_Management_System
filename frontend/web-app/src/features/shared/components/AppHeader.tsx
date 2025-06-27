import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth-context';
import { Button } from '@/components/ui/button';
import { LogOut, UserCog } from 'lucide-react';
import ConnectivityStatus from './ConnectivityStatus';
import NotificationCenter from './NotificationCenter';

interface AppHeaderProps {
  title?: string;
}

const AppHeader: React.FC<AppHeaderProps> = ({ title = "OPD Queue Management" }) => {
  const { user, logout } = useAuth();

  // Determine dashboard URL based on user role
  const dashboardUrl = user?.role === 'doctor' 
    ? '/doctor/dashboard' 
    : '/receptionist/dashboard';

  return (
    <header className="sticky top-0 z-10 border-b bg-white shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center">
          <Link to={dashboardUrl} className="text-xl font-medium text-blue-700 hover:text-blue-800 transition-colors">
            {title}
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-4">
          {user?.role === 'receptionist' && (
            <Link to="/register-patient">
              <Button
                variant="outline"
                size="sm"
                className="text-gray-700"
              >
                Register Patient
              </Button>
            </Link>
          )}
          <ConnectivityStatus />
        </div>
        
        <div className="flex items-center space-x-4">
          <NotificationCenter />
          <span className="hidden text-sm text-gray-500 md:inline-block">
            Welcome, {user?.fullName}
          </span>
          <Link to="/profile">
            <Button
              variant="outline"
              size="sm"
              className="text-gray-700"
            >
              <UserCog className="mr-2 h-4 w-4" />
              Profile
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={logout}
            className="text-gray-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
};

export default AppHeader; 