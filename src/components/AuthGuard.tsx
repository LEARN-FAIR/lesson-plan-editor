import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Box, Button, Typography, Paper, Container, CircularProgress, Avatar } from '@mui/material';
import githubService from '../services/githubService';

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Check if the user is already authenticated
    const checkAuth = async () => {
      try {
        const isAuth = githubService.isAuthenticated();
        setIsAuthenticated(isAuth);
        
        if (isAuth) {
          // Try to get user info if authenticated
          try {
            const userInfo = await githubService.getCurrentUser();
            setUser(userInfo);
          } catch (userError) {
            console.error('Error fetching user info:', userError);
          }
        }
      } catch (error) {
        console.error('Authentication check failed:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, []);

  const handleLogin = () => {
    githubService.redirectToGitHub();
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="h6">Checking authentication...</Typography>
      </Box>
    );
  }

  // If authenticated, render the children components
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // If not authenticated, show login screen
  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper elevation={3} sx={{ p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h4" component="h1" color="white" gutterBottom>
          FAIR Lesson Plan Editor
        </Typography>
        <Typography variant="body1" paragraph>
          Please sign in with GitHub to use the application.
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleLogin}
          size="large"
          sx={{ mt: 2 }}
        >
          Sign in with GitHub
        </Button>
      </Paper>
    </Container>
  );
};

export default AuthGuard;
