import React, { useState, useEffect } from 'react';
import { useNotifications } from '@/contexts/notification-context';
import { Bell, Check, Trash, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuPortal,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className }) => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAll,
    fetchNotifications
  } = useNotifications();
  
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch notifications when the dropdown is opened
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen, fetchNotifications]);

  const handleNotificationClick = (id: string) => {
    markAsRead(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleClearAll = () => {
    clearAll();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <div className="h-2 w-2 rounded-full bg-green-500" />;
      case 'warning':
        return <div className="h-2 w-2 rounded-full bg-amber-500" />;
      case 'error':
        return <div className="h-2 w-2 rounded-full bg-red-500" />;
      case 'info':
      default:
        return <div className="h-2 w-2 rounded-full bg-blue-500" />;
    }
  };

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    return notification.type === activeTab;
  });

  return (
    <div className={cn("relative", className)}>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <DropdownMenuLabel className="flex items-center justify-between">
            <span>Notifications</span>
            <div className="flex space-x-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleMarkAllAsRead}
                disabled={unreadCount === 0}
                className="h-6 text-xs"
                title="Mark all as read"
              >
                <Check className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClearAll}
                disabled={notifications.length === 0}
                className="h-6 text-xs"
                title="Clear all notifications"
              >
                <Trash className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full grid grid-cols-4 mb-2">
              <TabsTrigger value="all" className="text-xs">All</TabsTrigger>
              <TabsTrigger value="unread" className="text-xs">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{unreadCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="info" className="text-xs">Info</TabsTrigger>
              <TabsTrigger value="warning" className="text-xs">Important</TabsTrigger>
            </TabsList>
          </Tabs>
          
          {filteredNotifications.length === 0 ? (
            <div className="py-4 text-center text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {filteredNotifications.map((notification) => (
                <DropdownMenuItem 
                  key={notification.id} 
                  className={cn(
                    "flex flex-col items-start p-3 cursor-default",
                    !notification.read && "bg-blue-50"
                  )}
                  onClick={() => handleNotificationClick(notification.id)}
                >
                  <div className="flex w-full items-start">
                    <div className="mr-2 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{notification.title}</p>
                      <p className="text-xs text-gray-500">{notification.message}</p>
                    </div>
                    <div className="ml-2 text-xs text-gray-400 whitespace-nowrap">
                      {format(notification.timestamp, 'h:mm a')}
                    </div>
                  </div>
                </DropdownMenuItem>
              ))}
            </div>
          )}
          
          {notifications.length > 0 && (
            <>
              <DropdownMenuSeparator />
              <Link to="/notifications" style={{ width: '100%' }}>
                <DropdownMenuItem 
                  className="text-center text-xs text-blue-600"
                  onClick={() => setIsOpen(false)}
                >
                  View all notifications
                </DropdownMenuItem>
              </Link>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default NotificationCenter; 