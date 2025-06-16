import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

// Mock data - in a real app, this would come from an API
const activityData = [
  {
    id: '1',
    type: 'login',
    user: 'Dr. Jane Smith',
    timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    details: 'Logged in from Chrome on Windows'
  },
  {
    id: '2',
    type: 'patient',
    user: 'Robert Johnson',
    timestamp: new Date(Date.now() - 1000 * 60 * 15), // 15 minutes ago
    details: 'Added new patient: Michael Brown'
  },
  {
    id: '3',
    type: 'system',
    user: 'System',
    timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    details: 'Backup completed successfully'
  },
  {
    id: '4',
    type: 'error',
    user: 'System',
    timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    details: 'Database connection error - automatically resolved'
  },
  {
    id: '5',
    type: 'patient',
    user: 'Dr. John Doe',
    timestamp: new Date(Date.now() - 1000 * 60 * 90), // 1.5 hours ago
    details: 'Completed consultation with patient ID: P-2023-0542'
  },
  {
    id: '6',
    type: 'login',
    user: 'Admin User',
    timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    details: 'Logged in from Firefox on macOS'
  }
];

const RecentActivity: React.FC = () => {
  const getActivityBadge = (type: string) => {
    switch (type) {
      case 'login':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Login</Badge>;
      case 'patient':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Patient</Badge>;
      case 'system':
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">System</Badge>;
      case 'error':
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Error</Badge>;
      default:
        return <Badge variant="outline">Other</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    return format(date, 'h:mm a');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>
          Latest system events and user actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {activityData.map((activity) => (
            <div key={activity.id} className="flex">
              <div className="mr-4 flex flex-col items-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
                  <span className="text-xs font-medium">
                    {formatTime(activity.timestamp)}
                  </span>
                </div>
                <div className="h-full w-px bg-gray-200" />
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium leading-none">
                    {activity.user}
                  </p>
                  <div>{getActivityBadge(activity.type)}</div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {activity.details}
                </p>
                <p className="text-xs text-gray-500">
                  {format(activity.timestamp, 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentActivity; 