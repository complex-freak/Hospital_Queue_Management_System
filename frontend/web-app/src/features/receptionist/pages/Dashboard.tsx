import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { apiService } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { RefreshCw, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import QueueMonitor from '@/features/receptionist/components/QueueMonitor';
import QueueStats from '@/features/receptionist/components/QueueStats';
import AppHeader from '@/features/shared/components/AppHeader';

const ReceptionistDashboard = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

  const fetchQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      // In a real app, this would fetch the queue from your API
      const response = await apiService.getQueue();
      
      if (response.success && response.data) {
        setPatients(response.data);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      toast({
        title: 'Error',
        description: 'Failed to load patient queue. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      setIsLoadingDoctors(true);
      // In a real app, this would fetch the available doctors from your API
      // For now, we'll use mock data
      const mockDoctors = [
        { id: 'd1', name: 'Dr. Jane Smith', specialty: 'General Medicine', isAvailable: true, patientCount: 5 },
        { id: 'd2', name: 'Dr. John Davis', specialty: 'Pediatrics', isAvailable: true, patientCount: 3 },
        { id: 'd3', name: 'Dr. Sarah Wilson', specialty: 'Cardiology', isAvailable: false, patientCount: 0 },
      ];
      
      setDoctors(mockDoctors);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    } finally {
      setIsLoadingDoctors(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchDoctors();
    
    // Poll the queue every 30 seconds
    const interval = setInterval(() => {
      fetchQueue();
      fetchDoctors();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchQueue, fetchDoctors]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchQueue(), fetchDoctors()]);
    setIsRefreshing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-2xl font-bold text-gray-900">Reception Dashboard</h2>
          <div className="flex gap-4">
            <Link to="/register-patient">
              <Button
                className="bg-green-600 hover:bg-green-700"
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Register New Patient
              </Button>
            </Link>
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {isRefreshing ? (
                <Loader className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Data
            </Button>
          </div>
        </div>

        <div className="sticky top-16 z-10 -mx-4 mb-6 bg-white px-4 py-4 shadow-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <QueueStats patients={patients} doctors={doctors} />
        </div>

        <div className="grid grid-cols-1 gap-8">
          <QueueMonitor 
            patients={patients} 
            doctors={doctors}
            isLoading={isLoading || isLoadingDoctors}
          />
        </div>
      </main>
    </div>
  );
};

export default ReceptionistDashboard; 