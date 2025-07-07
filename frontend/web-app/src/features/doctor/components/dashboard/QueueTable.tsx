import React, { useState, useEffect, useMemo } from 'react';
import { format, compareAsc } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/ui/loader';
import { apiService } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { BadgeCheck, SkipForward, Bell, FileText, ClipboardList, RefreshCw } from 'lucide-react';
import PatientDetailsViewer from './PatientDetailsViewer';
import ConsultationFeedbackForm from './ConsultationFeedbackForm';
import QueueFilters, { QueueFiltersState } from './QueueFilters';
import { Patient as PatientType, PriorityLevel } from '@/types/patient';

// Extended interface for queue table data
interface QueuePatient extends PatientType {
  queue_number: number;
  checkInTime: string | null;
  priority: PriorityLevel;
  status: string;
  appointment_id?: string;
  doctor_id?: string;
  queue_id?: string;
}

interface QueueTableProps {
  patients: QueuePatient[];
  isLoading: boolean;
  onPatientSeen: (id: string) => void;
  onPatientSkipped: (id: string) => void;
  refreshQueue: () => void;
}

const getPriorityClass = (priority: string) => {
  switch (priority.toLowerCase()) {
    case 'high':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'low':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

// Helper function to safely format dates
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    // Handle different date string formats
    let date: Date;
    
    // If it's already a valid date string, use it directly
    if (typeof dateString === 'string' && dateString.trim()) {
      date = new Date(dateString);
    } else {
      return 'N/A';
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      console.warn('Invalid date string:', dateString);
      return 'N/A';
    }
    
    // Use a more robust format that handles edge cases
    try {
      return format(date, 'h:mm a');
    } catch (formatError) {
      console.warn('Error formatting date:', formatError, 'Date:', date, 'Original string:', dateString);
      return 'N/A';
    }
  } catch (error) {
    console.warn('Error parsing date:', error, 'Date string:', dateString);
    return 'N/A';
  }
};

// Helper function to safely compare dates
const compareDates = (dateA: string | null | undefined, dateB: string | null | undefined): number => {
  try {
    let date1: Date | null = null;
    let date2: Date | null = null;
    
    // Parse date A
    if (dateA && typeof dateA === 'string' && dateA.trim()) {
      date1 = new Date(dateA);
      if (isNaN(date1.getTime())) {
        console.warn('Invalid date A:', dateA);
        date1 = null;
      }
    }
    
    // Parse date B
    if (dateB && typeof dateB === 'string' && dateB.trim()) {
      date2 = new Date(dateB);
      if (isNaN(date2.getTime())) {
        console.warn('Invalid date B:', dateB);
        date2 = null;
      }
    }
    
    if (!date1 && !date2) return 0;
    if (!date1) return 1; // null dates go last
    if (!date2) return -1;
    
    try {
      return compareAsc(date1, date2);
    } catch (compareError) {
      console.warn('Error comparing dates:', compareError, 'Date1:', date1, 'Date2:', date2);
      return 0;
    }
  } catch (error) {
    console.warn('Error in compareDates:', error, 'DateA:', dateA, 'DateB:', dateB);
    return 0;
  }
};

