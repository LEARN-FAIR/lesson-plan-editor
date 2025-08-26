import React from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {Box, CircularProgress, Typography} from '@mui/material';
import {useAuth} from '../contexts/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading, setRedirectPath } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6">Checking authentication...</Typography>
      </Box>
    );
  }

  // If not authenticated, redirect to login and save the current path
  if (!isAuthenticated) {
    // Store the current path for redirect after login
    setRedirectPath(location.pathname);
    
    // Redirect to login page
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If authenticated, render the children components
  return <>{children}</>;
};

export default AuthGuard;
