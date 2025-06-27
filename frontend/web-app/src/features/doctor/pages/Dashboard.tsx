import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { doctorService } from '@/services/api/doctor-service';
import { toast } from '@/hooks/use-toast';
import QueueTable from '../components/dashboard/QueueTable';
import QueueSummary from '../components/dashboard/QueueSummary';
import AvailabilityToggle from '../components/dashboard/AvailabilityToggle';
import AppHeader from '@/components/shared/AppHeader';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/ui/loader';
import { RefreshCw } from 'lucide-react';
import { Patient } from '@/types/patient';

const Dashboard = () => {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);

  // Fetch doctor profile on mount
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        const response = await doctorService.getDoctorProfile();
        if (response.success && response.data) {
          setDoctorProfile(response.data);
          setIsAvailable(response.data.isAvailable);
        } else {
          setError(response.error || 'Failed to load doctor profile');
          toast({
            title: 'Error',
            description: response.error || 'Failed to load doctor profile',
            variant: 'destructive',
          });
        }
      } catch (error: any) {
        console.error('Error fetching doctor profile:', error);
        setError('Failed to load doctor profile');
        toast({
          title: 'Error',
          description: error.message || 'Failed to load doctor profile',
          variant: 'destructive',
        });
      }
    };

    fetchDoctorProfile();
  }, []);

  const fetchQueue = useCallback(async () => {
    // Prevent excessive API calls by limiting frequency to once per second
    const now = Date.now();
    if (now - lastFetchTime < 1000) {
      return;
    }
    
    setLastFetchTime(now);
    
    try {
      setIsLoading(true);
      setError(null);
      
      // If doctor is unavailable, don't fetch queue
      if (!isAvailable) {
        setPatients([]);
        setIsLoading(false);
        return;
      }
      
      const response = await doctorService.getDoctorQueue();
      
      if (response.success) {
        setPatients(response.data || []);
      } else {
        setError(response.error || 'Failed to load patient queue');
        toast({
          title: 'Error',
          description: response.error || 'Failed to load patient queue',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching queue:', error);
      setError('Failed to load patient queue');
      toast({
        title: 'Error',
        description: error.message || 'Failed to load patient queue',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isAvailable, lastFetchTime]);

  useEffect(() => {
    fetchQueue();
    
    // Poll the queue every 30 seconds
    const interval = setInterval(() => {
      fetchQueue();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQueue();
    setIsRefreshing(false);
  };

  const handlePatientSeen = async (patientId: string) => {
    try {
      const response = await doctorService.markPatientSeen(patientId);
      
      if (response.success) {
        // Remove the patient from the queue
        setPatients(patients.filter(patient => patient.id !== patientId));
        toast({
          title: 'Patient Marked as Seen',
          description: 'The patient has been removed from your queue.',
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to mark patient as seen',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark patient as seen',
        variant: 'destructive',
      });
    }
  };

  const handlePatientSkipped = async (patientId: string) => {
    try {
      const response = await doctorService.skipPatient(patientId);
      
      if (response.success) {
        // Remove the patient from the queue
        setPatients(patients.filter(patient => patient.id !== patientId));
        toast({
          title: 'Patient Skipped',
          description: 'The patient has been skipped in your queue.',
        });
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to skip patient',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to skip patient',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = (available: boolean) => {
    setIsAvailable(available);
    // If toggling to unavailable, clear the queue display
    if (!available) {
      setPatients([]);
    } else {
      // If toggling to available, refresh the queue
      fetchQueue();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-2xl font-bold text-gray-900">Patient Queue</h2>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isRefreshing || !isAvailable}
              className="border-blue-300 text-blue-700 hover:bg-blue-50"
            >
              {isRefreshing ? (
                <Loader className="mr-2 h-4 w-4" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Refresh Queue
            </Button>
          </div>
        </div>

        <div className="sticky top-16 z-10 -mx-4 mb-6 bg-white px-4 py-4 shadow-sm sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
          <QueueSummary patients={patients} />
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          <div className="lg:col-span-3">
            {!isAvailable ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <h3 className="text-xl font-medium text-gray-700 mb-2">You're Currently Unavailable</h3>
                <p className="text-gray-500 mb-4">
                  You won't receive new patients in your queue while you're unavailable.
                  Use the toggle on the right to change your status when you're ready.
                </p>
              </div>
            ) : error ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <h3 className="text-xl font-medium text-red-700 mb-2">Error Loading Queue</h3>
                <p className="text-gray-500 mb-4">{error}</p>
                <Button onClick={handleRefresh} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : (
              <QueueTable
                patients={patients}
                isLoading={isLoading}
                onPatientSeen={handlePatientSeen}
                onPatientSkipped={handlePatientSkipped}
                refreshQueue={handleRefresh}
              />
            )}
          </div>
          <div className="lg:col-span-1">
            <AvailabilityToggle 
              onStatusChange={handleStatusChange}
              initialAvailability={isAvailable}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
