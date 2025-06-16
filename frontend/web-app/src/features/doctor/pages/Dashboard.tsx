import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth-context';
import { apiService } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import QueueTable from '../components/dashboard/QueueTable';
import QueueSummary from '../components/dashboard/QueueSummary';
import AvailabilityToggle from '../components/dashboard/AvailabilityToggle';
import AppHeader from '@/features/shared/components/AppHeader';
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

  const fetchQueue = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiService.getQueue();
      
      if (response.success && response.data) {
        // If doctor is unavailable, don't show any patients
        if (!isAvailable) {
          setPatients([]);
        } else {
          setPatients(response.data);
        }
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
  }, [isAvailable]);

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
      await apiService.markPatientSeen(patientId);
      // Remove the patient from the queue
      setPatients(patients.filter(patient => patient.id !== patientId));
      toast({
        title: 'Patient Marked as Seen',
        description: 'The patient has been removed from your queue.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to mark patient as seen. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handlePatientSkipped = async (patientId: string) => {
    try {
      await apiService.skipPatient(patientId);
      // Remove the patient from the queue for now
      // In a real app, you might move them elsewhere or flag them
      setPatients(patients.filter(patient => patient.id !== patientId));
      toast({
        title: 'Patient Skipped',
        description: 'The patient has been skipped in your queue.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to skip patient. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = (available: boolean) => {
    setIsAvailable(available);
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
              disabled={isRefreshing}
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
            <QueueTable
              patients={patients}
              isLoading={isLoading}
              onPatientSeen={handlePatientSeen}
              onPatientSkipped={handlePatientSkipped}
              refreshQueue={handleRefresh}
            />
          </div>
          <div className="lg:col-span-1">
            <AvailabilityToggle onStatusChange={handleStatusChange} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
