import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, CircularProgress, Typography, Alert, AlertTitle, Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import githubRepoService from '../services/githubRepoService';
import githubService from '../services/githubService';

interface RepositoryLoaderProps {
  children: React.ReactNode;
}

/**
 * Component that ensures repositories are loaded before rendering children
 * Particularly useful for direct navigation to editor URLs
 */
const RepositoryLoader: React.FC<RepositoryLoaderProps> = ({ children }) => {
  const navigate = useNavigate();
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  
  // Query to fetch repositories
  const { data: repositories, isLoading, isError, error } = useQuery({
    queryKey: ['repositories'],
    queryFn: async () => {
      if (!githubService.isAuthenticated()) {
        throw new Error('Not authenticated with GitHub');
      }
      return await githubRepoService.getTargetRepoAndForks();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1,
  });

  // If we're loading repositories, show a loading spinner
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        {owner && repo && (
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading repository {owner}/{repo}...
          </Typography>
        )}
      </Box>
    );
  }

  // If there was an error loading repositories
  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Error Loading Repositories</AlertTitle>
          {error instanceof Error ? error.message : 'Unknown error occurred'}
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go to Home
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  // If we have repositories and we're trying to access a specific repo
  if (repositories && owner && repo) {
    // Check if the repository exists
    const selectedRepo = repositories.find(r => 
      r.owner.login.toLowerCase() === owner.toLowerCase() && 
      r.name.toLowerCase() === repo.toLowerCase()
    );

    // If the repository doesn't exist
    if (!selectedRepo) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <AlertTitle>Repository Not Found</AlertTitle>
            Repository {owner}/{repo} not found or you don't have access to it.
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => navigate('/')}>
                Go to Repository Selection
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }

    // Set the selected repository in the service
    githubRepoService.setSelectedRepo(selectedRepo);
  }

  // If everything is loaded and valid, render children
  return <>{children}</>;
};

export default RepositoryLoader;
