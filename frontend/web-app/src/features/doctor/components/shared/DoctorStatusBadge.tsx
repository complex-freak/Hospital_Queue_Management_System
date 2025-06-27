import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface DoctorStatusBadgeProps {
  isAvailable: boolean;
  shiftStart?: string;
  shiftEnd?: string;
  className?: string;
}

const DoctorStatusBadge: React.FC<DoctorStatusBadgeProps> = ({
  isAvailable,
  shiftStart,
  shiftEnd,
  className = ''
}) => {
  if (isAvailable) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Badge className="bg-green-500 text-white hover:bg-green-600">
          Available
        </Badge>
        {shiftStart && shiftEnd && (
          <span className="flex items-center text-xs text-gray-500">
            <Clock className="mr-1 h-3 w-3" />
            {shiftStart} - {shiftEnd}
          </span>
        )}
      </div>
    );
  }
  
  return (
    <Badge className={`bg-gray-400 text-white hover:bg-gray-500 ${className}`}>
      Unavailable
    </Badge>
  );
};

export default DoctorStatusBadge; 