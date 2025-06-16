import React, { useState, useEffect } from 'react';
import { connectivityService } from '@/services/connectivity/connectivityService';
import { Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConnectivityStatusProps {
  className?: string;
}

const ConnectivityStatus: React.FC<ConnectivityStatusProps> = ({ className }) => {
  const [isOnline, setIsOnline] = useState(connectivityService.getStatus());
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    // Add listener for connectivity changes
    const unsubscribe = connectivityService.addListener((online) => {
      setIsOnline(online);
      if (!online) {
        setShowOfflineMessage(true);
        // Hide the message after 5 seconds
        setTimeout(() => setShowOfflineMessage(false), 5000);
      }
    });

    // Start periodic sync
    connectivityService.startPeriodicSync();

    // Cleanup on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <div className="flex items-center">
        {isOnline ? (
          <Wifi className="h-5 w-5 text-green-500" />
        ) : (
          <WifiOff className="h-5 w-5 text-red-500" />
        )}
        <span className="ml-2 text-sm">
          {isOnline ? 'Online' : 'Offline'}
        </span>
      </div>
      
      {/* Offline message popup */}
      {showOfflineMessage && !isOnline && (
        <div className="absolute top-full right-0 mt-2 w-64 rounded-md bg-red-50 p-3 shadow-lg z-50">
          <div className="flex items-start">
            <WifiOff className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-800">
                You are offline
              </p>
              <p className="mt-1 text-xs text-red-700">
                Changes will be saved locally and synced when your connection is restored.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Online message popup */}
      {showOfflineMessage && isOnline && (
        <div className="absolute top-full right-0 mt-2 w-64 rounded-md bg-green-50 p-3 shadow-lg z-50">
          <div className="flex items-start">
            <Wifi className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">
                You are back online
              </p>
              <p className="mt-1 text-xs text-green-700">
                Your changes are being synced with the server.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectivityStatus; 