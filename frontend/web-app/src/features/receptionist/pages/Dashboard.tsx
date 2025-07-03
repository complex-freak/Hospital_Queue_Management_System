import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { RefreshCw, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import QueueMonitor from '@/features/receptionist/components/QueueMonitor';
import QueueStats from '@/features/receptionist/components/QueueStats';
import AppHeader from '@/features/shared/components/AppHeader';
import { queueService } from '@/services/api/queue-service';
import { receptionistService } from '@/services/api/receptionist-service';

const ReceptionistDashboard = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [doctors, setDoctors] = useState([]);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [queueStats, setQueueStats] = useState(null);

  const fetchQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      // Fetch queue data using the queue service
      const response = await queueService.getQueue();
      
      if (response.success && response.data) {
        setPatients(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch queue');
      }
      
      // Fetch queue statistics - handle separately to prevent one failure from affecting the other
      try {
        const statsResponse = await queueService.getQueueStats();
        
        if (statsResponse.success && statsResponse.data) {
          setQueueStats(statsResponse.data);
        }
      } catch (statsError) {
        console.error('Error fetching queue statistics:', statsError);
        // Don't show a toast for this error as it's handled in the service with fallback data
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
      // Fetch all doctors from the API
      const response = await receptionistService.getAllDoctors();
      
      if (response.success && response.data) {
        // Transform doctor data to match the format expected by components
        const formattedDoctors = response.data.map(doctor => ({
          id: doctor.id,
          name: doctor.fullName,
          specialty: doctor.specialization || 'General',
          isAvailable: doctor.isAvailable ?? false,
          patientCount: doctor.patientCount ?? 0
        }));
      
        setDoctors(formattedDoctors);
      } else {
        throw new Error(response.error || 'Failed to fetch doctors');
      }
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast({
        title: 'Error',
        description: 'Failed to load doctor information. Please try again.',
        variant: 'destructive',
      });
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
            <Link to="/receptionist/register-patient">
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
          <QueueStats patients={patients} doctors={doctors} queueStats={queueStats} />
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