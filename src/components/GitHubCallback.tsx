import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL query params
        const searchParams = new URLSearchParams(location.search);
        const code = searchParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code received from GitHub');
        }
        
        // Exchange code for token
        await githubService.handleAuthCallback(code);
        
        // Redirect back to editor after successful authentication
        setTimeout(() => {
          navigate('/');
        }, 2000);
      } catch (err) {
        console.error('GitHub OAuth callback error:', err);
        setError(`Authentication failed: ${(err as Error).message}`);
      }
    };

    handleCallback();
  }, [location.search, navigate]);

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
