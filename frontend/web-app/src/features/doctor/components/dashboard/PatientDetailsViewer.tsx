import React, { useState, useEffect } from 'react';
import { Patient, PatientHistory, NoteVersion } from '@/types/patient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader } from '@/components/ui/loader';
import { apiService } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { AlignLeft, BookOpen, ClipboardList, FileText, X, History } from 'lucide-react';
import RichTextEditor from './RichTextEditor';
import NoteHistory from './NoteHistory';

interface PatientDetailsViewerProps {
  patientId: string | null;
  onClose: () => void;
  onPatientSeen: (patientId: string) => void;
}

const PatientDetailsViewer: React.FC<PatientDetailsViewerProps> = ({ 
  patientId, 
  onClose,
  onPatientSeen
}) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [medicalNotes, setMedicalNotes] = useState('');
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [noteHistory, setNoteHistory] = useState<NoteVersion[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [currentNoteVersionId, setCurrentNoteVersionId] = useState<string | undefined>(undefined);

  useEffect(() => {
    const fetchPatientDetails = async () => {
      if (!patientId) return;
      
      setIsLoading(true);
      try {
        const response = await apiService.getPatientDetails(patientId);
        if (response.success && response.data) {
          // Transform User data to Patient format
          const userData = response.data;
          const patientData: Patient = {
            id: userData.id,
            name: userData.fullName,
            priority: 'Medium', // Default priority
            status: 'Waiting',
            registeredTime: new Date(),
            department: userData.department || 'General',
            reason: 'Not specified',
            checkInTime: new Date().toISOString(),
            gender: userData.gender,
            contactNumber: userData.phoneNumber,
            notes: ''  // Default empty notes
          };
          setPatient(patientData);
          setMedicalNotes(''); // Initialize with empty notes
        }
      } catch (error) {
        console.error('Error fetching patient details:', error);
        toast({
          title: 'Error',
          description: 'Failed to load patient details. Please try again.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPatientDetails();
  }, [patientId]);

  const fetchNoteHistory = async () => {
    if (!patientId) return;
    
    setIsLoadingHistory(true);
    try {
      const response = await apiService.getNoteHistory(patientId);
      if (response.success && response.data) {
        setNoteHistory(response.data);
      }
    } catch (error) {
      console.error('Error fetching note history:', error);
      toast({
        title: 'Error',
        description: 'Failed to load note history. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showHistory && patientId) {
      fetchNoteHistory();
    }
  }, [showHistory, patientId]);

  const handleSaveNotes = async () => {
    if (!patient) return;
    
    setIsSavingNotes(true);
    try {
      // Save the current notes
      const saveResponse = await apiService.savePatientNotes(patient.id, medicalNotes);
      
      if (saveResponse.success && saveResponse.data) {
        setCurrentNoteVersionId(saveResponse.data.id);
        
        // If history view is open, refresh the history
        if (showHistory) {
          fetchNoteHistory();
        }
      }
      
      toast({
        title: 'Notes Saved',
        description: 'Patient notes have been saved successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save notes. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleRestoreVersion = (version: NoteVersion) => {
    setMedicalNotes(version.content);
    setCurrentNoteVersionId(version.id);
    toast({
      title: 'Version Restored',
      description: `Note version from ${format(new Date(version.timestamp), "MMM d, yyyy")} has been restored.`,
    });
  };

  const handleAutosave = async (content: string) => {
    if (!patient) return;
    await apiService.savePatientNotes(patient.id, content);
  };

  const handleMarkAsSeen = () => {
    if (!patient) return;
    onPatientSeen(patient.id);
    onClose();
  };

  if (!patientId) return null;

  if (isLoading) {
    return (
      <Card className="h-full w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Patient Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center">
          <Loader className="h-8 w-8 text-primary" />
          <span className="ml-2 text-gray-500">Loading patient details...</span>
        </CardContent>
      </Card>
    );
  }

  if (!patient) {
    return (
      <Card className="h-full w-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xl">Patient Details</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="flex h-64 flex-col items-center justify-center text-center">
          <div className="text-lg font-medium text-gray-400">Patient not found</div>
          <p className="mt-2 text-sm text-gray-500">The requested patient information could not be loaded.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full w-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="text-xl">{patient.name}</CardTitle>
          <CardDescription>
            Patient ID: {patient.id} • 
            {patient.age && `${patient.age} yrs • `}
            {patient.gender && `${patient.gender} • `}
            Check-in: {format(new Date(patient.checkInTime), 'h:mm a')}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="details">
            <ClipboardList className="mr-2 h-4 w-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="history">
            <BookOpen className="mr-2 h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="notes">
            <AlignLeft className="mr-2 h-4 w-4" />
            Notes
          </TabsTrigger>
          <TabsTrigger value="versions" onClick={() => setShowHistory(true)}>
            <History className="mr-2 h-4 w-4" />
            Versions
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="p-4">
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-700">Reason for Visit</h3>
              <p className="mt-1 text-gray-600">{patient.reason}</p>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700">Priority</h3>
              <Badge variant={
                patient.priority === 'High' ? 'destructive' :
                patient.priority === 'Medium' ? 'default' : 'outline'
              }>
                {patient.priority}
              </Badge>
            </div>
            
            {patient.contactNumber && (
              <div>
                <h3 className="font-medium text-gray-700">Contact</h3>
                <p className="mt-1 text-gray-600">{patient.contactNumber}</p>
              </div>
            )}
            
            {patient.vitalSigns && (
              <div>
                <h3 className="font-medium text-gray-700">Vital Signs</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {patient.vitalSigns.bloodPressure && (
                    <div className="rounded-md border bg-gray-50 p-2">
                      <div className="text-xs text-gray-500">Blood Pressure</div>
                      <div className="text-sm font-medium">{patient.vitalSigns.bloodPressure}</div>
                    </div>
                  )}
                  {patient.vitalSigns.heartRate && (
                    <div className="rounded-md border bg-gray-50 p-2">
                      <div className="text-xs text-gray-500">Heart Rate</div>
                      <div className="text-sm font-medium">{patient.vitalSigns.heartRate} BPM</div>
                    </div>
                  )}
                  {patient.vitalSigns.temperature && (
                    <div className="rounded-md border bg-gray-50 p-2">
                      <div className="text-xs text-gray-500">Temperature</div>
                      <div className="text-sm font-medium">{patient.vitalSigns.temperature}°C</div>
                    </div>
                  )}
                  {patient.vitalSigns.respiratoryRate && (
                    <div className="rounded-md border bg-gray-50 p-2">
                      <div className="text-xs text-gray-500">Respiratory Rate</div>
                      <div className="text-sm font-medium">{patient.vitalSigns.respiratoryRate}/min</div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {patient.allergies && patient.allergies.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700">Allergies</h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  {patient.allergies.map((allergy, index) => (
                    <Badge key={index} variant="outline" className="bg-red-50">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            {patient.currentMedications && patient.currentMedications.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-700">Current Medications</h3>
                <ul className="mt-1 list-inside list-disc text-gray-600">
                  {patient.currentMedications.map((medication, index) => (
                    <li key={index}>{medication}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="history" className="p-4">
          {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
            <Accordion type="single" collapsible className="w-full">
              {patient.medicalHistory.map((entry, index) => (
                <AccordionItem key={index} value={`item-${index}`}>
                  <AccordionTrigger>
                    <div className="flex flex-col items-start text-left">
                      <div>{format(new Date(entry.visitDate), 'MMM d, yyyy')}</div>
                      <div className="text-xs text-gray-500">{entry.diagnosis}</div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2">
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Diagnosis</h4>
                        <p className="text-sm text-gray-600">{entry.diagnosis}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Treatment</h4>
                        <p className="text-sm text-gray-600">{entry.treatment}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                        <p className="text-sm text-gray-600">{entry.notes}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-700">Doctor</h4>
                        <p className="text-sm text-gray-600">{entry.doctorName}</p>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          ) : (
            <div className="flex h-32 flex-col items-center justify-center text-center">
              <FileText className="h-8 w-8 text-gray-300" />
              <p className="mt-2 text-gray-500">No medical history records available</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="notes" className="p-4">
          <div className="space-y-4">
            <div>
              <label htmlFor="medical-notes" className="block text-sm font-medium text-gray-700">
                Medical Notes
              </label>
              <RichTextEditor
                initialValue={medicalNotes}
                onChange={setMedicalNotes}
                placeholder="Add your medical notes here..."
                className="min-h-[250px]"
                autosave={true}
                autosaveInterval={30000} // autosave every 30 seconds
                onAutosave={handleAutosave}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveNotes} disabled={isSavingNotes}>
                {isSavingNotes ? (
                  <>
                    <Loader className="mr-2 h-4 w-4" />
                    Saving...
                  </>
                ) : (
                  'Save Notes'
                )}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="versions" className="p-4">
          {isLoadingHistory ? (
            <div className="flex h-64 items-center justify-center">
              <Loader className="h-8 w-8 text-primary" />
              <span className="ml-2 text-gray-500">Loading note history...</span>
            </div>
          ) : (
            <NoteHistory
              versions={noteHistory}
              onRestoreVersion={handleRestoreVersion}
              currentVersionId={currentNoteVersionId}
            />
          )}
        </TabsContent>
      </Tabs>

      <CardFooter className="flex justify-end space-x-2 border-t bg-gray-50 p-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={handleMarkAsSeen}>
          Mark as Seen
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PatientDetailsViewer; 