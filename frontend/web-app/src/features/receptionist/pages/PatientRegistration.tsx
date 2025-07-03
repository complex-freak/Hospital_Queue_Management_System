import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/hooks/use-auth-context';
import { toast } from '@/hooks/use-toast';
import { receptionistService } from '@/services/api/receptionist-service';
import AppHeader from '@/features/shared/components/AppHeader';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader, ArrowLeft, ArrowRight, Save, UserPlus, AlertCircle } from 'lucide-react';

// Define schemas for each step
const personalInfoSchema = z.object({
  firstName: z.string().min(2, 'First name is required'),
  lastName: z.string().min(2, 'Last name is required'),
  dateOfBirth: z.string().min(1, 'Date of birth is required'),
  gender: z.enum(['male', 'female', 'other'], {
    required_error: 'Please select a gender',
  }),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
});

const medicalInfoSchema = z.object({
  reason: z.string().min(5, 'Reason for visit is required'),
  priority: z.enum(['low', 'medium', 'high'], {
    required_error: 'Please select a priority',
  }),
  allergies: z.string().optional(),
  medications: z.string().optional(),
  medicalHistory: z.string().optional(),
});

const consentSchema = z.object({
  consentToTreatment: z.boolean().refine(val => val === true, {
    message: 'You must consent to treatment',
  }),
  consentToShareData: z.boolean().optional(),
  emergencyContactName: z.string().min(2, 'Emergency contact name is required'),
  emergencyContactPhone: z.string().min(10, 'Emergency contact phone is required'),
  emergencyContactRelation: z.string().min(2, 'Relationship is required'),
});

