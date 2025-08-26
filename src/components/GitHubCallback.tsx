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
    // First try to get from local storage (set by LoginPage)
    const storedUrl = localStorage.getItem('redirect_url');
    if (storedUrl) {
      console.log('Found stored redirect URL:', storedUrl);
      setRedirectUrl(storedUrl);
      // Don't clear it yet, we'll need it in the callback handler
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
        
        // Get the code and state from URL query params
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        
        if (!code) {
          throw new Error('No authorization code received from GitHub');
        }
        
        console.log('Received state parameter:', state);
        
        // The state parameter contains our redirect URL
        // But we'll let the server decode it for us
        console.log('Using session storage redirect URL as fallback:', redirectUrl);
        
        console.log('Exchanging GitHub code for token');
        // Exchange code for token and get redirect URL from server response
        const serverRedirectUrl = await githubService.handleAuthCallback(code, state || undefined);
        console.log('Successfully exchanged code for token');
        
        // If we got a redirect URL from the server, use it instead of the stored one
        if (serverRedirectUrl) {
          console.log('Using redirect URL from server response:', serverRedirectUrl);
          setRedirectUrl(serverRedirectUrl);
        }
        
        // Clear the code from the URL to prevent reprocessing on refresh
        window.history.replaceState({}, document.title, '/github-callback');
        
        // Wait a bit to ensure the token is properly stored and auth state is updated
        setTimeout(() => {
          // Directly check if authenticated using the service
          const isAuth = githubService.isAuthenticated();
          console.log('Authentication state after token exchange:', isAuth ? 'authenticated' : 'not authenticated');
          
          // Get the final redirect URL to use
          // Check local storage again in case it was updated
          const sessionRedirectUrl = localStorage.getItem('redirect_url');
          console.log('Session storage redirect URL at redirect time:', sessionRedirectUrl);
          
          // If we have a complex editor URL in session storage, prioritize it
          const isEditorUrl = sessionRedirectUrl && sessionRedirectUrl.startsWith('/editor/');
          
          // Always prioritize local storage for authenticated users
          const finalRedirectUrl = sessionRedirectUrl || serverRedirectUrl || redirectUrl || '/';
          console.log('Final redirect URL decision:', { 
            serverRedirectUrl, 
            redirectUrl,
            sessionRedirectUrl,
            isEditorUrl,
            finalRedirectUrl 
          });
          
          // Now clear the local storage
          localStorage.removeItem('redirect_url');
          
          try {
            const decodedUrl = decodeURIComponent(finalRedirectUrl);
            console.log('Redirecting to:', decodedUrl);
            window.location.href = decodedUrl; // Use direct location change instead of navigate
          } catch (error) {
            console.error('Error decoding redirect URL:', error);
            window.location.href = finalRedirectUrl; // Use direct location change instead of navigate
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
