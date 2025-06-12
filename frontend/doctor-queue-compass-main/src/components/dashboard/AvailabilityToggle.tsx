
import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiService } from '@/services/api';
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

  const toggleAvailability = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      await apiService.updateStatus({
        isAvailable: checked,
        shiftStart: checked ? shiftStart : undefined,
        shiftEnd: checked ? shiftEnd : undefined,
      });
      
      setIsAvailable(checked);
      onStatusChange(checked);
      
      toast({
        title: checked ? "You're Now Available" : "You're Now Unavailable",
        description: checked 
          ? `You're on duty until ${shiftEnd}`
          : "Your queue is paused. Patients won't be directed to you.",
      });
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
        await apiService.updateStatus({
          isAvailable: true,
          shiftStart,
          shiftEnd,
        });
        
        toast({
          title: "Shift Updated",
          description: `Your shift time is now set from ${shiftStart} to ${shiftEnd}`,
        });
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
