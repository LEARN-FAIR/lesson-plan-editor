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
import UserMenu from '../components/navigation/UserMenu';
import StyledAppBar from '../components/navigation/StyledAppBar';
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
  
  // Track loading states for repositories and lesson plan content
  const [isLoadingRepository, setIsLoadingRepository] = useState<boolean>(false);
  const [isLoadingLessonPlanContent, setIsLoadingLessonPlanContent] = useState<boolean>(false);
  
  // Combine loading states
  const loading = isLoadingRepos || isLoadingLessonPlan || isLoadingRepository || isLoadingLessonPlanContent;
  
  // Combine error states
  const error = manualError || 
    (reposError ? (reposError as Error).message : null) || 
    (lessonPlanError ? (lessonPlanError as Error).message : null);

  const [setupComplete, setSetupComplete] = useState(false);

  // Main effect to handle all loading scenarios
  useEffect(() => {
    const loadRepositoryAndLessonPlan = async () => {
      try {
        // First check if we have URL parameters
        if (owner && repo && branch && category && lesson) {
          setIsLoadingRepository(true);
          
          // 1. Load repositories if needed
          let selectedRepo;
          if (repositories.length > 0) {
            // Find the repository that matches the URL parameters
            selectedRepo = repositories.find(r => 
              r.owner.login.toLowerCase() === owner.toLowerCase() && 
              r.name.toLowerCase() === repo.toLowerCase()
            );
            
            if (!selectedRepo) {
              setManualError(`Repository ${owner}/${repo} not found or you don't have access to it`);
              setIsLoadingRepository(false);
              return;
            }
          } else {
            // Wait for repositories to load
            return; // Exit and wait for repositories to load
          }
          
          // 2. Set the selected repository and branch
          githubRepoService.setSelectedRepo(selectedRepo);
          githubRepoService.setSelectedBranch(branch);
          setIsLoadingRepository(false);
          
          // 3. Load lesson plan content
          setIsLoadingLessonPlanContent(true);
          if (lessonPlanData) {
            if (lessonPlanData.decoded_content) {
              setMarkdownContent(lessonPlanData.decoded_content);
              lessonPlanService.setSelectedLessonPlan(lessonPlanData);
              setSetupComplete(true);
            } else {
              // If we have lesson plan data but no decoded content, fetch it directly
              try {
                const fullLessonPlan = await lessonPlanService.getLessonPlan(fullLessonPath);
                if (fullLessonPlan.decoded_content) {
                  setMarkdownContent(fullLessonPlan.decoded_content);
                  lessonPlanService.setSelectedLessonPlan(fullLessonPlan);
                  setSetupComplete(true);
                } else {
                  throw new Error('Could not load lesson plan content');
                }
              } catch (error) {
                setManualError('Could not load lesson plan content');
              }
            }
          } else if (!isLoadingLessonPlan) {
            // If lesson plan data isn't loading but we don't have it, fetch it directly
            try {
              const fullLessonPlan = await lessonPlanService.getLessonPlan(fullLessonPath);
              if (fullLessonPlan.decoded_content) {
                setMarkdownContent(fullLessonPlan.decoded_content);
                lessonPlanService.setSelectedLessonPlan(fullLessonPlan);
                setSetupComplete(true);
              } else {
                throw new Error('Could not load lesson plan content');
              }
            } catch (error) {
              setManualError('Could not load lesson plan content');
            }
          }
          setIsLoadingLessonPlanContent(false);
        } else {
          // No URL parameters, check if we have selections in session storage
          const storedRepo = githubRepoService.getSelectedRepo();
          const storedLessonPlan = lessonPlanService.getSelectedLessonPlan();
          
          if (storedRepo && storedLessonPlan) {
            // Check if the stored lesson plan has decoded content
            if (storedLessonPlan.decoded_content) {
              setMarkdownContent(storedLessonPlan.decoded_content);
              setSetupComplete(true);
            } else {
              // If we have a stored lesson plan but no decoded content, fetch it
              setIsLoadingLessonPlanContent(true);
              try {
                const fullLessonPlan = await lessonPlanService.getLessonPlan(storedLessonPlan.path);
                if (fullLessonPlan.decoded_content) {
                  setMarkdownContent(fullLessonPlan.decoded_content);
                  lessonPlanService.setSelectedLessonPlan(fullLessonPlan);
                  setSetupComplete(true);
                } else {
                  throw new Error('Could not load lesson plan content');
                }
              } catch (error) {
                setManualError('Could not load lesson plan content');
              }
              setIsLoadingLessonPlanContent(false);
            }
          } else {
            // No stored data, redirect to setup page
            navigate('/');
          }
        }
      } catch (error) {
        setManualError(error instanceof Error ? error.message : 'Unknown error occurred');
        setIsLoadingRepository(false);
        setIsLoadingLessonPlanContent(false);
      }
    };
    
    loadRepositoryAndLessonPlan();
  }, [owner, repo, branch, category, lesson, repositories, lessonPlanData, isLoadingLessonPlan, fullLessonPath, navigate]);

  // Show loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          {isLoadingRepos || isLoadingRepository ? `Loading repository ${owner || ''}/${repo || ''}...` : ''}
          {(isLoadingLessonPlan || isLoadingLessonPlanContent) && category && lesson ? `Loading lesson plan ${category}/${lesson}...` : ''}
        </Typography>
      </Box>
    );
  }
  
  // Show error state
  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          <AlertTitle>Error</AlertTitle>
          {error}
          <Box sx={{ mt: 2 }}>
            <Button variant="contained" onClick={() => navigate('/')}>
              Go to Repository Selection
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }
  
  // Redirect to setup if not complete
  if (!setupComplete) {
    console.log('Setup not complete, redirecting to setup');
    return <Navigate to="/" replace />;
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
    </Box>
  );
};

export default EditorPage;