const QueueTable: React.FC<QueueTableProps> = ({ 
  patients, 
  isLoading, 
  onPatientSeen, 
  onPatientSkipped,
  refreshQueue 
}) => {
  const [notificationPatient, setNotificationPatient] = useState<QueuePatient | null>(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  // States for the patient details and consultation form
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isConsultationOpen, setIsConsultationOpen] = useState(false);
  
  // Filtering and sorting state
  const [filters, setFilters] = useState<QueueFiltersState>({
    search: '',
    sortField: 'checkInTime',
    sortDirection: 'asc',
    priorityFilter: 'All',
  });

  const handleNotification = (patient: QueuePatient) => {
    setNotificationPatient(patient);
    setNotificationMessage(`Hello ${patient.name}, the doctor is ready to see you now.`);
    setIsNotificationOpen(true);
  };

  const sendNotification = async () => {
    if (!notificationPatient || !notificationMessage.trim()) return;
    
    setIsSendingNotification(true);
    try {
      await apiService.sendNotification(notificationPatient.id, notificationMessage);
      toast({
        title: "Notification Sent",
        description: `Notification sent to ${notificationPatient.name}`,
      });
      setIsNotificationOpen(false);
      setNotificationMessage('');
      refreshQueue();
    } catch (error) {
      toast({
        title: "Notification Failed",
        description: "Could not send notification. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSendingNotification(false);
    }
  };

  const openPatientDetails = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsDetailsOpen(true);
  };

  const openConsultationForm = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsConsultationOpen(true);
  };

  const handleConsultationSuccess = () => {
    setIsConsultationOpen(false);
    // Also mark the patient as seen after successful consultation
    if (selectedPatientId) {
      onPatientSeen(selectedPatientId);
    }
  };

  const closePatientDetails = () => {
    setIsDetailsOpen(false);
  };

  const closeConsultationForm = () => {
    setIsConsultationOpen(false);
  };
  
  // Apply filters and sorting
  const filteredAndSortedPatients = useMemo(() => {
    // First filter by priority if needed
    let result = patients;
    
    if (filters.priorityFilter !== 'All') {
      result = result.filter(patient => patient.priority === filters.priorityFilter.toLowerCase());
    }
    
    // Then filter by search term
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      result = result.filter(
        patient => 
          patient.name.toLowerCase().includes(searchTerm) ||
          patient.id.toLowerCase().includes(searchTerm) ||
          patient.reason.toLowerCase().includes(searchTerm)
      );
    }
    
    // Finally sort
    return [...result].sort((a, b) => {
      let comparison = 0;
      
      if (filters.sortField === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (filters.sortField === 'priority') {
        // Convert priority to numeric value for sorting
        const priorityMap = { 'high': 3, 'medium': 2, 'low': 1 };
        const priorityA = priorityMap[a.priority.toLowerCase() as keyof typeof priorityMap];
        const priorityB = priorityMap[b.priority.toLowerCase() as keyof typeof priorityMap];
        comparison = priorityB - priorityA; // Higher priority first
              } else {
          // Default sort by check-in time
          comparison = compareDates(a.checkInTime, b.checkInTime);
        }
      
      // Apply direction
      return filters.sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [patients, filters]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-8 w-8 text-primary" />
        <span className="ml-2 text-gray-500">Loading patient queue...</span>
      </div>
    );
  }

  if (!patients || patients.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="text-3xl font-light text-gray-400">No patients in queue</div>
        <p className="mt-2 text-gray-500">Your queue is currently empty. Enjoy the quiet moment!</p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={refreshQueue}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Queue
        </Button>
      </div>
    );
  }
  
  const handleFilterChange = (newFilters: QueueFiltersState) => {
    setFilters(newFilters);
  };

  return (
    <>
      <QueueFilters onFilterChange={handleFilterChange} />
      
      <div className="relative overflow-hidden rounded-md border shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[80px]">Queue #</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Reason for Visit</TableHead>
              <TableHead className="hidden md:table-cell">Check-In Time</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedPatients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No patients match the current filters
                </TableCell>
              </TableRow>
            ) : (
              filteredAndSortedPatients.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{patient.queue_number}</TableCell>
                <TableCell>
                  <button 
                    onClick={() => openPatientDetails(patient.id)}
                    className="font-medium text-blue-600 hover:underline"
                  >
                    {patient.name}
                  </button>
                </TableCell>
                <TableCell className="hidden max-w-xs truncate md:table-cell">
                  {patient.reason}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {(() => {
                    try {
                      return formatDate(patient.checkInTime);
                    } catch (error) {
                      console.error('Error formatting checkInTime:', error, 'Patient:', patient);
                      return 'N/A';
                    }
                  })()}
                </TableCell>
                <TableCell>
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${getPriorityClass(patient.priority)}`}>
                    {patient.priority}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openConsultationForm(patient.id)}
                      className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <ClipboardList className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Consult</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openPatientDetails(patient.id)}
                      className="text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                    >
                      <FileText className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Details</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onPatientSkipped(patient.id)}
                      className="text-orange-600 hover:bg-orange-50 hover:text-orange-700"
                    >
                      <SkipForward className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Skip</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNotification(patient)}
                      className="text-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      <Bell className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Notify</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )))}
          </TableBody>
        </Table>
      </div>

      {/* Notification Dialog */}
      <Dialog open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Notification</DialogTitle>
            <DialogDescription>
              Notify {notificationPatient?.name} with a custom message.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              placeholder="Enter your message here..."
              className="h-32"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsNotificationOpen(false)}
              disabled={isSendingNotification}
            >
              Cancel
            </Button>
            <Button 
              onClick={sendNotification}
              disabled={isSendingNotification || !notificationMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isSendingNotification ? (
                <>
                  <Loader className="mr-2 h-4 w-4" />
                  Sending...
                </>
              ) : (
                'Send Notification'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Patient Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
          <PatientDetailsViewer 
            patientId={selectedPatientId}
            onClose={closePatientDetails}
            onPatientSeen={onPatientSeen}
          />
        </DialogContent>
      </Dialog>

      {/* Consultation Form Dialog */}
      <Dialog open={isConsultationOpen} onOpenChange={setIsConsultationOpen}>
        <DialogContent className="sm:max-w-3xl" onInteractOutside={(e) => e.preventDefault()}>
          <ConsultationFeedbackForm 
            patientId={selectedPatientId}
            patientName={patients.find(p => p.id === selectedPatientId)?.name}
            appointmentId={patients.find(p => p.id === selectedPatientId)?.appointment_id}
            doctorId={patients.find(p => p.id === selectedPatientId)?.doctor_id}
            onClose={closeConsultationForm}
            onSubmitSuccess={handleConsultationSuccess}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QueueTable;
