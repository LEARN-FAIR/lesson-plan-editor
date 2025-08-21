import React, { useState, useEffect } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import GitHubIcon from '@mui/icons-material/GitHub';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Snackbar from '@mui/material/Snackbar';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import githubService from '../services/githubService';
import { CommitFileParams } from '../services/githubService';

interface GitHubCommitButtonProps {
  content: string;
  filePath: string;
  disabled?: boolean;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
}

const GitHubCommitButton: React.FC<GitHubCommitButtonProps> = ({ content, filePath, disabled = false, color }) => {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  
  // Commit information
  const [owner, setOwner] = useState<string>('');
  const [repo, setRepo] = useState<string>('');
  const [branch, setBranch] = useState<string>('main');
  const [commitMessage, setCommitMessage] = useState<string>(`Update ${filePath}`);

  // Check authentication status
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(githubService.isAuthenticated());
  const [githubUser, setGithubUser] = useState(githubService.getUser());
  
  // Check authentication status on mount
  useEffect(() => {
    setIsAuthenticated(githubService.isAuthenticated());
    setGithubUser(githubService.getUser());
  }, []);

  const handleOpenDialog = () => {
    setIsDialogOpen(true);
    // Reset error state when opening dialog
    setError(null);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  const handleSignInWithGitHub = () => {
    // Redirect to GitHub for OAuth authentication
    githubService.redirectToGitHub();
  };
  
  const handleSignOut = () => {
    githubService.logout();
    setIsAuthenticated(false);
    setGithubUser(null);
  };

  const handleCommit = async () => {
    if (!isAuthenticated) {
      setError('Please authenticate with GitHub first');
      return;
    }

    if (!owner || !repo) {
      setError('Owner and repository names are required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params: CommitFileParams = {
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content,
        branch
      };

      const result = await githubService.commitFile(params);
      console.log('Commit successful:', result);
      setSuccess(true);
      handleCloseDialog();
    } catch (err) {
      console.error('Commit error:', err);
      setError(`Failed to commit to GitHub: ${(err as Error).message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  return (
    <>
      <Button
        variant="contained"
        startIcon={<GitHubIcon />}
        onClick={handleOpenDialog}
        disabled={disabled}
        color={color || "primary"}
        sx={{ ml: 1 }}
      >
        Commit to GitHub
      </Button>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Commit to GitHub</DialogTitle>
        <DialogContent>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          
          {!isAuthenticated ? (
            <>
              <DialogContentText>
                Connect with your GitHub account to commit changes to a repository.
              </DialogContentText>
              <Box sx={{ mt: 3, mb: 3, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  onClick={handleSignInWithGitHub} 
                  variant="contained"
                  startIcon={<GitHubIcon />}
                  size="large"
                >
                  Sign in with GitHub
                </Button>
              </Box>
              <DialogContentText variant="body2" color="text.secondary" align="center">
                You'll be redirected to GitHub to authorize this application
              </DialogContentText>
            </>
          ) : (
            <>
              {githubUser && (
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <Avatar src={githubUser.avatar_url} alt={githubUser.login} sx={{ mr: 2 }} />
                  <Box>
                    <Typography variant="subtitle1">{githubUser.name || githubUser.login}</Typography>
                    <Typography variant="body2" color="text.secondary">{githubUser.login}</Typography>
                  </Box>
                  <Box sx={{ flexGrow: 1 }} />
                  <Button onClick={handleSignOut} size="small">Sign Out</Button>
                </Box>
              )}
              
              <Divider sx={{ mb: 3 }} />
              
              <Stack spacing={2}>
                <DialogContentText>
                  Enter the GitHub repository details where you want to commit the file.
                </DialogContentText>
                <TextField
                  label="Owner (username or organization)"
                  fullWidth
                  variant="outlined"
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                />
                <TextField
                  label="Repository name"
                  fullWidth
                  variant="outlined"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                />
                <TextField
                  label="Branch"
                  fullWidth
                  variant="outlined"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                />
                <TextField
                  label="File path in repository"
                  fullWidth
                  variant="outlined"
                  value={filePath}
                  disabled
                />
                <TextField
                  label="Commit message"
                  fullWidth
                  variant="outlined"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                />
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {isAuthenticated && (
            <Button 
              onClick={handleCommit} 
              disabled={isLoading || !owner || !repo}
              variant="contained"
              color="primary"
            >
              {isLoading ? <CircularProgress size={24} /> : 'Commit'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          File successfully committed to GitHub!
        </Alert>
      </Snackbar>
    </>
  );
};

export default GitHubCommitButton;
