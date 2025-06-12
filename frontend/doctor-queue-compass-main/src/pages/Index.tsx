
import React from 'react';
import { Navigate } from 'react-router-dom';

// This component simply redirects to the login page
const Index = () => {
  return <Navigate to="/login" replace />;
};

export default Index;
