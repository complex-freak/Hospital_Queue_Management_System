import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { Loader } from '@/components/ui/loader';
import { CalendarIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ConsultationFeedback } from '@/types/patient';
import { apiService } from '@/services/api';
import { doctorService } from '@/services/api/doctor-service';
import { toast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';

interface DoctorProfile {
  id: string;
  user_id: string;
  specialization: string;
  department: string;
  is_available: boolean;
  shift_start?: string;
  shift_end?: string;
  bio?: string;
  education?: string;
  experience?: string;
}

interface ConsultationFeedbackFormProps {
  patientId: string | null;
  patientName?: string;
  appointmentId?: string;
  doctorId?: string;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

const consultationSchema = z.object({
  diagnosis: z.string().min(1, { message: "Diagnosis is required" }),
  treatment: z.string().min(1, { message: "Treatment is required" }),
  prescription: z.string().optional(),
  followUpDate: z.date().optional(),
  notes: z.string().optional(),
});

const ConsultationFeedbackForm: React.FC<ConsultationFeedbackFormProps> = ({
  patientId,
  patientName = 'Patient',
  appointmentId,
  doctorId,
  onClose,
  onSubmitSuccess,
}) => {
  const [doctorProfile, setDoctorProfile] = useState<DoctorProfile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  const form = useForm<z.infer<typeof consultationSchema>>({
    resolver: zodResolver(consultationSchema),
    defaultValues: {
      diagnosis: '',
      treatment: '',
      prescription: '',
      notes: '',
    },
  });
  
  const { isSubmitting } = form.formState;

  // Fetch doctor profile on component mount
  useEffect(() => {
    const fetchDoctorProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const response = await doctorService.getDoctorProfile();
        if (response.success && response.data) {
          setDoctorProfile(response.data);
        } else {
          console.error('Failed to fetch doctor profile:', response.error);
          toast({
            title: 'Error',
            description: 'Failed to load doctor profile. Please try again.',
            variant: 'destructive',
          });
        }
      } catch (error) {
        console.error('Error fetching doctor profile:', error);
        toast({
          title: 'Error',
          description: 'Failed to load doctor profile. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    fetchDoctorProfile();
  }, []);

  const onSubmit = async (data: z.infer<typeof consultationSchema>) => {
    if (!patientId || !appointmentId) {
      toast({
        title: 'Error',
        description: 'Missing required data for consultation submission.',
        variant: 'destructive',
      });
      return;
    }
    
    // Use doctor ID from profile if available, otherwise fall back to the one passed as prop
    const currentDoctorId = doctorProfile?.id || doctorId;
    
    if (!currentDoctorId) {
      toast({
        title: 'Error',
        description: 'Unable to determine doctor ID. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    
    try {
      const consultationData: ConsultationFeedback = {
        patientId,
        appointmentId,
        doctorId: currentDoctorId,
        diagnosis: data.diagnosis,
        treatment: data.treatment,
        prescription: data.prescription || '',
        followUpDate: data.followUpDate ? format(data.followUpDate, 'yyyy-MM-dd') : undefined,
        notes: data.notes || '',
      };
      
      await apiService.submitConsultation(appointmentId, consultationData);
      toast({
        title: 'Consultation Submitted',
        description: 'Patient consultation feedback has been saved successfully.',
      });
      onSubmitSuccess();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save consultation feedback. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!patientId) return null;

  // Show loading state while fetching doctor profile
  if (isLoadingProfile) {
    return (
      <Card className="h-full w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Consultation Feedback</CardTitle>
            <CardDescription>
              Loading doctor profile...
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader className="h-8 w-8 text-primary" />
          <span className="ml-2 text-gray-500">Loading doctor profile...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl">Consultation Feedback</CardTitle>
          <CardDescription>
            Record diagnosis and treatment for {patientName}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4 overflow-auto p-4" style={{ maxHeight: 'calc(100vh - 300px)' }}>
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter patient diagnosis"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="treatment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Plan</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter treatment details"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="prescription"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prescription</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter prescription details"
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Include medication names, dosages, and instructions
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="followUpDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Follow-up Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Select a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormDescription>
                    Schedule a follow-up appointment (optional)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any additional notes here..."
                      className="min-h-[80px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          
          <CardFooter className="flex justify-end space-x-2 border-t bg-gray-50 p-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoadingProfile}>
              {isSubmitting ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Submitting...
                </>
              ) : (
                'Submit Consultation'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default ConsultationFeedbackForm; 