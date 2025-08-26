import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress, Paper, Button } from '@mui/material';
import githubService from '../services/githubService';
import { useAuth } from '../contexts/AuthContext';

/**
 * Component to handle GitHub OAuth callback.
 * This component should be rendered at the /github-callback route.
 */
const GitHubCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const processed = useRef<boolean>(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);

  // Get the redirect URL when component mounts
  useEffect(() => {
    // First try to get from session storage (set by LoginPage)
    const storedUrl = sessionStorage.getItem('redirect_url');
    if (storedUrl) {
      console.log('Found stored redirect URL:', storedUrl);
      setRedirectUrl(storedUrl);
      // Clear it after reading
      sessionStorage.removeItem('redirect_url');
    } else {
      console.log('No stored redirect URL, will use default');
      setRedirectUrl('/');
    }
  }, []);

  // Handle the OAuth callback
  useEffect(() => {
    // Only process once per component mount
    if (processed.current) {
      console.log('Already processed OAuth callback, skipping');
      return;
    }

    const handleCallback = async () => {
      // If already processing, don't try again
      if (processing) {
        console.log('Already processing OAuth callback, skipping');
        return;
      }

      try {
        console.log('Starting GitHub OAuth callback processing');
        setProcessing(true);
        processed.current = true;
        
        // Get the code from URL query params
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code received from GitHub');
        }
        
        console.log('Exchanging GitHub code for token');
        // Exchange code for token
        await githubService.handleAuthCallback(code);
        console.log('Successfully exchanged code for token');
        
        // Clear the code from the URL to prevent reprocessing on refresh
        window.history.replaceState({}, document.title, '/github-callback');
        
        // Wait a bit to ensure the token is properly stored and auth state is updated
        setTimeout(() => {
          // Directly check if authenticated using the service
          const isAuth = githubService.isAuthenticated();
          console.log('Authentication state after token exchange:', isAuth ? 'authenticated' : 'not authenticated');
          
          // If we have a redirect URL, use it, otherwise go to home
          if (redirectUrl) {
            try {
              const decodedUrl = decodeURIComponent(redirectUrl);
              console.log('Redirecting to:', decodedUrl);
              window.location.href = decodedUrl; // Use direct location change instead of navigate
            } catch (error) {
              console.error('Error decoding redirect URL:', error);
              window.location.href = redirectUrl; // Use direct location change instead of navigate
            }
          } else {
            console.log('No redirect URL found, going to home page');
            window.location.href = '/'; // Use direct location change instead of navigate
          }
        }, 1500); // Increased timeout to ensure auth state is updated
        
      } catch (err) {
        console.error('GitHub OAuth callback error:', err);
        setError(`Authentication failed: ${(err as Error).message}`);
        setProcessing(false);
      }
    };

    // Execute the callback handler once
    handleCallback();
  }, [location, processing, redirectUrl]);
  
  // No manual redirect function needed anymore

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        p: 3
      }}
    >
      <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
        {error ? (
          <>
            <Typography variant="h5" color="error" gutterBottom>
              Authentication Error
            </Typography>
            <Typography color="text.secondary">{error}</Typography>
            <Box sx={{ mt: 2 }}>
              <Typography>
                <a href="/" style={{ textDecoration: 'none' }}>Return to the editor</a>
              </Typography>
            </Box>
          </>
        ) : (
          <>
            <CircularProgress size={60} sx={{ mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Completing GitHub Authentication
            </Typography>
            <Typography color="text.secondary">
              You'll be redirected back to the editor in a moment...
            </Typography>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default GitHubCallback;
