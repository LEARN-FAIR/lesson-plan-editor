import React, { useState, useEffect } from 'react';
import { 
  Box, AppBar, Toolbar, Typography, Button, Container, 
  CircularProgress, Alert, AlertTitle, 
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar
} from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { extractLessonPathParts, generateLessonPlanUrl, constructLessonPath } from '../utils/urlUtils';
import githubRepoService, { Repository } from '../services/githubRepoService';
import githubService from '../services/githubService';
import lessonPlanService, { LessonPlan } from '../services/lessonPlanService';
import { exportMarkdownFile } from '../services/markdownService';
import Editor from '../components/Editor';
import UserMenu from '../components/UserMenu';

const EditorPage: React.FC = () => {
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [saveSnackbarOpen, setSaveSnackbarOpen] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  const navigate = useNavigate();
  const params = useParams();
  const { owner, repo, category, lesson } = params;

  useEffect(() => {
    const loadFromUrl = async () => {
      // If we have URL parameters for repo and lesson, try to load them
      if (owner && repo && category && lesson) {
        try {
          setLoading(true);
          setError(null);
          
          // Check if we're authenticated
          if (!githubService.isAuthenticated()) {
            setError('Not authenticated with GitHub. Please log in.');
            setLoading(false);
            return;
          }
          
          // Find and set the repository
          const repos = await githubRepoService.getTargetRepoAndForks();
          const selectedRepo = repos.find(r => 
            r.owner.login.toLowerCase() === owner.toLowerCase() && 
            r.name.toLowerCase() === repo.toLowerCase()
          );
          
          if (!selectedRepo) {
            setError(`Repository ${owner}/${repo} not found or you don't have access to it.`);
            setLoading(false);
            return;
          }
          
          // Set the selected repo
          githubRepoService.setSelectedRepo(selectedRepo);
          
          // Construct the lesson path using the category and lesson from URL
          const fullLessonPath = constructLessonPath(category, lesson);
          
          // Try to load the lesson plan
          try {
            const fullLessonPlan = await lessonPlanService.getLessonPlan(fullLessonPath);
            lessonPlanService.setSelectedLessonPlan(fullLessonPlan);
            
            if (fullLessonPlan.decoded_content) {
              setMarkdownContent(fullLessonPlan.decoded_content);
              setSetupComplete(true);
            } else {
              throw new Error('Could not load lesson plan content');
            }
          } catch (err) {
            console.error('Error loading lesson plan:', err);
            setError(err instanceof Error ? err.message : 'Failed to load lesson plan');
            githubRepoService.clearSelectedRepo(); // Clear repo selection on error
          }
        } catch (err) {
          console.error('Error loading from URL:', err);
          setError(err instanceof Error ? err.message : 'Failed to load from URL parameters');
        } finally {
          setLoading(false);
        }
      } else {
        // No URL parameters, check if we have selections in session storage
        const storedRepo = githubRepoService.getSelectedRepo();
        const storedLessonPlan = lessonPlanService.getSelectedLessonPlan();
        
        if (storedRepo && storedLessonPlan) {
          setSetupComplete(true);
          
          // Generate and navigate to the appropriate URL
          const url = generateLessonPlanUrl(storedRepo, storedLessonPlan);
          navigate(url, { replace: true });
          
          if (storedLessonPlan.decoded_content) {
            setMarkdownContent(storedLessonPlan.decoded_content);
            setLoading(false);
            return;
          }
          
          // Fetch full lesson plan content if needed
          try {
            const fullLessonPlan = await lessonPlanService.getLessonPlan(storedLessonPlan.path);
            if (fullLessonPlan.decoded_content) {
              setMarkdownContent(fullLessonPlan.decoded_content);
            } else {
              throw new Error('Could not load lesson plan content');
            }
          } catch (err) {
            console.error('Error loading lesson plan:', err);
            setError(err instanceof Error ? err.message : 'Failed to load lesson plan');
          } finally {
            setLoading(false);
          }
        } else {
          setSetupComplete(false);
          setLoading(false);
        }
      }
    };
    
    loadFromUrl();
  }, [owner, repo, category, lesson, navigate]);

  const handleSaveMarkdown = async (updatedMarkdown: string) => {
    try {
      setSaveError(null);
      setSavedContent(updatedMarkdown);
      setSaveSnackbarOpen(true);
      setMarkdownContent(updatedMarkdown);
    } catch (err) {
      console.error('Error saving markdown:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save markdown');
      setSaveSnackbarOpen(true);
    }
  };

  const handleExportMarkdown = () => {
    if (markdownContent) {
      exportMarkdownFile(markdownContent);
    }
  };

  const handleSetupComplete = (repo: Repository, lessonPlan: LessonPlan) => {
    setSetupComplete(true);
    
    // Generate and navigate to the appropriate URL
    const url = generateLessonPlanUrl(repo, lessonPlan);
    navigate(url, { replace: true });
    
    if (lessonPlan.decoded_content) {
      setMarkdownContent(lessonPlan.decoded_content);
      setLoading(false);
    }
  };
  
  const handleReturnToSelection = () => {
    // Clear selected repo and lesson plan in service layer
    githubRepoService.clearSelectedRepo();
    lessonPlanService.clearSelectedLessonPlan();
    
    // Reset UI state
    setSetupComplete(false);
    setMarkdownContent(null);
    
    // Navigate back to the root path
    navigate('/', { replace: true });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Lesson Plan Editor
          </Typography>
          {setupComplete && (
            <Button color="inherit" onClick={handleReturnToSelection}>
              Change Selection
            </Button>
          )}
          <Button color="inherit" onClick={handleExportMarkdown} disabled={!markdownContent}>
            Export
          </Button>
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
        ) : !setupComplete ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography variant="h6">
              Please select a repository and lesson plan to continue.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
            {markdownContent !== null && (
              <Editor
                initialMarkdown={markdownContent}
                onSave={handleSaveMarkdown}
              />
            )}
          </Box>
        )}
      </Container>

      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Markdown</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you want to save the changes to the markdown file?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            setSaveDialogOpen(false);
            // Handle save logic here
          }} autoFocus>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={saveSnackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSaveSnackbarOpen(false)}
        message={saveError || "Content saved successfully"}
      />
    </Box>
  );
};

export default EditorPage;
