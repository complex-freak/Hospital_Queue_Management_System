import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users, Clock, AlertTriangle, UserCheck } from 'lucide-react';

interface QueueStatsProps {
  patients: any[];
  doctors: any[];
  queueStats?: {
    total_waiting: number;
    average_wait_time: number;
    high_priority_count: number;
    available_doctors: number;
    total_doctors: number;
  } | null;
}

const QueueStats: React.FC<QueueStatsProps> = ({ patients, doctors, queueStats }) => {
  // Calculate summary statistics from patients array if queueStats is not available
  const totalPatients = queueStats?.total_waiting ?? patients.length;
  
  const highPriorityCount = queueStats?.high_priority_count ?? patients.filter(
    patient => patient.priority?.toLowerCase() === 'high' || patient.conditionType?.toLowerCase() === 'high'
  ).length;
  
  // Calculate average wait time in minutes
  const calculateAverageWaitTime = () => {
    if (queueStats?.average_wait_time !== undefined) {
      return queueStats.average_wait_time;
    }
    
    if (patients.length === 0) return 0;
    
    const now = new Date();
    const totalWaitMinutes = patients.reduce((total, patient) => {
      const checkInTime = new Date(patient.checkInTime || patient.createdAt);
      const waitTimeMinutes = (now.getTime() - checkInTime.getTime()) / (1000 * 60);
      return total + waitTimeMinutes;
    }, 0);
    
    return Math.round(totalWaitMinutes / patients.length);
  };
  
  const averageWaitMinutes = calculateAverageWaitTime();
  
  // Format wait time for display
  const formatWaitTime = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}h ${remainingMinutes}m`;
    }
  };

  // Count available doctors
  const availableDoctors = queueStats?.available_doctors ?? doctors.filter(doctor => doctor.isAvailable).length;
  const totalDoctors = queueStats?.total_doctors ?? doctors.length;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="flex items-center p-4">
          <div className="rounded-full bg-blue-100 p-2">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Waiting Patients</p>
            <h3 className="text-xl font-bold">{totalPatients}</h3>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex items-center p-4">
          <div className="rounded-full bg-amber-100 p-2">
            <Clock className="h-5 w-5 text-amber-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Average Wait Time</p>
            <h3 className="text-xl font-bold">{formatWaitTime(averageWaitMinutes)}</h3>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex items-center p-4">
          <div className="rounded-full bg-red-100 p-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">High Priority</p>
            <h3 className="text-xl font-bold">{highPriorityCount}</h3>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="flex items-center p-4">
          <div className="rounded-full bg-green-100 p-2">
            <UserCheck className="h-5 w-5 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">Available Doctors</p>
            <h3 className="text-xl font-bold">{availableDoctors} / {totalDoctors}</h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QueueStats; 