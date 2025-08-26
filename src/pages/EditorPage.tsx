import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Box, Typography, Button, Container, 
  CircularProgress, Alert, AlertTitle, 
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar,
  Stack,
  Divider
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { useNavigate, useParams, Navigate } from 'react-router-dom';
import { extractLessonPathParts, generateLessonPlanUrl, constructLessonPath } from '../utils/urlUtils';
import githubRepoService, { Repository } from '../services/githubRepoService';
import githubService from '../services/githubService';
import lessonPlanService, { LessonPlan } from '../services/lessonPlanService';
import { useRepositoriesAndForks } from '../services/githubRepoQueryHooks';
import { useLessonPlanContent } from '../services/lessonPlanQueryHooks';
import { exportMarkdownFile } from '../services/markdownService';
import Editor from '../components/Editor';
import UserMenu from '../components/UserMenu';
import StyledAppBar from '../components/StyledAppBar';
import GitHubCommitButton from '../components/GitHubCommitButton';
import { getCurrentFilename } from '../services/markdownService';

const EditorPage: React.FC = () => {
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const navigate = useNavigate();
  const params = useParams();
  const { owner, repo, branch, category, lesson } = params;
  
  // React Query client for invalidation
  const queryClient = useQueryClient();
  
  // Construct the lesson path using the category and lesson from URL
  const fullLessonPath = category && lesson ? constructLessonPath(category, lesson) : '';
  
  // Use React Query to fetch repositories
  const { 
    data: repositories = [], 
    isLoading: isLoadingRepos,
    error: reposError
  } = useRepositoriesAndForks();
  
  // Use React Query to fetch lesson plan content
  const {
    data: lessonPlanData,
    isLoading: isLoadingLessonPlan,
    error: lessonPlanError
  } = useLessonPlanContent(fullLessonPath);
  
  // Combine loading states
  const loading = isLoadingRepos || isLoadingLessonPlan;
  
  // Combine error states
  const error = manualError || 
    (reposError ? (reposError as Error).message : null) || 
    (lessonPlanError ? (lessonPlanError as Error).message : null);

  // Initialize setupComplete based on stored data to prevent flashing
  const [setupComplete, setSetupComplete] = useState(() => {
    const storedRepo = githubRepoService.getSelectedRepo();
    const storedLessonPlan = lessonPlanService.getSelectedLessonPlan();
    return !!(storedRepo && storedLessonPlan);
  });
  
  // Track if we've already processed the initial setup
  const initialSetupDoneRef = React.useRef(false);

  useEffect(() => {
    // Skip if we're still loading data
    if (loading) {
      return;
    }
    
    // If we have URL parameters for repo, branch, and lesson, try to load them
    if (owner && repo && branch && category && lesson) {
      // Check if we're authenticated
      if (!githubService.isAuthenticated()) {
        console.log('Not authenticated, storing current URL for redirect after login');
        // Store the current URL for redirect after login
        const currentUrl = `/edit/${owner}/${repo}/${branch}/${category}/${lesson}`;
        sessionStorage.setItem('redirect_url', currentUrl);
        setManualError('Not authenticated with GitHub. Please log in.');
        return;
      }
      
      // Repository is already set by RepositoryLoader
      // Just verify that we have a selected repository
      const selectedRepo = githubRepoService.getSelectedRepo();
      if (!selectedRepo) {
        console.log('No repository selected, this should not happen with RepositoryLoader');
        setManualError('Repository not found or not selected');
        return;
      }
      
      // Set the selected branch
      if (branch) {
        githubRepoService.setSelectedBranch(branch);
      }
      
      // Set the lesson plan content from React Query data
      if (lessonPlanData) {
        lessonPlanService.setSelectedLessonPlan(lessonPlanData);
        
        if (lessonPlanData.decoded_content) {
          setMarkdownContent(lessonPlanData.decoded_content);
          setSetupComplete(true);
        } else {
          setManualError('Could not load lesson plan content');
        }
      }
    } else if (!initialSetupDoneRef.current) {
      // No URL parameters, check if we have selections in session storage
      // Only do this once to prevent infinite redirects
      initialSetupDoneRef.current = true;
      
      const storedRepo = githubRepoService.getSelectedRepo();
      const storedLessonPlan = lessonPlanService.getSelectedLessonPlan();
      
      if (storedRepo && storedLessonPlan) {
        setSetupComplete(true);
        
        // Get the selected branch
        const storedBranch = githubRepoService.getSelectedBranch() || undefined;
        
        // Generate and navigate to the appropriate URL
        const url = generateLessonPlanUrl(storedRepo, storedLessonPlan, storedBranch);
        navigate(url);
        
        if (storedLessonPlan.decoded_content) {
          setMarkdownContent(storedLessonPlan.decoded_content);
        }
      } else {
        setSetupComplete(false);
      }
    }
  }, [owner, repo, branch, category, lesson, navigate, repositories, lessonPlanData, loading]);

  // Render setup page if setup is not complete and we're not loading
  if (!setupComplete && !loading) {
    // Check if we have URL parameters that we can use
    if (owner && repo && branch && category && lesson) {
      console.log('URL parameters available, attempting to load content directly');
      
      // Check if repositories are loaded but no matching repo was found
      if (repositories.length > 0 && !repositories.find(r => 
        r.owner.login.toLowerCase() === owner.toLowerCase() && 
        r.name.toLowerCase() === repo.toLowerCase()
      )) {
        return (
          <Container maxWidth="lg" sx={{ mt: 4 }}>
            <Alert severity="error">
              <AlertTitle>Repository Not Found</AlertTitle>
              Repository {owner}/{repo} not found or you don't have access to it.
              <Box sx={{ mt: 2 }}>
                <Button variant="contained" onClick={() => navigate('/')}>Go to Repository Selection</Button>
              </Box>
            </Alert>
          </Container>
        );
      }
      
      // We'll continue rendering and let the useEffect handle the loading
    } else {
      // No URL parameters, redirect to setup
      console.log('No URL parameters and setup not complete, redirecting to setup');
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
      return <Navigate to="/" replace />;
    }
  }

  // Handle markdown content update
  const handleContentUpdate = (updatedContent: string) => {
    setMarkdownContent(updatedContent);
    // Invalidate the lesson plan content query to ensure it's updated when refetched
    queryClient.setQueryData(['lessonPlanContent', fullLessonPath], (oldData: any) => {
      if (oldData) {
        return {
          ...oldData,
          decoded_content: updatedContent
        };
      }
      return oldData;
    });
  };

  const handleExportMarkdown = () => {
    if (markdownContent) {
      exportMarkdownFile(markdownContent);
    }
  };

  const handleReturnToSelection = () => {
    // Clear selected repo, branch, and lesson plan in service layer
    githubRepoService.clearSelectedRepo();
    githubRepoService.clearSelectedBranch();
    lessonPlanService.clearSelectedLessonPlan();
    
    // Reset UI state
    setSetupComplete(false);
    setMarkdownContent(null);
    setManualError(null);
    
    // Invalidate queries to force refetch when returning
    queryClient.invalidateQueries({ queryKey: ['lessonPlanContent'] });
    
    // Navigate to setup page
    navigate('/');
  };

  // Handle save dialog open
  const handleSaveDialogOpen = () => {
    setSaveDialogOpen(true);
  };

  // Handle save dialog close
  const handleSaveDialogClose = () => {
    setSaveDialogOpen(false);
    // Invalidate queries to ensure fresh data after saving
    queryClient.invalidateQueries({ queryKey: ['hasUncommittedChanges'] });
    queryClient.invalidateQueries({ queryKey: ['hasCommitsOnBranch'] });
  };

  if (loading) {
    // If we have URL parameters, show a more informative loading message
    const isDirectNavigation = owner && repo && branch && category && lesson;
    
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        {isDirectNavigation && (
          <Typography variant="h6" sx={{ mt: 2 }}>
            Loading editor for {owner}/{repo}/{branch}/{category}/{lesson}...
          </Typography>
        )}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <StyledAppBar>
        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" component="div" color="white">
            Lesson Plan Editor
          </Typography>
          {setupComplete && githubRepoService.getSelectedRepo() && lessonPlanService.getSelectedLessonPlan() && (
            <Box 
              component="button" 
              onClick={handleReturnToSelection}
              sx={{ 
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                p: 0,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <Stack direction="row" spacing={2} sx={{ opacity: 0.8, color: 'white' }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <GitHubIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption" color="inherit">
                    {`${githubRepoService.getSelectedRepo()?.owner.login}/${githubRepoService.getSelectedRepo()?.name}`}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <AccountTreeIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption" color="inherit">
                    {githubRepoService.getSelectedBranch() || githubRepoService.getSelectedRepo()?.default_branch || ''}
                  </Typography>
                </Box>
                <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.3)' }} />
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <DescriptionIcon fontSize="small" sx={{ mr: 0.5 }} />
                  <Typography variant="caption" color="inherit">
                    {lessonPlanService.getSelectedLessonPlan()?.name || ''}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {markdownContent && (
            <GitHubCommitButton 
              content={markdownContent} 
              filePath={getCurrentFilename()} 
              color="inherit"
              onExport={handleExportMarkdown}
            />
          )}
          <UserMenu />
        </Box>
      </StyledAppBar>

      <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', py: 2 }}>
        {loading ? (
          <Container maxWidth="lg" sx={{ mt: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
            <CircularProgress size={60} />
          </Container>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {markdownContent !== null && (
              <Editor
                initialMarkdown={markdownContent}
                onSave={handleContentUpdate}
              />
            )}
          </Box>
        )}
      </Container>

      <Dialog open={saveDialogOpen} onClose={handleSaveDialogClose}>
        <DialogTitle>Save Markdown</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to save the changes to the markdown file?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleSaveDialogClose}>Cancel</Button>
          <Button onClick={() => {
            handleSaveDialogClose();
            setSaveDialogOpen(false);
            // Handle save logic here
          }} autoFocus>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EditorPage;
