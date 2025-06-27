import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth-context';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import QuickStatusToggle from '@/features/doctor/components/shared/QuickStatusToggle';

interface AppHeaderProps {
  title?: string;
  notifications?: number;
}

const AppHeader: React.FC<AppHeaderProps> = ({ 
  title = 'Hospital Queue System',
  notifications = 0 
}) => {
  const { user, logout } = useAuth();
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };
  
  const getDashboardLink = () => {
    if (!user) return '/login';
    
    switch (user.role) {
      case 'doctor':
        return '/doctor/dashboard';
      case 'receptionist':
        return '/receptionist/dashboard';
      case 'admin':
        return '/admin/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center">
        <Link to={getDashboardLink()} className="mr-6 flex items-center">
          <span className="text-xl font-bold">{title}</span>
        </Link>
        
        {user && (
          <nav className="hidden md:flex items-center space-x-4">
            {user.role === 'doctor' && (
              <>
                <Link to="/doctor/dashboard" className="text-sm font-medium hover:underline">
                  Dashboard
                </Link>
              </>
            )}
            
            {user.role === 'receptionist' && (
              <>
                <Link to="/receptionist/dashboard" className="text-sm font-medium hover:underline">
                  Dashboard
                </Link>
                <Link to="/register-patient" className="text-sm font-medium hover:underline">
                  Register Patient
                </Link>
              </>
            )}
            
            {user.role === 'admin' && (
              <>
                <Link to="/admin/dashboard" className="text-sm font-medium hover:underline">
                  Dashboard
                </Link>
                <Link to="/admin/users" className="text-sm font-medium hover:underline">
                  User Management
                </Link>
                <Link to="/admin/analytics" className="text-sm font-medium hover:underline">
                  Analytics
                </Link>
              </>
            )}
          </nav>
        )}
      </div>
      
      {user && (
        <div className="flex items-center space-x-3">
          {user.role === 'doctor' && (
            <QuickStatusToggle />
          )}
          
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
              >
                {notifications}
              </Badge>
            )}
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user ? getInitials(user.fullName) : 'U'}</AvatarFallback>
                </Avatar>
                <div className="hidden md:block text-sm font-medium text-left">
                  {user.fullName}
                  <p className="text-xs text-muted-foreground">{user.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer flex w-full items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer flex w-full items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
};

export default AppHeader; 