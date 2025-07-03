import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const initialLoadDone = useRef(false);
  const isComponentMounted = useRef(true);
  
  // Polling configuration
  const initialPollingInterval = 30000; // 30 seconds
  const [pollingInterval, setPollingInterval] = useState(initialPollingInterval);

  // Set component mounted state for cleanup
  useEffect(() => {
    isComponentMounted.current = true;
    
    return () => {
      isComponentMounted.current = false;
    };
  }, []);

  // Fetch doctor profile on mount
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        setProfileError(null);
        // Only proceed if component is still mounted
        if (!isComponentMounted.current) return;
        
        const response = await doctorService.getDoctorProfile();
        
        // Check again if component is still mounted before updating state
        if (!isComponentMounted.current) return;
        
        if (response.success && response.data) {
          setDoctorProfile(response.data);
          setIsAvailable(response.data.isAvailable);
          initialLoadDone.current = true;
        } else if (response.success && response.wasCancelled) {
          // Handle cancelled request - retry once after a short delay
          setTimeout(() => {
            if (isComponentMounted.current) {
              fetchDoctorProfile();
            }
          }, 500);
          return;
        } else if (response.error) {
          setProfileError(response.error || 'Failed to load doctor profile');
          
          // Don't show toast for cancelled requests
          if (response.error !== 'Request was cancelled') {
            toast({
              title: 'Error',
              description: response.error || 'Failed to load doctor profile',
              variant: 'destructive',
            });
          }
        }
      } catch (error: any) {
        // Only update state if component is still mounted
        if (!isComponentMounted.current) return;
        
        console.error('Error fetching doctor profile:', error);
        setProfileError('Failed to load doctor profile');
        toast({
          title: 'Error',
          description: error.message || 'Failed to load doctor profile',
          variant: 'destructive',
        });
      }
    };

    fetchDoctorProfile();
    
    // Cleanup function will be called when the component unmounts
    return () => {
      // Component cleanup is handled by isComponentMounted.current = false
    };
  }, []);

  const fetchQueue = useCallback(async () => {
    // Prevent excessive API calls by limiting frequency to once per second
    const now = Date.now();
    if (now - lastFetchTime < 1000) {
      return;
    }
    
    // Only proceed if component is still mounted
    if (!isComponentMounted.current) return;
    
    setLastFetchTime(now);
    
    try {
      // Only show loading indicator for initial load, not for background refreshes
      if (!initialLoadDone.current) {
        setIsLoading(true);
      }
      setError(null);
      
      // If doctor is unavailable, don't fetch queue
      if (!isAvailable) {
        setPatients([]);
        setIsLoading(false);
        initialLoadDone.current = true;
        return;
      }
      
      const response = await doctorService.getDoctorQueue();
      
      // Check if component is still mounted before updating state
      if (!isComponentMounted.current) return;
      
      if (response.success) {
        const newPatients = response.data || [];
        setPatients(newPatients);
        
        // Adaptive polling based on queue activity
        if (newPatients.length === 0) {
          // If queue is empty, check less frequently (60 seconds)
          setPollingInterval(60000);
        } else if (newPatients.length > 5) {
          // If queue is busy, check more frequently (15 seconds)
          setPollingInterval(15000);
        } else {
          // Default polling interval (30 seconds)
          setPollingInterval(initialPollingInterval);
        }
        
        initialLoadDone.current = true;
      } else if (response.wasCancelled) {
        // Ignore cancelled requests
        return;
      } else {
        // Don't update state for canceled requests
        if (response.error === 'Request was cancelled') return;
        
        setError(response.error || 'Failed to load patient queue');
        // Don't show toast for background refreshes, only when manually refreshing
        if (isRefreshing) {
          toast({
            title: 'Error',
            description: response.error || 'Failed to load patient queue',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      // Check if component is still mounted before updating state
      if (!isComponentMounted.current) return;
      
      console.error('Error fetching queue:', error);
      setError('Failed to load patient queue');
      // Don't show toast for background refreshes, only when manually refreshing
      if (isRefreshing) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load patient queue',
          variant: 'destructive',
        });
      }
    } finally {
      // Check if component is still mounted before updating state
      if (!isComponentMounted.current) return;
      
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAvailable, lastFetchTime, isRefreshing]);

  // Setup queue polling
  useEffect(() => {
    // Initial fetch
    fetchQueue();
    
    // Setup dynamic polling interval
    const setupPolling = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      pollingIntervalRef.current = setInterval(() => {
        // Only fetch if component is still mounted
        if (isComponentMounted.current) {
          fetchQueue();
        }
      }, pollingInterval);
    };
    
    setupPolling();
    
    // Update polling whenever the interval changes
    const intervalHandler = () => {
      setupPolling();
    };
    
    // Watch for polling interval changes
    const intervalWatcher = setInterval(intervalHandler, 1000);
    
    return () => {
      // Clean up all intervals
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      clearInterval(intervalWatcher);
    };
  }, [fetchQueue, pollingInterval]);

  // Set up a visible activity tracker to slow down polling when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!isComponentMounted.current) return;
      
      if (document.visibilityState === 'hidden') {
        // Page is hidden, reduce polling frequency
        setPollingInterval(120000); // 2 minutes
      } else {
        // Page is visible again, restore polling frequency
        setPollingInterval(initialPollingInterval);
        // Fetch immediately when becoming visible
        fetchQueue();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchQueue]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchQueue();
  };

  const handlePatientSeen = async (patientId: string) => {
    try {
      const response = await doctorService.markPatientSeen(patientId);
      
      // Check if component is still mounted before updating state
      if (!isComponentMounted.current) return;
      
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
      // Check if component is still mounted before showing toast
      if (!isComponentMounted.current) return;
      
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
      
      // Check if component is still mounted before updating state
      if (!isComponentMounted.current) return;
      
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
      // Check if component is still mounted before showing toast
      if (!isComponentMounted.current) return;
      
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
            {profileError ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <h3 className="text-xl font-medium text-red-700 mb-2">Error Loading Doctor Profile</h3>
                <p className="text-gray-500 mb-4">{profileError}</p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Reload Page
                </Button>
              </div>
            ) : !isAvailable ? (
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
            ) : isLoading && !initialLoadDone.current ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <Loader className="mx-auto h-8 w-8 mb-4" />
                <h3 className="text-xl font-medium text-gray-700 mb-2">Loading Queue</h3>
                <p className="text-gray-500">Please wait while we retrieve your patient queue...</p>
              </div>
            ) : patients.length === 0 ? (
              <div className="bg-white p-8 rounded-lg shadow text-center">
                <h3 className="text-xl font-medium text-gray-700 mb-2">No patients in queue</h3>
                <p className="text-gray-500 mb-4">
                  Your queue is currently empty. Enjoy the quiet moment!
                </p>
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
