import React, {useEffect, useState} from 'react';
import {
    Alert,
    Avatar,
    Box,
    Button,
    CircularProgress,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Divider,
    Menu,
    MenuItem,
    Snackbar,
    Stack,
    TextField,
    Typography
} from '@mui/material';
import GitHubIcon from '@mui/icons-material/GitHub';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import RefreshIcon from '@mui/icons-material/Refresh';
import FolderIcon from '@mui/icons-material/Folder';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CompareArrowsIcon from '@mui/icons-material/CompareArrows';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import githubService, {CommitFileParams} from '../services/githubService';
import githubRepoService from '../services/githubRepoService';
import lessonPlanService from '../services/lessonPlanService';
import {useFileContent, useHasCommitsOnBranch, useHasUncommittedChanges} from '../services/githubQueryHooks';
import {useQueryClient} from '@tanstack/react-query';
import ReactDiffViewer from 'react-diff-viewer-continued';

interface GitHubCommitButtonProps {
    content: string;
    filePath: string;
    disabled?: boolean;
    color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    onExport: () => void;
}

const GitHubCommitButton: React.FC<GitHubCommitButtonProps> = ({
                                                                   content,
                                                                   filePath,
                                                                   disabled = false,
                                                                   color,
                                                                   onExport
                                                               }) => {
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

    // State for PR mode
    const [isPrMode, setIsPrMode] = useState<boolean>(false);

    // React Query client for manual invalidation
    const queryClient = useQueryClient();

    // Check authentication status on mount
    useEffect(() => {
        setIsAuthenticated(githubService.isAuthenticated());
        setGithubUser(githubService.getUser());
    }, []);

    // Get the selected repository and branch
    const selectedRepo = githubRepoService.getSelectedRepo();
    const selectedBranch = githubRepoService.getSelectedBranch();

    // State for tracking if refreshing
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Use React Query hooks for GitHub data
    const owner = selectedRepo?.owner.login || '';
    const repo = selectedRepo?.name || '';
    const branch = selectedBranch || '';

    // Query for branch commits
    const {
        data: hasCommits = false,
        isLoading: isLoadingCommits,
        refetch: refetchCommits
    } = useHasCommitsOnBranch(owner, repo, branch);

    // Query for file content
    const {
        data: githubContent = '',
        isLoading: isLoadingContent,
        isError: isErrorContent,
        refetch: refetchContent
    } = useFileContent(owner, repo, filePath, branch);
    
    // Only check for uncommitted changes when file content is loaded
    const contentLoaded = githubContent !== undefined && githubContent !== '' && !isLoadingContent;
    
    // Query for uncommitted changes, but only when file content is loaded
    const {
        data: hasUncommittedChanges = true,
        isLoading: isLoadingChanges,
        refetch: refetchChanges
    } = useHasUncommittedChanges(owner, repo, filePath, content, branch);

    // Manually track if content has changed from GitHub version
    const [contentChanged, setContentChanged] = useState<boolean>(false);
    
    // Check if content has changed whenever local content or GitHub content changes
    useEffect(() => {
        if (githubContent && content) {
            const normalizedGithubContent = githubContent.replace(/\r\n/g, '\n').trim();
            const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
            const hasChanged = normalizedGithubContent !== normalizedLocalContent;
            
            console.log('Content comparison:', {
                githubContentLength: githubContent.length,
                localContentLength: content.length,
                hasChanged
            });
            
            setContentChanged(hasChanged);
        }
    }, [githubContent, content]);
    
    // Update PR mode when data changes
    useEffect(() => {
        // Log the values that determine PR mode
        console.log('PR mode determination:', {
            hasCommits,
            hasUncommittedChanges,
            contentChanged,
            contentLoaded
        });
        
        // Only show PR mode if there are commits AND no uncommitted changes AND content hasn't changed
        const shouldShowPrMode = hasCommits && !hasUncommittedChanges && !contentChanged && contentLoaded;
        setIsPrMode(shouldShowPrMode);
    }, [hasCommits, hasUncommittedChanges, contentChanged, contentLoaded]);

    // Function to manually refresh GitHub information
    const refreshGitHubInfo = () => {
        setIsRefreshing(true);

        // Invalidate and refetch all queries
        Promise.all([
            refetchCommits(),
            refetchContent(),
            refetchChanges()
        ]).finally(() => {
            setIsRefreshing(false);
        });
    };

    const handleOpenDialog = () => {
        setIsDialogOpen(true);
        setAnchorEl(null);

        // Set commit message based on the current file path
        setCommitMessage('');
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

        if (!commitMessage.trim()) {
            setError('Please enter a commit message');
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

            // Invalidate queries after successful commit
            queryClient.invalidateQueries({queryKey: ['fileContent']});
            queryClient.invalidateQueries({queryKey: ['hasUncommittedChanges']});
            queryClient.invalidateQueries({queryKey: ['hasCommitsOnBranch']});

            // Invalidate lesson plan content if this is a lesson plan file
            const selectedLessonPlan = lessonPlanService.getSelectedLessonPlan();
            if (selectedLessonPlan && selectedLessonPlan.path) {
                queryClient.invalidateQueries({queryKey: ['lessonPlanContent', selectedLessonPlan.path]});
            }

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
        if (selectedRepo) {
            window.open(installationUrl, '_blank');
        }
    };

    // Handle creating a pull request
    const handleCreatePullRequest = () => {
        if (!isAuthenticated) {
            setError('Please authenticate with GitHub first');
            return;
        }

        if (!selectedRepo || !selectedBranch) {
            setError('Repository or branch not selected');
            return;
        }

        // Open GitHub pull request page in a new tab
        const prUrl = `https://github.com/${selectedRepo.owner.login}/${selectedRepo.name}/pull/new/${selectedBranch}`;
        window.open(prUrl, '_blank');
    };

    // Determine if any loading is happening
    const isAnyLoading = isRefreshing || isLoadingCommits || isLoadingContent || isLoadingChanges;
    
    // Determine if content is ready for commit operations
    const isContentReady = contentLoaded && !isLoadingChanges;
    
    // Debug logging to help diagnose issues
    useEffect(() => {
        console.log('GitHubCommitButton state:', {
            contentLoaded,
            isContentReady,
            githubContentLength: githubContent?.length || 0,
            localContentLength: content?.length || 0,
            isLoadingContent,
            isErrorContent,
            hasUncommittedChanges
        });
    }, [contentLoaded, isContentReady, githubContent, content, isLoadingContent, isErrorContent, hasUncommittedChanges]);

    // Split button implementation with main action and dropdown
    const handleMainButtonClick = () => {
        if (isPrMode) {
            handleCreatePullRequest();
        } else {
            handleOpenDialog();
        }
    };

    return (
        <>
            <Box sx={{display: 'flex'}}>
                <Button
                    variant="contained"
                    color={isPrMode ? "success" : (color || 'primary')}
                    onClick={handleMainButtonClick}
                    disabled={disabled || isLoading || !isAuthenticated || isAnyLoading || !isContentReady}
                    startIcon={isAnyLoading ? <CircularProgress size={20} color="inherit"/> : <GitHubIcon/>}
                    sx={{borderTopRightRadius: 0, borderBottomRightRadius: 0}}
                >
                    {isAnyLoading ? 'Loading...' : (isPrMode ? 'Create pull request' : 'Commit changes')}
                </Button>
                <Button
                    size="small"
                    variant="contained"
                    color={isPrMode ? "success" : (color || 'primary')}
                    onClick={handleMenuOpen}
                    disabled={disabled || isLoading || !isAuthenticated || isAnyLoading || !isContentReady}
                    sx={{
                        minWidth: '36px',
                        borderTopLeftRadius: 0,
                        borderBottomLeftRadius: 0,
                        borderLeft: '1px solid rgba(255,255,255,0.3)'
                    }}
                >
                    <ArrowDropDownIcon/>
                </Button>
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem onClick={handleExport}>
                    <FileDownloadIcon fontSize="small" sx={{mr: 1}}/>
                    Download file
                </MenuItem>
                {isAuthenticated && (
                    <MenuItem onClick={() => {
                        refreshGitHubInfo();
                        handleMenuClose();
                    }}>
                        <RefreshIcon fontSize="small" sx={{mr: 1}}/>
                        Refresh GitHub status
                    </MenuItem>
                )}
            </Menu>

            <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
                <DialogTitle sx={{ pb: 1 }}>Commit to GitHub</DialogTitle>
                <DialogContent>
                    {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}

                    {!isAuthenticated ? (
                        <>
                            <DialogContentText>
                                Connect with your GitHub account to commit changes to a repository.
                            </DialogContentText>
                            <Box sx={{mt: 3, mb: 3, display: 'flex', justifyContent: 'center'}}>
                                <Button
                                    onClick={handleSignInWithGitHub}
                                    variant="contained"
                                    startIcon={<GitHubIcon/>}
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
                            {isAuthenticated && selectedRepo && (
                                <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
                                    {/* Left column: Repository, branch, file info */}
                                    <Box sx={{ flex: 1, width: '400px' }}>
                                        {/* Display repository info */}
                                        <Box sx={{
                                            mb: 1,
                                            mt: '28px',
                                            p: 0.75,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <FolderIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    Repository
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2">
                                                {selectedRepo.full_name}
                                            </Typography>
                                        </Box>

                                        {/* Display branch info */}
                                        <Box sx={{
                                            mb: 1,
                                            p: 0.75,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <AccountTreeIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    Branch
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2">
                                                {selectedBranch}
                                            </Typography>
                                        </Box>

                                        {/* Display file path info */}
                                        <Box sx={{
                                            mb: 1,
                                            p: 0.75,
                                            bgcolor: 'background.paper',
                                            borderRadius: 1,
                                            border: '1px solid',
                                            borderColor: 'divider'
                                        }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <InsertDriveFileIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    File
                                                </Typography>
                                            </Box>
                                            <Typography variant="body2" sx={{wordBreak: 'break-all'}}>
                                                {filePath}
                                            </Typography>
                                        </Box>

                                        <TextField
                                            margin="dense"
                                            label="Commit message"
                                            fullWidth
                                            variant="outlined"
                                            value={commitMessage}
                                            onChange={(e) => setCommitMessage(e.target.value)}
                                            required
                                            size="small"
                                            error={!commitMessage.trim()}
                                            helperText={!commitMessage.trim() ? 'Commit message is required' : ''}
                                        />
                                    </Box>
                                    
                                    {/* Right column: Diff viewer */}
                                    <Box sx={{ flex: 2, overflow: 'hidden' }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <CompareArrowsIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                                <Typography variant="caption" color="text.secondary">
                                                    Changes to be committed
                                                </Typography>
                                            </Box>
                                        </Box>
                                        <Box sx={{ 
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                            overflow: 'auto',
                                            maxHeight: '400px'
                                        }}>
                                            <ReactDiffViewer
                                                oldValue={githubContent || ''}
                                                newValue={content}
                                                splitView={false}
                                                showDiffOnly={false}
                                                useDarkTheme={false}
                                                styles={{
                                                    contentText: {
                                                        fontSize: '0.7rem',
                                                        lineHeight: '1.2',
                                                        fontFamily: 'monospace'
                                                    },
                                                    gutter: {
                                                        fontSize: '0.65rem',
                                                        padding: '0 0.3rem',
                                                        lineHeight: '1.2'
                                                    },
                                                    line: {
                                                        padding: '0'
                                                    }
                                                }}
                                            />
                                        </Box>
                                    </Box>
                                </Box>
                            )}
                        </>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>Cancel</Button>
                    {isAuthenticated && (
                        <Button
                            onClick={handleCommit}
                            disabled={isLoading || !selectedRepo || !selectedBranch || !commitMessage.trim()}
                            variant="contained"
                            color="primary"
                            startIcon={isLoading ? <CircularProgress size={20} color="inherit"/> : <GitHubIcon/>}
                        >
                            {isLoading ? 'Committing...' : 'Commit'}
                        </Button>
                        )}
                </DialogActions>
            </Dialog>

            {/* GitHub App Installation Dialog */}
            <Dialog open={isAppInstallDialogOpen} onClose={handleCloseAppInstallDialog}>
                <DialogTitle>
                    <Box display="flex" alignItems="center">
                        <GitHubIcon color="warning" sx={{mr: 1}}/>
                        GitHub App Installation Required
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        To commit changes to this repository, you need to install the GitHub App.
                        This will grant the necessary permissions to create branches and make commits.
                    </DialogContentText>

                    <Alert severity="info" sx={{mt: 2, mb: 2}}>
                        <Typography variant="body2" gutterBottom>
                            <strong>Installation steps:</strong>
                        </Typography>
                        <ol style={{marginTop: 0, paddingLeft: '1.5rem'}}>
                            <li>Click the "Install GitHub App" button below</li>
                            <li>On the GitHub page, select your organization/account</li>
                            <li>Choose the repository you want to install the app on</li>
                            <li>Click "Install" to complete the process</li>
                            <li>Return to this page and try again</li>
                        </ol>
                    </Alert>

                    {selectedRepo && (
                        <Box sx={{
                            mt: 2,
                            p: 0.75,
                            bgcolor: 'background.paper',
                            borderRadius: 1,
                            border: '1px solid',
                            borderColor: 'divider'
                        }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <FolderIcon color="primary" fontSize="small" sx={{ mr: 0.5 }} />
                                <Typography variant="caption" color="text.secondary">
                                    Selected Repository
                                </Typography>
                            </Box>
                            <Typography variant="body2">
                                {selectedRepo.full_name}
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
