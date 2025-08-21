import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormHelperText,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  TextField,
  Typography
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AddIcon from '@mui/icons-material/Add';
import WarningIcon from '@mui/icons-material/Warning';
import githubRepoService, { Branch } from '../services/githubRepoService';
import githubService from '../services/githubService';

interface BranchSelectorProps {
  onBranchSelected: (branch: string) => void;
  onBack?: () => void;
  repoId?: number; // Add repoId prop to trigger refresh when repo changes
}

const BranchSelector: React.FC<BranchSelectorProps> = ({ onBranchSelected, onBack, repoId }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // New branch creation state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState<boolean>(false);
  const [newBranchName, setNewBranchName] = useState<string>('');
  const [sourceBranch, setSourceBranch] = useState<string>('');
  const [creatingBranch, setCreatingBranch] = useState<boolean>(false);
  const [createError, setCreateError] = useState<string | null>(null);
  
  // Repository access state
  const [hasWriteAccess, setHasWriteAccess] = useState<boolean>(true);
  const [isAppInstallDialogOpen, setIsAppInstallDialogOpen] = useState<boolean>(false);
  const [installationUrl, setInstallationUrl] = useState<string>('');

  // Check if the user has write access to the repository
  const checkRepositoryAccess = async () => {
    const repo = githubRepoService.getSelectedRepo();
    if (!repo) return false;
    
    try {
      const hasAccess = await githubService.checkRepositoryWriteAccess(repo.owner.login, repo.name);
      setHasWriteAccess(hasAccess);
      return hasAccess;
    } catch (err) {
      console.error('Error checking repository access:', err);
      setHasWriteAccess(false);
      return false;
    }
  };
  
  // Define fetchBranches outside useEffect so we can call it manually if needed
  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const repo = githubRepoService.getSelectedRepo();
      
      if (!repo) {
        setError('No repository selected');
        setLoading(false);
        return;
      }
      
      // Check repository access
      await checkRepositoryAccess();
      
      const branchList = await githubRepoService.getBranches(repo.owner.login, repo.name);
      setBranches(branchList);
      
      // If we have a previously selected branch, use it
      const previousBranch = githubRepoService.getSelectedBranch();
      
      if (previousBranch && branchList.some(b => b.name === previousBranch)) {
        setSelectedBranch(previousBranch);
        onBranchSelected(previousBranch);
      } else if (branchList.length > 0) {
        // Otherwise use the default branch or the first one
        const defaultBranch = branchList.find(b => b.name === repo.default_branch) || branchList[0];
        setSelectedBranch(defaultBranch.name);
        onBranchSelected(defaultBranch.name);
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError(`Failed to fetch branches: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, [repoId]); // Refresh branches when repoId changes

  const handleBranchChange = (event: SelectChangeEvent<string>) => {
    const branch = event.target.value;
    setSelectedBranch(branch);
    onBranchSelected(branch); // Notify parent of branch selection
  };

  // Auto-save selected branch when it changes
  useEffect(() => {
    if (selectedBranch) {
      githubRepoService.setSelectedBranch(selectedBranch);
    }
  }, [selectedBranch]);
  
  // Handle opening the create branch dialog
  const handleOpenCreateDialog = async () => {
    const repo = githubRepoService.getSelectedRepo();
    if (!repo) return;
    
    // Check if user has write access to the repository
    const hasAccess = await checkRepositoryAccess();
    
    if (!hasAccess) {
      // Generate installation URL
      const url = githubService.getAppInstallationUrl(repo.owner.login, repo.name);
      setInstallationUrl(url);
      setIsAppInstallDialogOpen(true);
      return;
    }
    
    setSourceBranch(selectedBranch || (repo?.default_branch || ''));
    setNewBranchName('');
    setCreateError(null);
    setIsCreateDialogOpen(true);
  };
  
  // Handle closing the create branch dialog
  const handleCloseCreateDialog = () => {
    setIsCreateDialogOpen(false);
  };
  
  // Handle creating a new branch
  const handleCreateBranch = async () => {
    if (!newBranchName) {
      setCreateError('Branch name is required');
      return;
    }
    
    // Validate branch name (no spaces, special characters, etc.)
    const branchNameRegex = /^[\w.-]+$/;
    if (!branchNameRegex.test(newBranchName)) {
      setCreateError('Branch name can only contain letters, numbers, hyphens, underscores, and periods');
      return;
    }
    
    // Check if branch already exists
    if (branches.some(b => b.name === newBranchName)) {
      setCreateError(`Branch '${newBranchName}' already exists`);
      return;
    }
    
    setCreatingBranch(true);
    setCreateError(null);
    
    try {
      // Check repository access again before creating branch
      const hasAccess = await checkRepositoryAccess();
      if (!hasAccess) {
        const repo = githubRepoService.getSelectedRepo();
        if (repo) {
          const url = githubService.getAppInstallationUrl(repo.owner.login, repo.name);
          setInstallationUrl(url);
          handleCloseCreateDialog();
          setIsAppInstallDialogOpen(true);
          return;
        }
      }
      
      const newBranch = await githubRepoService.createBranch(newBranchName, sourceBranch);
      
      // Add the new branch to the list and select it
      setBranches(prevBranches => [...prevBranches, newBranch]);
      setSelectedBranch(newBranch.name);
      onBranchSelected(newBranch.name);
      
      // Close the dialog
      handleCloseCreateDialog();
    } catch (err) {
      console.error('Error creating branch:', err);
      
      // Check if this is a permissions error
      const errorMessage = (err as Error).message;
      if (errorMessage.includes('Resource not accessible by integration')) {
        const repo = githubRepoService.getSelectedRepo();
        if (repo) {
          const url = githubService.getAppInstallationUrl(repo.owner.login, repo.name);
          setInstallationUrl(url);
          handleCloseCreateDialog();
          setIsAppInstallDialogOpen(true);
          return;
        }
      }
      
      setCreateError(`Failed to create branch: ${errorMessage}`);
    } finally {
      setCreatingBranch(false);
    }
  };
  
  // Handle closing the app installation dialog
  const handleCloseAppInstallDialog = () => {
    setIsAppInstallDialogOpen(false);
  };
  
  // Handle opening the app installation URL
  const handleOpenAppInstallation = () => {
    window.open(installationUrl, '_blank');
    handleCloseAppInstallDialog();
  };

  return (
    <Box sx={{ maxWidth: 600, mx: 'auto', mt: 2 }}>
      <Typography variant="body1" color="text.secondary" paragraph>
        Choose a branch from the repository to load lesson plans from.
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading ? (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box>
          {branches.length > 0 ? (
            <>
              <FormControl fullWidth margin="normal">
                <InputLabel id="branch-select-label">Branch</InputLabel>
                <Select
                  labelId="branch-select-label"
                  id="branch-select"
                  value={selectedBranch}
                  label="Branch"
                  onChange={handleBranchChange}
                  startAdornment={<AccountTreeIcon sx={{ mr: 1, color: 'action.active' }} />}
                >
                  {branches.map((branch) => (
                    <MenuItem key={branch.name} value={branch.name}>
                      {branch.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleOpenCreateDialog}
                  variant="outlined"
                  color="primary"
                >
                  Create New Branch
                </Button>
              </Box>
            </>
          ) : (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>No branches found in this repository.</Alert>
              <Button
                startIcon={<AddIcon />}
                onClick={handleOpenCreateDialog}
                variant="outlined"
                color="primary"
              >
                Create New Branch
              </Button>
            </>
          )}
          
          {/* Create Branch Dialog */}
          <Dialog open={isCreateDialogOpen} onClose={handleCloseCreateDialog}>
            <DialogTitle>Create New Branch</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Create a new branch based on an existing branch. The new branch will contain all the same files and commit history as the source branch.
              </DialogContentText>
              
              {createError && (
                <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                  {createError}
                </Alert>
              )}
              
              <TextField
                autoFocus
                margin="dense"
                id="branch-name"
                label="New Branch Name"
                type="text"
                fullWidth
                variant="outlined"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                sx={{ mt: 2 }}
              />
              
              <FormControl fullWidth margin="normal">
                <InputLabel id="source-branch-label">Source Branch</InputLabel>
                <Select
                  labelId="source-branch-label"
                  id="source-branch"
                  value={sourceBranch}
                  label="Source Branch"
                  onChange={(e) => setSourceBranch(e.target.value)}
                >
                  {branches.map((branch) => (
                    <MenuItem key={branch.name} value={branch.name}>
                      {branch.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseCreateDialog}>Cancel</Button>
              <Button 
                onClick={handleCreateBranch} 
                variant="contained" 
                color="primary"
                disabled={creatingBranch || !newBranchName}
              >
                {creatingBranch ? <CircularProgress size={24} /> : 'Create'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* GitHub App Installation Dialog */}
          <Dialog open={isAppInstallDialogOpen} onClose={handleCloseAppInstallDialog}>
            <DialogTitle>
              <Box display="flex" alignItems="center">
                <WarningIcon color="warning" sx={{ mr: 1 }} />
                GitHub App Installation Required
              </Box>
            </DialogTitle>
            <DialogContent>
              <DialogContentText>
                To create branches or commit changes, you need to install the GitHub App for this repository. 
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
        </Box>
      )}
    </Box>
  );
};

export default BranchSelector;
