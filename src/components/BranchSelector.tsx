import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import githubRepoService, { Branch } from '../services/githubRepoService';

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

  // Define fetchBranches outside useEffect so we can call it manually if needed
  const fetchBranches = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const repo = githubRepoService.getSelectedRepo();
      if (!repo) {
        setError('No repository selected. Please select a repository first.');
        setLoading(false);
        return;
      }

      console.log('Fetching branches for', repo.owner.login, repo.name);
      const branchList = await githubRepoService.getBranches(repo.owner.login, repo.name);
      console.log('Branches fetched:', branchList);
      setBranches(branchList);
      
      // If there's a previously selected branch, use it
      const previousBranch = githubRepoService.getSelectedBranch();
      if (previousBranch && branchList.some(b => b.name === previousBranch)) {
        setSelectedBranch(previousBranch);
        onBranchSelected(previousBranch); // Notify parent of branch selection
      } else if (branchList.length > 0) {
        // Otherwise use the default branch or the first one
        const defaultBranch = branchList.find(b => b.name === repo.default_branch) || branchList[0];
        setSelectedBranch(defaultBranch.name);
        onBranchSelected(defaultBranch.name); // Notify parent of branch selection
      }
    } catch (err) {
      console.error('Error fetching branches:', err);
      setError('Failed to fetch branches. Please try again.');
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
          ) : (
            <Alert severity="info">No branches found in this repository.</Alert>
          )}
        </Box>
      )}
    </Box>
  );
};

export default BranchSelector;
