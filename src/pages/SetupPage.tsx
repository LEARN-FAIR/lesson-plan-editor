import React from 'react';
import { 
  Box, AppBar, Toolbar, Typography, Container, 
  CircularProgress, Alert, AlertTitle
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { generateLessonPlanUrl } from '../utils/urlUtils';
import githubRepoService, { Repository } from '../services/githubRepoService';
import lessonPlanService, { LessonPlan } from '../services/lessonPlanService';
import UserMenu from '../components/UserMenu';
import SetupStepper from '../components/SetupStepper';

const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSetupComplete = (repo: Repository, lessonPlan: LessonPlan) => {
    // Generate and navigate to the appropriate URL
    const url = generateLessonPlanUrl(repo, lessonPlan);
    navigate(url, { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Lesson Plan Editor - Setup
          </Typography>
          <UserMenu />
        </Toolbar>
      </AppBar>

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
