import React from 'react';
import { Loader } from './loader';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background">
      <Loader className="h-8 w-8 animate-spin text-primary" />
      <p className="mt-4 text-sm text-muted-foreground">{message}</p>
    </div>
  );
};

export default LoadingScreen; 