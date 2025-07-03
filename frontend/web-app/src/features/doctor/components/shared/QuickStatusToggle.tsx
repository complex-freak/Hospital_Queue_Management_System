import React, { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Clock, User, Settings } from 'lucide-react';
import { doctorService } from '@/services/api/doctor-service';
import { toast } from '@/hooks/use-toast';
import { Loader } from '@/components/ui/loader';

interface QuickStatusToggleProps {
  onStatusChange?: (isAvailable: boolean) => void;
}

const QuickStatusToggle: React.FC<QuickStatusToggleProps> = ({ onStatusChange }) => {
  const [isAvailable, setIsAvailable] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const response = await doctorService.getDoctorProfile();
        
        if (response.success && response.data) {
          setIsAvailable(response.data.isAvailable);
          if (onStatusChange) {
            onStatusChange(response.data.isAvailable);
          }
        }
      } catch (error) {
        console.error('Error fetching doctor status:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStatus();
  }, [onStatusChange]);

  const toggleAvailability = async (checked: boolean) => {
    setIsUpdating(true);
    try {
      const response = await doctorService.updateStatus({
        isAvailable: checked
      });
      
      if (response.success) {
        setIsAvailable(checked);
        if (onStatusChange) {
          onStatusChange(checked);
        }
        
        toast({
          title: checked ? "You're Now Available" : "You're Now Unavailable",
          description: checked 
            ? "You're now visible to patients"
            : "Your queue is paused",
        });
      } else {
        toast({
          title: "Status Update Failed",
          description: response.error || "Could not update your status",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Status Update Failed",
        description: "Could not update your status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <Loader className="h-4 w-4" />;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          className={isAvailable ? "border-green-500 text-green-600" : "border-gray-400 text-gray-500"}
          size="sm"
        >
          <User className="mr-2 h-4 w-4" />
          {isAvailable ? "Available" : "Unavailable"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Doctor Status</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="flex items-center justify-between cursor-default">
          <span className="flex items-center">
            <Clock className="mr-2 h-4 w-4" />
            <span>Availability</span>
          </span>
          <Switch
            checked={isAvailable}
            onCheckedChange={toggleAvailability}
            disabled={isUpdating}
          />
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Button 
            variant="ghost" 
            className="w-full justify-start" 
            size="sm"
            asChild
          >
            <a href="/doctor/settings">
              <Settings className="mr-2 h-4 w-4" />
              Manage Schedule
            </a>
          </Button>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default QuickStatusToggle; 