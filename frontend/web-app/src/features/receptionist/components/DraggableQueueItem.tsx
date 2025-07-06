import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  AlertTriangle, 
  UserX, 
  GripVertical,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  UserCheck
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Patient {
  id: string;
  name?: string;
  patientName?: string;
  reason?: string;
  conditionType?: string;
  priority?: string;
  checkInTime?: string;
  createdAt?: string;
}

interface Doctor {
  id: string;
  name: string;
  isAvailable: boolean;
}

interface DraggableQueueItemProps {
  patient: Patient;
  onRemovePatient: (id: string) => void;
  onChangePriority: (id: string, priority: string) => void;
  onAssignDoctor: (patientId: string, doctorId: string) => void;
  doctors: Doctor[];
}

const DraggableQueueItem: React.FC<DraggableQueueItemProps> = ({
  patient,
  onRemovePatient,
  onChangePriority,
  onAssignDoctor,
  doctors
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: patient.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
    position: 'relative' as const,
  };

  // Handle both legacy priority and new conditionType from API
  const getPriority = () => {
    // First check if we have a direct priority field
    if (patient.priority) return patient.priority;
    
    // Then check for conditionType (from transformed data)
    if (patient.conditionType) {
      // Map conditionType to priority
      switch (patient.conditionType.toLowerCase()) {
        case 'emergency': return 'high';
        case 'elderly': return 'high';
        case 'child': return 'medium';
        case 'normal': return 'low';
        default: return 'medium';
      }
    }
    
    // Fallback to medium priority
    return 'medium';
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
      case 'emergency':
      case 'elderly':
        return <Badge variant="destructive" className="font-medium">High</Badge>;
      case 'medium':
      case 'child':
        return <Badge variant="default" className="bg-amber-500 font-medium">Medium</Badge>;
      case 'low':
      case 'normal':
        return <Badge variant="outline" className="text-blue-600 font-medium">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getWaitTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: false });
    } catch (error) {
      return 'Unknown';
    }
  };

  // Calculate wait time severity (for visual indicators)
  const getWaitTimeSeverity = (timestamp: string) => {
    try {
      const waitMinutes = (new Date().getTime() - new Date(timestamp).getTime()) / (1000 * 60);
      
      if (waitMinutes > 60) return 'severe'; // Over 1 hour
      if (waitMinutes > 30) return 'warning'; // Over 30 minutes
      return 'normal';
    } catch (error) {
      return 'normal';
    }
  };

  const handleIncreasePriority = () => {
    const currentPriority = getPriority().toLowerCase();
    if (currentPriority === 'low' || currentPriority === 'normal') {
      onChangePriority(patient.id, 'medium');
    } else if (currentPriority === 'medium' || currentPriority === 'child') {
      onChangePriority(patient.id, 'high');
    }
  };

  const handleDecreasePriority = () => {
    const currentPriority = getPriority().toLowerCase();
    if (currentPriority === 'high' || currentPriority === 'emergency' || currentPriority === 'elderly') {
      onChangePriority(patient.id, 'medium');
    } else if (currentPriority === 'medium' || currentPriority === 'child') {
      onChangePriority(patient.id, 'low');
    }
  };

  // Get the appropriate timestamp (checkInTime for legacy, createdAt for API)
  const timestamp = patient.checkInTime || patient.createdAt;
  const waitTimeSeverity = getWaitTimeSeverity(timestamp);
  const currentPriority = getPriority().toLowerCase();
  
  // Get patient name (handle both legacy and transformed data)
  const patientName = patient.name || patient.patientName || 'Unknown Patient';
  
  // Get reason (handle both legacy and transformed data)
  const reason = patient.reason || (patient.conditionType ? `${patient.conditionType} condition` : 'General consultation');
  
  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={isDragging ? 'bg-gray-50' : ''}
    >
      <TableCell>
        <div className="flex items-center">
          <div 
            {...attributes} 
            {...listeners}
            className="mr-2 cursor-grab touch-none"
          >
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          {getPriorityBadge(getPriority())}
        </div>
      </TableCell>
      <TableCell className="font-medium">{patientName}</TableCell>
      <TableCell>{reason}</TableCell>
      <TableCell>
        <div className="flex items-center">
          {waitTimeSeverity === 'severe' && (
            <AlertTriangle className="mr-1 h-4 w-4 text-red-500" />
          )}
          {waitTimeSeverity === 'warning' && (
            <Clock className="mr-1 h-4 w-4 text-amber-500" />
          )}
          {waitTimeSeverity === 'normal' && (
            <Clock className="mr-1 h-4 w-4 text-gray-400" />
          )}
          <span className={
            waitTimeSeverity === 'severe' 
              ? 'font-medium text-red-600' 
              : waitTimeSeverity === 'warning'
                ? 'font-medium text-amber-600'
                : ''
          }>
            {getWaitTime(timestamp)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {format(new Date(timestamp), 'h:mm a')}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIncreasePriority}
              disabled={currentPriority === 'high' || currentPriority === 'emergency' || currentPriority === 'elderly'}
              className="h-6 px-2"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDecreasePriority}
              disabled={currentPriority === 'low' || currentPriority === 'normal'}
              className="h-6 px-2"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => onRemovePatient(patient.id)}
              >
                <UserX className="mr-2 h-4 w-4" />
                Remove from Queue
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Assign Doctor Button */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="border-blue-300 text-blue-700 hover:bg-blue-50"
              >
                <UserCheck className="mr-1 h-3 w-3" />
                Assign
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Assign to Doctor</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {doctors.length === 0 ? (
                <DropdownMenuItem disabled>
                  No doctors available
                </DropdownMenuItem>
              ) : (
                doctors.map(doctor => (
                  <DropdownMenuItem
                    key={doctor.id}
                    onClick={() => onAssignDoctor(patient.id, doctor.id)}
                    disabled={!doctor.isAvailable}
                    className={!doctor.isAvailable ? 'opacity-50' : ''}
                  >
                    {doctor.name}
                    {!doctor.isAvailable && ' (Unavailable)'}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default DraggableQueueItem; 