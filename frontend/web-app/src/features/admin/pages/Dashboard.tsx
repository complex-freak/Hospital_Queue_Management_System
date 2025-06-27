import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/use-auth-context';
import AdminLayout from '../components/AdminLayout';
import MetricsOverview from '../components/MetricsOverview';
import RecentActivity from '../components/RecentActivity';
import { adminService } from '@/services/api';
import { Loader2 } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        const response = await adminService.getDashboardStats();
        if (response.success) {
          setStats(response.data);
        } else {
          console.error('Failed to fetch dashboard stats:', response.error);
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, []);

  return (
    <AdminLayout>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Admin Dashboard</h2>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">
              Welcome back, {user?.fullName}
            </span>
          </div>
        </div>
        
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="activity">Recent Activity</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-4">
            <MetricsOverview />
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {loading ? (
                <Card className="col-span-4 h-[150px] flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Patients
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalPatients || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.activePatients || 0} active patients
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Active Doctors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.activeDoctors || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        of {stats?.totalDoctors || 0} total doctors
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Today's Appointments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.appointmentsToday || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.queueLength || 0} patients in queue
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Avg. Wait Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.averageWaitTime || 0} min</div>
                      <p className="text-xs text-muted-foreground">
                        System uptime: {stats?.systemUptime || 0} days
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="analytics">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>
                  Detailed system analytics and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  <p>Analytics will be implemented in the next phase</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="activity">
            <RecentActivity />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard; 