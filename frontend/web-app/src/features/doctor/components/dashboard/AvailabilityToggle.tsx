import React, { useState, useEffect, useRef } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { doctorService } from '@/services/api/doctor-service';
import { toast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Clock, RefreshCw } from 'lucide-react';

interface AvailabilityToggleProps {
  onStatusChange: (isAvailable: boolean) => void;
  initialAvailability?: boolean;
}

const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({ 
  onStatusChange,
  initialAvailability = true
}) => {
  const [isAvailable, setIsAvailable] = useState(initialAvailability);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialFetchDone = useRef(false);
  const lastUpdateTime = useRef(0);

  // Fetch current doctor status on component mount
  const fetchDoctorStatus = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await doctorService.getDoctorProfile();
      
      if (response.success && response.data) {
        setIsAvailable(response.data.isAvailable);
        
        // Set shift times if available
        if (response.data.shiftStart) {
          setShiftStart(formatTimeForInput(response.data.shiftStart));
        }
        
        if (response.data.shiftEnd) {
          setShiftEnd(formatTimeForInput(response.data.shiftEnd));
        }
        
        // Only notify parent if the value is different from what we already have
        if (response.data.isAvailable !== isAvailable) {
          onStatusChange(response.data.isAvailable);
        }
        
        initialFetchDone.current = true;
      } else {
        setError(response.error || 'Failed to load doctor status');
        toast({
          title: 'Error',
          description: response.error || 'Failed to load doctor status',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Error fetching doctor status:', error);
      setError('Could not load your current status');
      toast({
        title: 'Error',
        description: error.message || 'Could not load your current status',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Skip if we already did the initial fetch
    if (!initialFetchDone.current) {
      fetchDoctorStatus();
    }
  }, []);

  // Update local state when initialAvailability changes
  useEffect(() => {
    if (initialAvailability !== isAvailable && initialFetchDone.current) {
      setIsAvailable(initialAvailability);
    }
  }, [initialAvailability, isAvailable]);

  // Format time from API (string) to input time format (HH:MM)
  const formatTimeForInput = (timeString: string): string => {
    try {
      if (!timeString) return '09:00';
      
      // Handle various time formats
      const timeRegex = /(\d{1,2}):(\d{2})/;
      const match = timeString.match(timeRegex);
      
      if (match) {
        const hours = match[1].padStart(2, '0');
        const minutes = match[2];
        return `${hours}:${minutes}`;
      }
      
      return '09:00';
    } catch (error) {
      console.error('Error formatting time:', error);
      return '09:00';
    }
  };

  const toggleAvailability = async (checked: boolean) => {
    // Prevent rapid toggling
    const now = Date.now();
    if (now - lastUpdateTime.current < 1000) {
      toast({
        title: "Please Wait",
        description: "Please wait a moment before changing status again",
        variant: "default",
      });
      return;
    }
    
    lastUpdateTime.current = now;
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await doctorService.updateStatus({
        isAvailable: checked,
        shiftStart: checked ? shiftStart : undefined,
        shiftEnd: checked ? shiftEnd : undefined,
      });
      
      if (response.success) {
        setIsAvailable(checked);
        onStatusChange(checked);
        
        toast({
          title: checked ? "You're Now Available" : "You're Now Unavailable",
          description: checked 
            ? `You're on duty until ${shiftEnd}`
            : "Your queue is paused. Patients won't be directed to you.",
        });
      } else {
        setError(response.error || "Could not update your availability status");
        toast({
          title: "Status Update Failed",
          description: response.error || "Could not update your availability status.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setError("Could not update your availability status");
      toast({
        title: "Status Update Failed",
        description: error.message || "Could not update your availability status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateShiftTimes = async () => {
    // Prevent rapid updates
    const now = Date.now();
    if (now - lastUpdateTime.current < 1000) {
      toast({
        title: "Please Wait",
        description: "Please wait a moment before updating again",
        variant: "default",
      });
      return;
    }
    
    lastUpdateTime.current = now;
    setIsUpdating(true);
    setError(null);
    
    try {
      const response = await doctorService.updateStatus({
        isAvailable: true,
        shiftStart,
        shiftEnd,
      });
      
      if (response.success) {
        toast({
          title: "Shift Updated",
          description: `Your shift time is now set from ${shiftStart} to ${shiftEnd}`,
        });
      } else {
        setError(response.error || "Could not update your shift time");
        toast({
          title: "Shift Update Failed",
          description: response.error || "Could not update your shift time.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setError("Could not update your shift time");
      toast({
        title: "Shift Update Failed",
        description: error.message || "Could not update your shift time. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleRefresh = () => {
    fetchDoctorStatus();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Availability Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          <Loader className="h-8 w-8" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Availability Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600 mb-4">{error}</div>
          <Button 
            onClick={handleRefresh}
            className="w-full"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Availability Status</CardTitle>
        <CardDescription>Set your availability and working hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between py-2">
          <div className="space-y-0.5">
            <Label htmlFor="availability-toggle" className="text-base">
              {isAvailable ? "On Duty" : "Unavailable"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {isAvailable 
                ? "You're visible to patients" 
                : "Your queue is paused"}
            </p>
          </div>
          <Switch
            id="availability-toggle"
            checked={isAvailable}
            onCheckedChange={toggleAvailability}
            disabled={isUpdating}
          />
        </div>
        
        <div className={`mt-4 space-y-4 border-t pt-4 ${!isAvailable ? 'opacity-50' : ''}`}>
          <div>
            <Label htmlFor="shift-start" className="text-sm font-medium">
              Shift Start
            </Label>
            <div className="mt-1 flex items-center">
              <Clock className="mr-2 h-4 w-4 text-gray-400" />
              <Input
                id="shift-start"
                type="time"
                value={shiftStart}
                onChange={(e) => setShiftStart(e.target.value)}
                disabled={!isAvailable || isUpdating}
                className="w-full"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="shift-end" className="text-sm font-medium">
              Shift End
            </Label>
            <div className="mt-1 flex items-center">
              <Clock className="mr-2 h-4 w-4 text-gray-400" />
              <Input
                id="shift-end"
                type="time"
                value={shiftEnd}
                onChange={(e) => setShiftEnd(e.target.value)}
                disabled={!isAvailable || isUpdating}
                className="w-full"
              />
            </div>
          </div>
          
          <Button 
            onClick={updateShiftTimes} 
            disabled={!isAvailable || isUpdating}
            className="w-full"
          >
            {isUpdating ? (
              <>
                <Loader className="mr-2 h-4 w-4" />
                Updating...
              </>
            ) : (
              'Update Shift Time'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvailabilityToggle;
