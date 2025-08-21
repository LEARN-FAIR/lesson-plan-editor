import React, { useState, useEffect } from 'react';
import { 
  Box, AppBar, Toolbar, Typography, Button, Container, 
  CssBaseline, CircularProgress, Alert, AlertTitle, 
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
  Snackbar
} from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { loadMarkdownFile, saveMarkdownFile, exportMarkdownFile } from './services/markdownService';
import Editor from './components/Editor';
import GitHubCallback from './components/GitHubCallback';
import AuthGuard from './components/AuthGuard';
import UserMenu from './components/UserMenu';
import './App.css';

function MainEditor() {
  const [markdownContent, setMarkdownContent] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState<boolean>(false);
  const [savedContent, setSavedContent] = useState<string | null>(null);
  const [saveSnackbarOpen, setSaveSnackbarOpen] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMarkdown = async () => {
      try {
        const content = await loadMarkdownFile();
        setMarkdownContent(content);
        setLoading(false);
      } catch (err) {
        console.error('Error loading markdown:', err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
        
        // Use a hardcoded fallback markdown sample for demonstration
        const sampleMarkdown = `---
number: 1.1
title: Sample FAIR Lesson Plan
status: draft
layout: lesson-plan

authors:
  - "0000-0001-1234-5678"
  - "Sample Author"

reviewers:
  - "0000-0002-8765-4321"

description: >  
  This is a sample lesson plan for demonstration purposes.

fair_elements:
  - F
  - A
  - I
  - R

learning_outcomes:
  1:
    outcome: the importance of the FAIR principles
    verbs:
      - verb: understanding
        level: beginner

activities:
  before: []
  during: []
  after: []

prerequisites: []

terms4FAIRskills: []

additionalResources: []
---

This is the main content of the sample FAIR lesson plan.`;
        
        setMarkdownContent(sampleMarkdown);
        setError(null);
      }
    };
    
    fetchMarkdown();
  }, []);

  const handleSaveMarkdown = async (updatedMarkdown: string) => {
    try {
      setSavedContent(updatedMarkdown);
      await saveMarkdownFile(updatedMarkdown);
      setSaveSnackbarOpen(true);
    } catch (err) {
      console.error('Error saving markdown:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save markdown');
      setSaveDialogOpen(true); // Show dialog with error details
    }
  };
  
  const handleExportMarkdown = () => {
    if (markdownContent) {
      exportMarkdownFile(markdownContent);
    }
  };

  const handleCloseDialog = () => {
    setSaveDialogOpen(false);
  };
  
  const handleLogout = () => {
    // Force a reload to ensure the app resets to the login state
    window.location.href = '/';
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <CssBaseline />
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            FAIR Lesson Plan Editor
          </Typography>
          <Button color="inherit" onClick={handleExportMarkdown} disabled={!markdownContent}>
            Export
          </Button>
          <Button color="inherit">Documentation</Button>
          <UserMenu onLogout={handleLogout} />
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
        ) : markdownContent ? (
          <Editor 
            initialMarkdown={markdownContent} 
            onSave={handleSaveMarkdown} 
          />
        ) : null}
      </Container>
      
      {/* Save Dialog (for demonstration or errors) */}
      <Dialog open={saveDialogOpen} onClose={handleCloseDialog}>
        <DialogTitle>{saveError ? 'Error Saving' : 'Markdown Saved'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {saveError ? 
              `Error: ${saveError}. Please try again.` :
              'In a production environment, this would save the file to your system or server. For now, the updated markdown has been logged to the console.'}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
          {!saveError && (
            <Button onClick={handleExportMarkdown} color="primary" autoFocus>
              Export File
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Success Snackbar */}
      <Snackbar 
        open={saveSnackbarOpen} 
        autoHideDuration={6000}
        onClose={() => setSaveSnackbarOpen(false)}
        message="Markdown saved successfully!"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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
