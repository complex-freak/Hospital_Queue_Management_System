import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { adminService } from '@/services/api';
import { Loader2 } from 'lucide-react';

interface Activity {
  id: string;
  type: string;
  user: string;
  timestamp: Date;
  details: string;
}

const RecentActivity: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRecentActivity = async () => {
      try {
        const response = await adminService.getRecentActivity(6); // Get 6 most recent activities
        if (response.success) {
          setActivities(response.data);
        } else {
          console.error('Failed to fetch recent activity:', response.error);
        }
      } catch (error) {
        console.error('Error fetching recent activity:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentActivity();
  }, []);

  // Get badge color based on activity type
  const getBadgeVariant = (type: string) => {
    switch (type.toLowerCase()) {
      case 'login':
        return 'default';
      case 'patient':
        return 'secondary';
      case 'system':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  // Format relative time
  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest system activities and events
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No recent activity found
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4 rounded-md border p-4">
                <Badge variant={getBadgeVariant(activity.type) as any} className="mt-1">
                  {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)}
                </Badge>
                <div className="space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.user}</p>
                  <p className="text-sm text-muted-foreground">{activity.details}</p>
                  <p className="text-xs text-muted-foreground">{formatRelativeTime(activity.timestamp)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity; 