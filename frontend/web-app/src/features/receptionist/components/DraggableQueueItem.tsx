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
  MoreVertical
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

interface DraggableQueueItemProps {
  patient: any;
  onRemovePatient: (id: string) => void;
  onChangePriority: (id: string, priority: string) => void;
  onAssignDoctor: (patientId: string, doctorId: string) => void;
  doctors: any[];
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

  const getPriorityBadge = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive" className="font-medium">High</Badge>;
      case 'medium':
        return <Badge variant="default" className="bg-amber-500 font-medium">Medium</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-blue-600 font-medium">Low</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  const getWaitTime = (checkInTime: string) => {
    try {
      return formatDistanceToNow(new Date(checkInTime), { addSuffix: false });
    } catch (error) {
      return 'Unknown';
    }
  };

  // Calculate wait time severity (for visual indicators)
  const getWaitTimeSeverity = (checkInTime: string) => {
    try {
      const waitMinutes = (new Date().getTime() - new Date(checkInTime).getTime()) / (1000 * 60);
      
      if (waitMinutes > 60) return 'severe'; // Over 1 hour
      if (waitMinutes > 30) return 'warning'; // Over 30 minutes
      return 'normal';
    } catch (error) {
      return 'normal';
    }
  };

  const handleIncreasePriority = () => {
    const currentPriority = patient.priority.toLowerCase();
    if (currentPriority === 'low') {
      onChangePriority(patient.id, 'medium');
    } else if (currentPriority === 'medium') {
      onChangePriority(patient.id, 'high');
    }
  };

  const handleDecreasePriority = () => {
    const currentPriority = patient.priority.toLowerCase();
    if (currentPriority === 'high') {
      onChangePriority(patient.id, 'medium');
    } else if (currentPriority === 'medium') {
      onChangePriority(patient.id, 'low');
    }
  };

  const waitTimeSeverity = getWaitTimeSeverity(patient.checkInTime);
  const currentPriority = patient.priority.toLowerCase();
  
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
          {getPriorityBadge(patient.priority)}
        </div>
      </TableCell>
      <TableCell className="font-medium">{patient.name}</TableCell>
      <TableCell>{patient.reason}</TableCell>
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
            {getWaitTime(patient.checkInTime)}
          </span>
        </div>
      </TableCell>
      <TableCell>
        {format(new Date(patient.checkInTime), 'h:mm a')}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end space-x-2">
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleIncreasePriority}
              disabled={currentPriority === 'high'}
              className="h-6 px-2"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDecreasePriority}
              disabled={currentPriority === 'low'}
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
              
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Assign to Doctor</DropdownMenuLabel>
              {doctors.map(doctor => (
                <DropdownMenuItem
                  key={doctor.id}
                  onClick={() => onAssignDoctor(patient.id, doctor.id)}
                  disabled={!doctor.isAvailable}
                  className={!doctor.isAvailable ? 'opacity-50' : ''}
                >
                  {doctor.name}
                  {!doctor.isAvailable && ' (Unavailable)'}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

export default DraggableQueueItem; 