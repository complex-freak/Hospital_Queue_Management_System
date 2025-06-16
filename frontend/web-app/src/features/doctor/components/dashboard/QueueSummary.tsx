
import React from 'react';
import { format, differenceInMinutes } from 'date-fns';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Users } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  reason: string;
  checkInTime: string;
  priority: string;
}

interface QueueSummaryProps {
  patients: Patient[];
}

const QueueSummary: React.FC<QueueSummaryProps> = ({ patients }) => {
  const calculateAverageWaitTime = (): number => {
    if (patients.length === 0) return 0;
    
    const totalWaitTime = patients.reduce((acc, patient) => {
      const waitMinutes = differenceInMinutes(
        new Date(),
        new Date(patient.checkInTime)
      );
      return acc + waitMinutes;
    }, 0);
    
    return Math.round(totalWaitTime / patients.length);
  };
  
  const averageWaitTime = calculateAverageWaitTime();
  
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card className="bg-blue-50 hover:bg-blue-100 transition-colors">
        <CardContent className="flex items-center p-6">
          <Users className="h-10 w-10 text-blue-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-blue-600">Queue Length</p>
            <h3 className="text-3xl font-bold text-blue-700">
              {patients.length} {patients.length === 1 ? 'Patient' : 'Patients'}
            </h3>
          </div>
        </CardContent>
      </Card>
      
      <Card className="bg-teal-50 hover:bg-teal-100 transition-colors">
        <CardContent className="flex items-center p-6">
          <Clock className="h-10 w-10 text-teal-600" />
          <div className="ml-4">
            <p className="text-sm font-medium text-teal-600">Average Wait Time</p>
            <h3 className="text-3xl font-bold text-teal-700">
              {averageWaitTime} {averageWaitTime === 1 ? 'minute' : 'minutes'}
            </h3>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QueueSummary;
