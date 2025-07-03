import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { adminService } from '@/services/api';
import { Loader2 } from 'lucide-react';

const MetricsOverview: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        // Fetch analytics data from the admin service
        const response = await adminService.getSystemAnalytics();
        if (response.success) {
          setMetrics(response.data);
        } else {
          console.error('Failed to fetch metrics:', response.error);
        }
      } catch (error) {
        console.error('Error fetching metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
  }, []);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Overview</CardTitle>
        <CardDescription>
          System performance and metrics for the last 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        {loading ? (
          <div className="h-[300px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
            <p className="mb-2">Charts will be implemented with Recharts in the next phase</p>
            <div className="w-full flex gap-4">
              <div className="flex-1 h-[200px] border rounded-md p-4 flex flex-col items-center justify-center">
                <h3 className="font-medium mb-2">Patient Volume</h3>
                {metrics?.daily_appointments ? (
                  <p className="text-lg font-bold">
                    {metrics.daily_appointments.length > 0 
                      ? `${metrics.daily_appointments.reduce((sum: number, day: any) => sum + day.count, 0)} appointments`
                      : 'No data available'}
                  </p>
                ) : (
                  <p>No data available</p>
                )}
              </div>
              <div className="flex-1 h-[200px] border rounded-md p-4 flex flex-col items-center justify-center">
                <h3 className="font-medium mb-2">Wait Time Trends</h3>
                {metrics?.daily_wait_times ? (
                  <p className="text-lg font-bold">
                    {metrics.daily_wait_times.length > 0 
                      ? `Avg ${Math.round(metrics.daily_wait_times.reduce((sum: number, day: any) => sum + day.average_wait_time, 0) / metrics.daily_wait_times.length)} min`
                      : 'No data available'}
                  </p>
                ) : (
                  <p>No data available</p>
                )}
              </div>
              <div className="flex-1 h-[200px] border rounded-md p-4 flex flex-col items-center justify-center">
                <h3 className="font-medium mb-2">Doctor Availability</h3>
                {metrics?.doctor_activity ? (
                  <p className="text-lg font-bold">
                    {metrics.doctor_activity.length > 0 
                      ? `${metrics.doctor_activity.filter((doc: any) => doc.is_available).length} of ${metrics.doctor_activity.length} available`
                      : 'No data available'}
                  </p>
                ) : (
                  <p>No data available</p>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MetricsOverview; 