const PatientRegistration = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);

  // Forms for each step
  const personalInfoForm = useForm<z.infer<typeof personalInfoSchema>>({
    resolver: zodResolver(personalInfoSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      gender: 'male',
      email: '',
      phone: '',
    },
  });

  const medicalInfoForm = useForm<z.infer<typeof medicalInfoSchema>>({
    resolver: zodResolver(medicalInfoSchema),
    defaultValues: {
      reason: '',
      priority: 'medium',
      allergies: '',
      medications: '',
      medicalHistory: '',
    },
  });

  const consentForm = useForm<z.infer<typeof consentSchema>>({
    resolver: zodResolver(consentSchema),
    defaultValues: {
      consentToTreatment: false,
      consentToShareData: false,
      emergencyContactName: '',
      emergencyContactPhone: '',
      emergencyContactRelation: '',
    },
  });

  // Check for saved draft on component mount
  useEffect(() => {
    const loadDraft = async () => {
      try {
        const draftData = localStorage.getItem('patientRegistrationDraft');
        
        if (draftData) {
          const draft = JSON.parse(draftData);
          setDraftId(draft.draftId || null);
          
          // Load data into forms
          if (draft.personalInfo) {
            personalInfoForm.reset(draft.personalInfo);
          }
          
          if (draft.medicalInfo) {
            medicalInfoForm.reset(draft.medicalInfo);
          }
          
          if (draft.consent) {
            consentForm.reset(draft.consent);
          }
          
          toast({
            title: 'Draft Loaded',
            description: 'Your previous registration draft has been loaded.',
          });
        }
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    };

    loadDraft();
  }, []);

  // Auto-save draft every 30 seconds
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      saveDraft();
    }, 30000);
    
    return () => clearInterval(autoSaveInterval);
  }, [personalInfoForm.formState.isDirty, medicalInfoForm.formState.isDirty, consentForm.formState.isDirty]);

  const saveDraft = async () => {
    // Only save if any form has changed
    if (
      !personalInfoForm.formState.isDirty &&
      !medicalInfoForm.formState.isDirty &&
      !consentForm.formState.isDirty &&
      draftSaved
    ) {
      return;
    }
    
    setIsSavingDraft(true);
    
    try {
      const personalInfo = personalInfoForm.getValues();
      const medicalInfo = medicalInfoForm.getValues();
      const consent = consentForm.getValues();
      
      const draftData = {
        draftId: draftId || `draft-${Date.now()}`,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        dateOfBirth: personalInfo.dateOfBirth,
        gender: personalInfo.gender,
        email: personalInfo.email,
        phone: personalInfo.phone,
        reason: medicalInfo.reason,
        priority: medicalInfo.priority,
        allergies: medicalInfo.allergies,
        medications: medicalInfo.medications,
        medicalHistory: medicalInfo.medicalHistory,
        consentToTreatment: consent.consentToTreatment,
        consentToShareData: consent.consentToShareData,
        emergencyContactName: consent.emergencyContactName,
        emergencyContactPhone: consent.emergencyContactPhone,
        emergencyContactRelation: consent.emergencyContactRelation,
        lastUpdated: new Date().toISOString(),
      };
      
      // Save draft using the receptionist service
      const result = await receptionistService.savePatientDraft(draftData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save draft');
      }
      
      if (!draftId) {
        setDraftId(draftData.draftId);
      }
      
      setDraftSaved(true);
      
      toast({
        title: 'Draft Saved',
        description: 'Your registration progress has been saved.',
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save draft. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleNext = async () => {
    let isValid = false;
    
    switch (currentStep) {
      case 0:
        isValid = await personalInfoForm.trigger();
        break;
      case 1:
        isValid = await medicalInfoForm.trigger();
        break;
      default:
        isValid = false;
    }
    
    if (isValid) {
      saveDraft();
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleSubmit = async () => {
    // Trigger validation for all fields
    const isValid = await consentForm.trigger();
    
    if (!isValid) {
      // Focus on the consent checkbox if it's not checked
      if (!consentForm.getValues().consentToTreatment) {
        document.getElementById('consentToTreatment')?.focus();
      }
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const personalInfo = personalInfoForm.getValues();
      const medicalInfo = medicalInfoForm.getValues();
      const consent = consentForm.getValues();
      
      // Combine all form data
      const patientData = {
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName,
        dateOfBirth: personalInfo.dateOfBirth,
        gender: personalInfo.gender,
        email: personalInfo.email || undefined,
        phone: personalInfo.phone,
        reason: medicalInfo.reason,
        priority: medicalInfo.priority,
        allergies: medicalInfo.allergies || undefined,
        medications: medicalInfo.medications || undefined,
        medicalHistory: medicalInfo.medicalHistory || undefined,
        consentToTreatment: consent.consentToTreatment,
        consentToShareData: consent.consentToShareData || false,
        emergencyContactName: consent.emergencyContactName,
        emergencyContactPhone: consent.emergencyContactPhone,
        emergencyContactRelation: consent.emergencyContactRelation,
        registeredBy: user?.id || undefined,
        registrationDate: new Date().toISOString(),
      };
      
      // Register patient using the receptionist service
      const result = await receptionistService.registerPatient(patientData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to register patient');
      }
      
      // Clear draft after successful registration
      if (draftId) {
        localStorage.removeItem('patientRegistrationDraft-' + draftId);
      localStorage.removeItem('patientRegistrationDraft');
        setDraftId(null);
      }
      
      toast({
        title: 'Registration Successful',
        description: `${patientData.firstName} ${patientData.lastName} has been registered successfully.`,
      });
      
      // Navigate to dashboard
      navigate('/receptionist/dashboard');
    } catch (error) {
      console.error('Error registering patient:', error);
      toast({
        title: 'Registration Failed',
        description: error instanceof Error ? error.message : 'Failed to register patient. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render the current step
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form {...personalInfoForm}>
            <form className="space-y-6">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={personalInfoForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={personalInfoForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={personalInfoForm.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={personalInfoForm.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={personalInfoForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+1 (555) 123-4567" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={personalInfoForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="john.doe@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </form>
          </Form>
        );
      
      case 1:
        return (
          <Form {...medicalInfoForm}>
            <form className="space-y-6">
              <FormField
                control={medicalInfoForm.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason for Visit</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Please describe the reason for your visit today"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={medicalInfoForm.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority Level</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Select based on urgency of the patient's condition
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <FormField
                  control={medicalInfoForm.control}
                  name="allergies"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allergies (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List any known allergies"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={medicalInfoForm.control}
                  name="medications"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Medications (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="List any current medications"
                          className="min-h-[80px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={medicalInfoForm.control}
                name="medicalHistory"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Medical History (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Any relevant medical history"
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        );
      
      case 2:
        return (
          <Form {...consentForm}>
            <form className="space-y-6">
              <div className="rounded-md bg-blue-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertCircle className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      Consent Information
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        Please read the following consent information carefully and provide your emergency contact details.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <FormField
                control={consentForm.control}
                name="consentToTreatment"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) => {
                          field.onChange(checked === true);
                          // Force the value to be a boolean
                          if (checked) {
                            consentForm.setValue('consentToTreatment', true, { shouldValidate: true });
                          } else {
                            consentForm.setValue('consentToTreatment', false, { shouldValidate: true });
                          }
                        }}
                        id="consentToTreatment"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel 
                        htmlFor="consentToTreatment"
                        className="cursor-pointer"
                      >
                        Consent to Treatment
                      </FormLabel>
                      <FormDescription>
                        I consent to receive medical treatment from the hospital staff and understand the risks and benefits of treatment.
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={consentForm.control}
                name="consentToShareData"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value === true}
                        onCheckedChange={(checked) => {
                          field.onChange(checked === true);
                          // Force the value to be a boolean
                          if (checked) {
                            consentForm.setValue('consentToShareData', true, { shouldValidate: true });
                          } else {
                            consentForm.setValue('consentToShareData', false, { shouldValidate: true });
                          }
                        }}
                        id="consentToShareData"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel 
                        htmlFor="consentToShareData"
                        className="cursor-pointer"
                      >
                        Consent to Share Medical Data
                      </FormLabel>
                      <FormDescription>
                        I consent to the sharing of my medical data with other healthcare providers as necessary for my treatment.
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
              
              <div className="rounded-md bg-gray-50 p-4">
                <h3 className="text-sm font-medium text-gray-800 mb-2">
                  Emergency Contact Information
                </h3>
                
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <FormField
                    control={consentForm.control}
                    name="emergencyContactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={consentForm.control}
                    name="emergencyContactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Emergency Contact Phone</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 987-6543" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={consentForm.control}
                    name="emergencyContactRelation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Relationship to Patient</FormLabel>
                        <FormControl>
                          <Input placeholder="Spouse, Parent, etc." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </form>
          </Form>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />
      
      <div className="py-8 mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Patient Registration</CardTitle>
            <CardDescription>
              {currentStep === 0 && 'Step 1: Personal Information'}
              {currentStep === 1 && 'Step 2: Medical Information'}
              {currentStep === 2 && 'Step 3: Consent & Emergency Contact'}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {/* Progress indicator */}
            <div className="mb-8">
              <div className="flex justify-between">
                <div className={`flex-1 border-t-4 pt-2 ${currentStep >= 0 ? 'border-blue-500' : 'border-gray-200'}`}>
                  <p className={`text-xs font-medium ${currentStep === 0 ? 'text-blue-600' : currentStep > 0 ? 'text-blue-500' : 'text-gray-500'}`}>
                    STEP 1
                  </p>
                  <p className="text-sm">Personal Info</p>
                </div>
                <div className={`flex-1 border-t-4 pt-2 ${currentStep >= 1 ? 'border-blue-500' : 'border-gray-200'}`}>
                  <p className={`text-xs font-medium ${currentStep === 1 ? 'text-blue-600' : currentStep > 1 ? 'text-blue-500' : 'text-gray-500'}`}>
                    STEP 2
                  </p>
                  <p className="text-sm">Medical Details</p>
                </div>
                <div className={`flex-1 border-t-4 pt-2 ${currentStep >= 2 ? 'border-blue-500' : 'border-gray-200'}`}>
                  <p className={`text-xs font-medium ${currentStep === 2 ? 'text-blue-600' : 'text-gray-500'}`}>
                    STEP 3
                  </p>
                  <p className="text-sm">Consent</p>
                </div>
              </div>
            </div>
            
            {renderStep()}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <div>
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={isSubmitting}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}
            </div>
            
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={saveDraft}
                disabled={isSubmitting || isSavingDraft}
              >
                {isSavingDraft ? (
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Draft
              </Button>
              
              {currentStep < 2 ? (
                <Button onClick={handleNext} disabled={isSubmitting}>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? (
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Register Patient
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default PatientRegistration; 