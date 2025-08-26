import React from 'react';
import { 
  Box, Typography, Container, 
  CircularProgress, Alert, AlertTitle
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { generateLessonPlanUrl } from '../utils/urlUtils';
import githubRepoService, { Repository } from '../services/githubRepoService';
import lessonPlanService, { LessonPlan } from '../services/lessonPlanService';
import { useRepositoriesAndForks } from '../services/githubRepoQueryHooks';
import { useLessonPlans } from '../services/lessonPlanQueryHooks';
import UserMenu from '../components/navigation/UserMenu';
import SetupStepper from '../components/SetupStepper';
import StyledAppBar from '../components/navigation/StyledAppBar';

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Use React Query to fetch repositories
  const { 
    isLoading: isLoadingRepos,
    error: reposError
  } = useRepositoriesAndForks();
  
  // Use React Query to fetch lesson plans
  const {
    isLoading: isLoadingLessonPlans,
    error: lessonPlansError
  } = useLessonPlans();
  
  // Combine loading states
  const loading = isLoadingRepos || isLoadingLessonPlans;
  
  // Combine error states
  const error = 
    (reposError ? (reposError as Error).message : null) || 
    (lessonPlansError ? (lessonPlansError as Error).message : null);

  const handleSetupComplete = (repo: Repository, lessonPlan: LessonPlan) => {
    // Get the selected branch
    const selectedBranch = githubRepoService.getSelectedBranch() || undefined;
    
    // Store minimal selections in services for EditorPage to use
    githubRepoService.setSelectedRepo(repo);
    lessonPlanService.setSelectedLessonPlan(lessonPlan);
    
    // Generate and navigate to the appropriate URL
    // EditorPage will handle all loading
    const url = generateLessonPlanUrl(repo, lessonPlan, selectedBranch);
    console.log('Navigating to editor with URL:', url);
    navigate(url);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <StyledAppBar>
        <Typography variant="h6" component="div" color="white" sx={{ flexGrow: 1 }}>
          Lesson Plan Editor
        </Typography>
        <UserMenu />
      </StyledAppBar>

      <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            <SetupStepper onComplete={handleSetupComplete} />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export default SetupPage;
