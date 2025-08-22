import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  CircularProgress,
  Alert,
  Menu,
  MenuItem,
  IconButton,
  Box,
  Typography,
  Avatar,
  Divider,
  Stack,
  Snackbar
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import githubService, { CommitFileParams } from '../services/githubService';
import githubRepoService from '../services/githubRepoService';
import lessonPlanService from '../services/lessonPlanService';


interface GitHubCommitButtonProps {
  content: string;
  filePath: string;
  disabled?: boolean;
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  onExport: () => void;
}

const GitHubCommitButton: React.FC<GitHubCommitButtonProps> = ({ content, filePath, disabled = false, color, onExport }) => {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [commitMessage, setCommitMessage] = useState<string>(`Update ${filePath}`);
  
  // GitHub App installation dialog state
  const [isAppInstallDialogOpen, setIsAppInstallDialogOpen] = useState<boolean>(false);
  const [installationUrl, setInstallationUrl] = useState<string>('');

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
    setAnchorEl(null);
    
    // Set commit message based on the current file path
    setCommitMessage(`Update ${filePath}`);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setError(null);
    setSuccess(false);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleExport = () => {
    handleMenuClose();
    onExport();
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

    // Get the selected repository and branch from the service
    const selectedRepo = githubRepoService.getSelectedRepo();
    const selectedBranch = githubRepoService.getSelectedBranch();

    if (!selectedRepo) {
      setError('No repository selected. Please select a repository first.');
      return;
    }

    if (!selectedBranch) {
      setError('No branch selected. Please select a branch first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check if the user has write access to the repository first
      const hasAccess = await githubService.checkRepositoryWriteAccess(
        selectedRepo.owner.login, 
        selectedRepo.name
      );
      
      if (!hasAccess) {
        // Generate installation URL
        const url = githubService.getAppInstallationUrl(
          selectedRepo.owner.login, 
          selectedRepo.name
        );
        setInstallationUrl(url);
        setIsLoading(false);
        setIsAppInstallDialogOpen(true);
        return;
      }
      
      const params: CommitFileParams = {
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        path: filePath,
        message: commitMessage,
        content,
        branch: selectedBranch
      };

      const result = await githubService.commitFile(params);
      console.log('Commit successful:', result);
      setSuccess(true);
      handleCloseDialog();
    } catch (err) {
      console.error('Commit error:', err);
      
      // Check if this is a GitHub App installation error
      if ((err as Error).message.includes('Resource not accessible by integration')) {
        // Generate installation URL
        const url = githubService.getAppInstallationUrl(
          selectedRepo.owner.login, 
          selectedRepo.name
        );
        setInstallationUrl(url);
        setIsAppInstallDialogOpen(true);
      } else {
        setError(`Failed to commit to GitHub: ${(err as Error).message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  // Handle closing the app installation dialog
  const handleCloseAppInstallDialog = () => {
    setIsAppInstallDialogOpen(false);
  };

  // Handle opening the app installation URL
  const handleOpenAppInstallation = () => {
    const selectedRepo = githubRepoService.getSelectedRepo();
    if (selectedRepo) {
      window.open(installationUrl, '_blank');
    }
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
        endIcon={
          <IconButton 
            size="small" 
            onClick={(e: React.MouseEvent<HTMLElement>) => {
              e.stopPropagation();
              handleMenuOpen(e);
            }}
            sx={{ 
              p: 0, 
              color: 'inherit',
              '&:hover': { backgroundColor: 'transparent' } 
            }}
          >
            <ArrowDropDownIcon />
          </IconButton>
        }
      >
        Commit to GitHub
      </Button>
      
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleExport}>
          <FileDownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download file
        </MenuItem>
      </Menu>

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
                  You are about to commit changes to the selected repository and branch.
                </DialogContentText>
                
                {/* Display repository info */}
                {githubRepoService.getSelectedRepo() && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Repository</Typography>
                    <Typography variant="body1">
                      {githubRepoService.getSelectedRepo()?.full_name}
                    </Typography>
                  </Box>
                )}
                
                {/* Display branch info */}
                {githubRepoService.getSelectedBranch() && (
                  <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>Branch</Typography>
                    <Typography variant="body1">
                      {githubRepoService.getSelectedBranch()}
                    </Typography>
                  </Box>
                )}
                
                {/* Display file path info */}
                <Box sx={{ mb: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>File</Typography>
                  <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                    {filePath}
                  </Typography>
                </Box>
                
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
              disabled={isLoading || !githubRepoService.getSelectedRepo() || !githubRepoService.getSelectedBranch()}
              variant="contained"
              color="primary"
            >
              {isLoading ? <CircularProgress size={24} /> : 'Commit'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Success notification */}
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          File successfully committed to GitHub!
        </Alert>
      </Snackbar>
      
      {/* GitHub App Installation Dialog */}
      <Dialog open={isAppInstallDialogOpen} onClose={handleCloseAppInstallDialog}>
        <DialogTitle>
          <Box display="flex" alignItems="center">
            <GitHubIcon color="warning" sx={{ mr: 1 }} />
            GitHub App Installation Required
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            To commit changes to this repository, you need to install the GitHub App. 
            This will grant the necessary permissions to create branches and make commits.
          </DialogContentText>
          
          <Alert severity="info" sx={{ mt: 2, mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Installation steps:</strong>
            </Typography>
            <ol style={{ marginTop: 0, paddingLeft: '1.5rem' }}>
              <li>Click the "Install GitHub App" button below</li>
              <li>On the GitHub page, select your organization/account</li>
              <li>Choose the repository you want to install the app on</li>
              <li>Click "Install" to complete the process</li>
              <li>Return to this page and try again</li>
            </ol>
          </Alert>
          
          {githubRepoService.getSelectedRepo() && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>Selected Repository</Typography>
              <Typography variant="body1">
                {githubRepoService.getSelectedRepo()?.full_name}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAppInstallDialog}>Cancel</Button>
          <Button 
            onClick={handleOpenAppInstallation} 
            variant="contained" 
            color="primary"
          >
            Install GitHub App
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default GitHubCommitButton;
