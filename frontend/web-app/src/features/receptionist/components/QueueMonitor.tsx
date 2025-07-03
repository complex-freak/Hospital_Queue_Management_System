import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Search, ArrowUpDown } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { notificationService } from '@/services/notifications/notificationService';
import { connectivityService } from '@/services/connectivity/connectivityService';
import { indexedDBService } from '@/services/db/indexedDBService';
import DraggableQueueItem from './DraggableQueueItem';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { queueService } from '@/services/api/queue-service';
import { receptionistService } from '@/services/api/receptionist-service';

interface QueueMonitorProps {
  patients: any[];
  doctors: any[];
  isLoading: boolean;
}

const QueueMonitor: React.FC<QueueMonitorProps> = ({ patients: initialPatients, doctors, isLoading }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sortField, setSortField] = useState('checkInTime');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [patients, setPatients] = useState<any[]>([]);
  const [isOnline, setIsOnline] = useState(connectivityService.getStatus());

  // Update patients when initialPatients changes
  useEffect(() => {
    setPatients(initialPatients);
  }, [initialPatients]);

  // Monitor connectivity status
  useEffect(() => {
    const unsubscribe = connectivityService.addListener((online) => {
      setIsOnline(online);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Check for long wait times periodically
  useEffect(() => {
    const checkWaitTimes = () => {
      const now = new Date().getTime();
      patients.forEach(patient => {
        const waitTime = now - new Date(patient.checkInTime).getTime();
        const waitMinutes = waitTime / (1000 * 60);
        
        // Notify if wait time exceeds 60 minutes
        if (waitMinutes > 60) {
          const formattedTime = Math.floor(waitMinutes / 60) + ' hour(s) ' + 
            Math.floor(waitMinutes % 60) + ' minute(s)';
          notificationService.notifyLongWaitTime(patient.name, formattedTime);
        }
      });
    };

    const intervalId = setInterval(checkWaitTimes, 300000); // Check every 5 minutes
    
    return () => clearInterval(intervalId);
  }, [patients]);

  // Set up sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Filter and sort patients
  const getFilteredPatients = useCallback(() => {
    return patients
      .filter(patient => {
        // Filter by search term
        const matchesSearch = 
          patient.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.reason?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          patient.patientName?.toLowerCase().includes(searchTerm.toLowerCase());
        
        // Filter by priority
        const matchesPriority = 
          priorityFilter === 'all' || 
          patient.priority?.toLowerCase() === priorityFilter.toLowerCase() ||
          patient.conditionType?.toLowerCase() === priorityFilter.toLowerCase();
        
        return matchesSearch && matchesPriority;
      })
      .sort((a, b) => {
        // Sort by selected field
        if (sortField === 'checkInTime') {
          const timeA = new Date(a.checkInTime || a.createdAt).getTime();
          const timeB = new Date(b.checkInTime || b.createdAt).getTime();
          return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
        }
        
        if (sortField === 'priority') {
          const priorityValues = { 'high': 3, 'medium': 2, 'low': 1 };
          const priorityA = priorityValues[a.priority?.toLowerCase() || a.conditionType?.toLowerCase()] || 0;
          const priorityB = priorityValues[b.priority?.toLowerCase() || b.conditionType?.toLowerCase()] || 0;
          return sortDirection === 'asc' ? priorityA - priorityB : priorityB - priorityA;
        }
        
        if (sortField === 'name') {
          const nameA = a.name || a.patientName || '';
          const nameB = b.name || b.patientName || '';
          return sortDirection === 'asc' 
            ? nameA.localeCompare(nameB) 
            : nameB.localeCompare(nameA);
        }
        
        return 0;
      });
  }, [patients, searchTerm, priorityFilter, sortField, sortDirection]);

  const filteredPatients = getFilteredPatients();

  const handleSortChange = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleRemovePatient = async (patientId: string) => {
    try {
      const patientToRemove = patients.find(p => p.id === patientId);
      
      // Update local state immediately for better UX
      setPatients(prevPatients => prevPatients.filter(p => p.id !== patientId));
      
      if (isOnline) {
        // Call the API to remove patient
        const result = await queueService.skipPatient(patientId);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to remove patient');
        }
        
        // Notify
        if (patientToRemove) {
          notificationService.notifyPatientRemoved(patientToRemove.name || patientToRemove.patientName);
        }
      } else {
        // If offline, store in IndexedDB
        if (patientToRemove) {
          await indexedDBService.addPendingAction('remove', { patientId });
          notificationService.notifyOfflineAction(`Removing ${patientToRemove.name || patientToRemove.patientName}`);
        }
      }
      
      toast({
        title: 'Patient Removed',
        description: 'The patient has been removed from the queue.',
      });
    } catch (error) {
      console.error('Error removing patient:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove patient. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleChangePriority = async (patientId: string, newPriority: string) => {
    try {
      const patientToUpdate = patients.find(p => p.id === patientId);
      
      // Update local state immediately for better UX
      setPatients(prevPatients => prevPatients.map(p => 
        p.id === patientId ? { ...p, priority: newPriority, conditionType: newPriority } : p
      ));
      
      if (isOnline) {
        // Call the API to update priority
        const result = await receptionistService.updatePatientPriority(patientId, newPriority);
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to update priority');
        }
        
        // Notify
        if (patientToUpdate) {
          notificationService.notifyPriorityChanged(patientToUpdate.name || patientToUpdate.patientName, newPriority);
        }
      } else {
        // If offline, store in IndexedDB
        if (patientToUpdate) {
          await indexedDBService.addPendingAction('prioritize', { patientId, priority: newPriority });
          notificationService.notifyOfflineAction(`Changing ${patientToUpdate.name || patientToUpdate.patientName}'s priority`);
        }
      }
      
      toast({
        title: 'Priority Updated',
        description: `Patient priority changed to ${newPriority}.`,
      });
    } catch (error) {
      console.error('Error updating priority:', error);
      toast({
        title: 'Error',
        description: 'Failed to update priority. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleAssignDoctor = async (patientId: string, doctorId: string) => {
    try {
      const patientToAssign = patients.find(p => p.id === patientId);
      const doctor = doctors.find(d => d.id === doctorId);
      
      // Update local state immediately for better UX
      setPatients(prevPatients => prevPatients.filter(p => p.id !== patientId));
      
      if (isOnline) {
        // In a real app, this would call your API
        // await apiService.assignPatientToDoctor(patientId, doctorId);
        
        // Notify
        if (patientToAssign && doctor) {
          notificationService.notifyDoctorAssigned(patientToAssign.name, doctor.name);
        }
      } else {
        // If offline, store in IndexedDB
        if (patientToAssign && doctor) {
          await indexedDBService.addPendingAction('assign', { patientId, doctorId });
          notificationService.notifyOfflineAction(`Assigning ${patientToAssign.name} to ${doctor.name}`);
        }
      }
      
      toast({
        title: 'Patient Assigned',
        description: `Patient has been assigned to ${doctor?.name || 'doctor'}.`,
      });
    } catch (error) {
      console.error('Error assigning doctor:', error);
      toast({
        title: 'Error',
        description: 'Failed to assign doctor. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = patients.findIndex(p => p.id === active.id);
      const newIndex = patients.findIndex(p => p.id === over?.id);
      
      // Update local state immediately for better UX
      const newPatients = arrayMove(patients, oldIndex, newIndex);
      setPatients(newPatients);
      
      // If online, update the backend
      if (isOnline) {
        try {
          // Get the patient that was moved
          const movedPatient = patients[oldIndex];
          
          // Call the API to update the queue order
          queueService.updateQueueEntry(movedPatient.id, {
            queue_position: newIndex
          }).catch(error => {
            console.error('Error updating queue order:', error);
            // Revert to original order on error
            setPatients(patients);
            toast({
              title: 'Error',
              description: 'Failed to update queue order. Please try again.',
              variant: 'destructive',
            });
          });
        } catch (error) {
          console.error('Error updating queue order:', error);
        }
      } else {
        // If offline, store in IndexedDB
        indexedDBService.addPendingAction('reorder', { 
          patientId: active.id.toString(), 
          newPosition: newIndex 
        }).then(() => {
          notificationService.notifyOfflineAction('Queue order updated (offline)');
      });
      }
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Patient Queue</CardTitle>
          <CardDescription>Real-time view of waiting patients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Patient Queue</CardTitle>
        <CardDescription>Real-time view of waiting patients</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select
            value={priorityFilter}
            onValueChange={setPriorityFilter}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priorities</SelectItem>
              <SelectItem value="high">High Priority</SelectItem>
              <SelectItem value="medium">Medium Priority</SelectItem>
              <SelectItem value="low">Low Priority</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex items-center justify-end">
            <span className="mr-2 text-sm text-gray-500">
              {filteredPatients.length} patients in queue
            </span>
          </div>
        </div>
        
        {filteredPatients.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No patients match your filters
          </div>
        ) : (
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={filteredPatients.map(p => p.id)}
                strategy={verticalListSortingStrategy}
              >
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSortChange('priority')}
                      >
                        <div className="flex items-center">
                          Priority
                          {sortField === 'priority' && (
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer"
                        onClick={() => handleSortChange('name')}
                      >
                        <div className="flex items-center">
                          Patient
                          {sortField === 'name' && (
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead 
                        className="cursor-pointer w-[150px]"
                        onClick={() => handleSortChange('checkInTime')}
                      >
                        <div className="flex items-center">
                          Wait Time
                          {sortField === 'checkInTime' && (
                            <ArrowUpDown className="ml-1 h-4 w-4" />
                          )}
                        </div>
                      </TableHead>
                      <TableHead>Check-in Time</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPatients.map((patient) => (
                      <DraggableQueueItem
                        key={patient.id}
                        patient={patient}
                        onRemovePatient={handleRemovePatient}
                        onChangePriority={handleChangePriority}
                        onAssignDoctor={handleAssignDoctor}
                        doctors={doctors}
                      />
                    ))}
                  </TableBody>
                </Table>
              </SortableContext>
            </DndContext>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QueueMonitor; 