import React, { useEffect, useState } from 'react';
import { useNotifications } from '@/contexts/notification-context';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Check, Trash, Bell, RefreshCcw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

const NotificationsPage: React.FC = () => {
  const { 
    notifications, 
    unreadCount, 
    markAsRead, 
    markAllAsRead, 
    clearAll, 
    fetchNotifications 
  } = useNotifications();
  
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Fetch notifications when the component mounts
    fetchNotifications();
  }, [fetchNotifications]);

  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !notification.read;
    return notification.type === activeTab;
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchNotifications();
    setIsRefreshing(false);
    
    toast({
      title: 'Notifications refreshed',
      description: 'Your notifications have been updated.',
    });
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
    
    toast({
      title: 'Marked all as read',
      description: 'All notifications have been marked as read.',
    });
  };

  const handleClearAll = () => {
    clearAll();
    
    toast({
      title: 'Notifications cleared',
      description: 'All notifications have been cleared.',
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <div className="h-3 w-3 rounded-full bg-green-500" />;
      case 'warning':
        return <div className="h-3 w-3 rounded-full bg-amber-500" />;
      case 'error':
        return <div className="h-3 w-3 rounded-full bg-red-500" />;
      case 'info':
      default:
        return <div className="h-3 w-3 rounded-full bg-blue-500" />;
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-gray-500">Manage your notifications</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCcw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </Button>
          <Button 
            variant="outline" 
            onClick={handleClearAll}
            disabled={notifications.length === 0}
          >
            <Trash className="h-4 w-4 mr-2" />
            Clear all
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            View and manage all your notifications
          </CardDescription>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="all">
                All
                <Badge variant="secondary" className="ml-2">
                  {notifications.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="unread">
                Unread
                {unreadCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {unreadCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="info">Info</TabsTrigger>
              <TabsTrigger value="success">Success</TabsTrigger>
              <TabsTrigger value="warning">Important</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <h3 className="font-medium text-lg">No notifications</h3>
              <p className="text-gray-500">
                You don't have any {activeTab !== 'all' ? activeTab : ''} notifications at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredNotifications.map((notification) => (
                <div 
                  key={notification.id} 
                  className={`p-4 rounded-md border ${!notification.read ? 'bg-blue-50' : ''}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="flex items-start">
                    <div className="mr-3 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{notification.title}</h4>
                        <span className="text-xs text-gray-500">
                          {format(notification.timestamp, 'MMM d, yyyy h:mm a')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                    </div>
                  </div>
                  {!notification.read && (
                    <div className="flex justify-end mt-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark as read
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        {filteredNotifications.length > 0 && (
          <CardFooter className="flex justify-between border-t pt-4">
            <div className="text-sm text-gray-500">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default NotificationsPage; 