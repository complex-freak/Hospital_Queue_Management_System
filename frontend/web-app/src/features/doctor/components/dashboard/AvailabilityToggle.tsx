import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { doctorService } from '@/services/api/doctor-service';
import { toast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';
import { Clock } from 'lucide-react';

interface AvailabilityToggleProps {
  onStatusChange: (isAvailable: boolean) => void;
}

const AvailabilityToggle: React.FC<AvailabilityToggleProps> = ({ 
  onStatusChange 
}) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch current doctor status on component mount
  useEffect(() => {
    const fetchDoctorStatus = async () => {
      try {
        setIsLoading(true);
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
          
          // Notify parent component of current availability
          onStatusChange(response.data.isAvailable);
        }
      } catch (error) {
        console.error('Error fetching doctor status:', error);
        toast({
          title: 'Error',
          description: 'Could not load your current status.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDoctorStatus();
  }, [onStatusChange]);

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
    setIsUpdating(true);
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
        toast({
          title: "Status Update Failed",
          description: response.error || "Could not update your availability status.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Status Update Failed",
        description: "Could not update your availability status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const updateShiftTimes = async () => {
    if (isAvailable) {
      setIsUpdating(true);
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
          toast({
            title: "Shift Update Failed",
            description: response.error || "Could not update your shift time.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Shift Update Failed",
          description: "Could not update your shift time. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsUpdating(false);
      }
    }
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

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium">Availability Status</CardTitle>
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
