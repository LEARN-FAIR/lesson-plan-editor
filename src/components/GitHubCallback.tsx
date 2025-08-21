import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Box, Typography, CircularProgress, Paper } from '@mui/material';
import githubService from '../services/githubService';

/**
 * Component to handle GitHub OAuth callback.
 * This component should be rendered at the /github-callback route.
 */
const GitHubCallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);
  const processed = useRef<boolean>(false);

  useEffect(() => {
    // Only process once per component mount
    if (processed.current) {
      return;
    }

    const handleCallback = async () => {
      // If already processing, don't try again
      if (processing) {
        return;
      }

      try {
        setProcessing(true);
        processed.current = true;
        
        // Get the code from URL query params
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code received from GitHub');
        }
        
        // Check if we already have a token in session storage
        if (sessionStorage.getItem('github_oauth_token')) {
          console.log('Already authenticated, redirecting to editor');
          navigate('/');
          return;
        }
        
        // Exchange code for token
        await githubService.handleAuthCallback(code);
        
        // Clear the code from the URL to prevent reprocessing on refresh
        window.history.replaceState({}, document.title, '/github-callback');
        
        // Redirect back to editor after successful authentication
        setTimeout(() => {
          navigate('/');
        }, 1500);
      } catch (err) {
        console.error('GitHub OAuth callback error:', err);
        setError(`Authentication failed: ${(err as Error).message}`);
        setProcessing(false);
      }
    };

    // Execute the callback handler once
    handleCallback();
  }, []);

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
