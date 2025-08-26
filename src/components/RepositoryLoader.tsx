import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Box, CircularProgress, Typography, Alert, AlertTitle, Button } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import githubRepoService from '../services/githubRepoService';
import githubService from '../services/githubService';
import lessonPlanService from '../services/lessonPlanService';
import { constructLessonPath } from '../utils/urlUtils';

interface RepositoryLoaderProps {
  children: React.ReactNode;
}

/**
 * Component that ensures repositories are loaded before rendering children
 * Particularly useful for direct navigation to editor URLs
 */
const RepositoryLoader: React.FC<RepositoryLoaderProps> = ({ children }) => {
  const navigate = useNavigate();
  const { owner, repo, branch, category, lesson } = useParams<{ 
    owner: string; 
    repo: string;
    branch: string;
    category: string;
    lesson: string;
  }>();
  
  // Construct the lesson path if category and lesson are available
  const fullLessonPath = category && lesson ? constructLessonPath(category, lesson) : '';
  
  // Query to fetch repositories
  const { data: repositories, isLoading: isLoadingRepos, isError: isReposError, error: reposError } = useQuery({
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
  
  // Query to fetch lesson plan content if we have a path
  const { data: lessonPlanData, isLoading: isLoadingLessonPlan, isError: isLessonPlanError, error: lessonPlanError } = useQuery({
    queryKey: ['lessonPlanContent', fullLessonPath],
    queryFn: async () => {
      console.log('RepositoryLoader: Fetching lesson plan content for path:', fullLessonPath);
      const data = await lessonPlanService.getLessonPlan(fullLessonPath);
      console.log('RepositoryLoader: Lesson plan data fetched:', data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2, // Retry up to 2 times
    enabled: !!fullLessonPath && !!owner && !!repo, // Only fetch when we have a path and repository info
  });
  
  // Combine loading states
  const isLoading = isLoadingRepos || (isLoadingLessonPlan && !!fullLessonPath);
  
  // Combine error states
  const isError = isReposError || (isLessonPlanError && !!fullLessonPath);
  const error = reposError || (fullLessonPath ? lessonPlanError : null);

  // If we're loading repositories or lesson plan, show a loading spinner
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        {owner && repo && (
          <Typography variant="h6" sx={{ mt: 2 }}>
            {isLoadingRepos ? `Loading repository ${owner}/${repo}...` : ''}
            {isLoadingLessonPlan && fullLessonPath ? `Loading lesson plan ${category}/${lesson}...` : ''}
          </Typography>
        )}
      </Box>
    );
  }

  // If there was an error loading repositories or lesson plan
  if (isError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>
            {isReposError ? 'Error Loading Repositories' : ''}
            {isLessonPlanError ? 'Error Loading Lesson Plan' : ''}
          </AlertTitle>
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
    
    // Set the selected branch if provided
    if (branch) {
      githubRepoService.setSelectedBranch(branch);
    }
    
    // If we have lesson plan data, set it in the service
    if (lessonPlanData) {
      console.log('RepositoryLoader: Setting lesson plan in service:', lessonPlanData);
      lessonPlanService.setSelectedLessonPlan(lessonPlanData);
      
      // Make sure the lesson plan has decoded content
      if (!lessonPlanData.decoded_content) {
        console.error('RepositoryLoader: Lesson plan has no decoded content');
        return (
          <Box sx={{ p: 3 }}>
            <Alert severity="error">
              <AlertTitle>Lesson Plan Error</AlertTitle>
              The lesson plan was found but has no content.
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => navigate('/')}>
                  Go to Repository Selection
                </Button>
              </Box>
            </Alert>
          </Box>
        );
      }
    } else if (fullLessonPath && !isLoadingLessonPlan && isLessonPlanError) {
      // If we have a lesson path but couldn't load the lesson plan
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error">
            <AlertTitle>Lesson Plan Not Found</AlertTitle>
            Could not load lesson plan {category}/{lesson}.
            <Box sx={{ mt: 2 }}>
              <Button variant="contained" onClick={() => navigate('/')}>
                Go to Repository Selection
              </Button>
            </Box>
          </Alert>
        </Box>
      );
    }
  }

  // If everything is loaded and valid, render children
  return <>{children}</>;
};

export default RepositoryLoader;
