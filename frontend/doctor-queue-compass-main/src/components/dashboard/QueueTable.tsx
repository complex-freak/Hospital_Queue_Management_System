
import React, { useState } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader } from '@/components/ui/loader';
import { apiService } from '@/services/api';
import { toast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { BadgeCheck, SkipForward, Bell } from 'lucide-react';

interface Patient {
  id: string;
  name: string;
  reason: string;
  checkInTime: string;
  priority: 'Low' | 'Medium' | 'High';
}

interface QueueTableProps {
  patients: Patient[];
  isLoading: boolean;
  onPatientSeen: (id: string) => void;
  onPatientSkipped: (id: string) => void;
  refreshQueue: () => void;
}

const getPriorityClass = (priority: string) => {
  switch (priority) {
    case 'High':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'Medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'Low':
      return 'bg-green-100 text-green-800 border-green-300';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const QueueTable: React.FC<QueueTableProps> = ({ 
  patients, 
  isLoading, 
  onPatientSeen, 
  onPatientSkipped,
  refreshQueue 
}) => {
  const [notificationPatient, setNotificationPatient] = useState<Patient | null>(null);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const handleNotification = (patient: Patient) => {
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

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader className="h-8 w-8 text-primary" />
        <span className="ml-2 text-gray-500">Loading patient queue...</span>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <div className="text-3xl font-light text-gray-400">No patients in queue</div>
        <p className="mt-2 text-gray-500">Your queue is currently empty. Enjoy the quiet moment!</p>
      </div>
    );
  }

  return (
    <>
      <div className="relative overflow-hidden rounded-md border shadow-sm">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[100px]">Patient ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="hidden md:table-cell">Reason for Visit</TableHead>
              <TableHead className="hidden md:table-cell">Check-In Time</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {patients.map((patient) => (
              <TableRow key={patient.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{patient.id}</TableCell>
                <TableCell>{patient.name}</TableCell>
                <TableCell className="hidden max-w-xs truncate md:table-cell">
                  {patient.reason}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  {format(new Date(patient.checkInTime), 'h:mm a')}
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
                      onClick={() => onPatientSeen(patient.id)}
                      className="text-green-600 hover:bg-green-50 hover:text-green-700"
                    >
                      <BadgeCheck className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Seen</span>
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
                      className="text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Bell className="mr-1 h-4 w-4" />
                      <span className="hidden sm:inline">Notify</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
    </>
  );
};

export default QueueTable;
