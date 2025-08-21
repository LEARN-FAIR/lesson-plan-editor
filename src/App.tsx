import React, { useState, useEffect } from 'react';
import { 
  Box, AppBar, Toolbar, Typography, Button, Container, 
  CssBaseline, CircularProgress, Alert, AlertTitle, 
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar, Divider, Paper
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { loadMarkdownFile, exportMarkdownFile } from './services/markdownService';
import githubRepoService, { Repository } from './services/githubRepoService';
import lessonPlanService, { LessonPlan } from './services/lessonPlanService';
import Editor from './components/Editor';
import GitHubCallback from './components/GitHubCallback';
import AuthGuard from './components/AuthGuard';
import UserMenu from './components/UserMenu';
import SetupStepper from './components/SetupStepper';
import './App.css';

function MainEditor() {
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [saveSnackbarOpen, setSaveSnackbarOpen] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [setupComplete, setSetupComplete] = useState<boolean>(false);
  const navigate = useNavigate();

  useEffect(() => {
    const repo = githubRepoService.getSelectedRepo();
    const lessonPlan = lessonPlanService.getSelectedLessonPlan();
    
    if (repo && lessonPlan) {
      setSetupComplete(true);
      
      if (lessonPlan.decoded_content) {
        setMarkdownContent(lessonPlan.decoded_content);
        setLoading(false);
        return;
      }
      
      const fetchLessonPlanContent = async () => {
        try {
          setLoading(true);
          setError(null);
          
          const fullLessonPlan = await lessonPlanService.getLessonPlan(lessonPlan.path);
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
      };
      
      fetchLessonPlanContent();
    } else {
      setSetupComplete(false);
      setLoading(false);
    }
  }, [setupComplete]);

  const handleSaveMarkdown = async (updatedMarkdown: string) => {
    try {
      setSaveError(null);
      setSaveDialogOpen(false);
      
      // Simulate a delay to provide feedback to the user
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setSaveSnackbarOpen(true);
    } catch (err) {
      console.error('Error processing markdown:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to process markdown');
      setSaveDialogOpen(true); // Show dialog with error details
    }
  };
  
  const handleExportMarkdown = async () => {
    if (markdownContent) {
      try {
        await exportMarkdownFile(markdownContent);
      } catch (err) {
        console.error('Error exporting markdown:', err);
        setSaveError(err instanceof Error ? err.message : 'Failed to export markdown');
        setSaveDialogOpen(true); // Show dialog with error details
      }
    }
  };
  
  const handleSetupComplete = (repo: Repository, lessonPlan: LessonPlan) => {
    setSetupComplete(true);
    
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
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            FAIR Lesson Plan Editor
          </Typography>
          {setupComplete && (
            <Button 
              color="inherit" 
              onClick={handleReturnToSelection}
              sx={{ mr: 1 }}
            >
              Change Selection
            </Button>
          )}
          <Button color="inherit" onClick={handleExportMarkdown} disabled={!markdownContent}>
            Export
          </Button>
          <Button color="inherit">Documentation</Button>
          <UserMenu />
        </Toolbar>
      </AppBar>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ mt: 4 }}>
            <AlertTitle>Error</AlertTitle>
            {error} — <strong>Please check the file path or network connection.</strong>
          </Alert>
        ) : !setupComplete ? (
          <SetupStepper onComplete={handleSetupComplete} />
        ) : markdownContent ? (
          <Editor 
            initialMarkdown={markdownContent} 
            onSave={handleSaveMarkdown} 
          />
        ) : null}
      </Container>
      
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Error</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {saveError || 'An error occurred while processing the markdown.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={saveSnackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSaveSnackbarOpen(false)}
        message="Markdown content saved successfully!"
      />
    </Box>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <AuthGuard>
            <MainEditor />
          </AuthGuard>
        } />
        <Route path="/github-callback" element={<GitHubCallback />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
