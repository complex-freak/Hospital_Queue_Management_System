import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth-context';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  BarChart, 
  Settings, 
  LogOut,
  Menu,
  X,
  ListOrdered,
  FileText,
  Cog
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import AppHeader from '@/components/shared/AppHeader';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = React.useState(false);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/admin/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/admin/dashboard',
    },
    {
      name: 'User Management',
      href: '/admin/users',
      icon: Users,
      current: location.pathname === '/admin/users',
    },
    {
      name: 'Analytics',
      href: '/admin/analytics',
      icon: BarChart,
      current: location.pathname === '/admin/analytics',
    },
    {
      name: 'Queue Configuration',
      href: '/admin/queue-configuration',
      icon: ListOrdered,
      current: location.pathname === '/admin/queue-configuration',
    },
    {
      name: 'System Settings',
      href: '/admin/system-settings',
      icon: Cog,
      current: location.pathname === '/admin/system-settings',
    },
    {
      name: 'Reporting Tools',
      href: '/admin/reporting',
      icon: FileText,
      current: location.pathname === '/admin/reporting',
    },
    {
      name: 'Profile Settings',
      href: '/profile',
      icon: Settings,
      current: location.pathname === '/profile',
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="md:hidden absolute left-4 top-3 z-50">
          <Button variant="outline" size="icon">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <div className="flex h-full flex-col bg-white shadow-lg">
            <div className="flex h-14 items-center px-4 border-b">
              <h2 className="text-lg font-semibold">Admin Panel</h2>
              <Button 
                variant="ghost" 
                size="icon" 
                className="ml-auto"
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 space-y-1 px-2 py-4">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    item.current
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center rounded-md px-2 py-2 text-base font-medium'
                  )}
                  onClick={() => setOpen(false)}
                >
                  <item.icon
                    className={cn(
                      item.current
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 h-5 w-5 flex-shrink-0'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={() => {
                  setOpen(false);
                  logout();
                }}
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex w-full items-center rounded-md px-2 py-2 text-base font-medium"
              >
                <LogOut
                  className="text-gray-400 group-hover:text-gray-500 mr-3 h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                Logout
              </button>
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <div className="flex flex-col flex-grow border-r border-gray-200 bg-white pt-5 pb-4 overflow-y-auto">
          <div className="flex items-center flex-shrink-0 px-4">
            <h1 className="text-xl font-bold">Admin Panel</h1>
          </div>
          <div className="mt-5 flex-grow flex flex-col">
            <nav className="flex-1 space-y-1 px-2">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    item.current
                      ? 'bg-gray-100 text-gray-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    'group flex items-center rounded-md px-2 py-2 text-sm font-medium'
                  )}
                >
                  <item.icon
                    className={cn(
                      item.current
                        ? 'text-gray-500'
                        : 'text-gray-400 group-hover:text-gray-500',
                      'mr-3 h-5 w-5 flex-shrink-0'
                    )}
                    aria-hidden="true"
                  />
                  {item.name}
                </Link>
              ))}
              <button
                onClick={logout}
                className="text-gray-600 hover:bg-gray-50 hover:text-gray-900 group flex w-full items-center rounded-md px-2 py-2 text-sm font-medium"
              >
                <LogOut
                  className="text-gray-400 group-hover:text-gray-500 mr-3 h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                Logout
              </button>
            </nav>
          </div>
        </div>
      </div>

      {/* Content area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* <AppHeader title="Admin Panel" /> */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout; 