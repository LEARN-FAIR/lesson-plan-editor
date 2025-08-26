import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // No need to store path in session storage anymore as we'll use query params

  // Show loading indicator while checking authentication
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // If not authenticated, redirect to login with redirect_url query parameter
  if (!isAuthenticated) {
    // Encode the current path for redirect after login
    if (location.pathname !== '/login' && location.pathname !== '/github-callback') {
      const fullPath = location.pathname + 
        (location.search ? location.search : '') + 
        (location.hash ? location.hash : '');
      console.log('Redirecting to login with redirect_url:', fullPath);
      
      // Use query parameter instead of session storage
      const encodedRedirectUrl = encodeURIComponent(fullPath);
      return <Navigate to={`/login?redirect_url=${encodedRedirectUrl}`} replace />;
    }
    
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the protected content
  return <>{children}</>;
};

export default ProtectedRoute;
