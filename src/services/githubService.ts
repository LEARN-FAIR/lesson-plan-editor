/**
 * GitHub service for handling GitHub API operations
 * Uses OAuth flow for authentication
 * All GitHub API calls are now routed through the backend
 */

// Local storage keys
const TOKEN_STORAGE_KEY = 'github_oauth_token';
const USER_STORAGE_KEY = 'github_user';

// Configuration for GitHub OAuth callback
// The actual OAuth redirection is handled by the backend
const GITHUB_CALLBACK_PATH = '/github-callback';

// Import the API adapter
import apiAdapter from './apiAdapter';

// Types for file parameters
export interface CommitFileParams {
    owner: string;      // GitHub username or organization name
    repo: string;       // Repository name
    path: string;       // File path within the repository
    message: string;    // Commit message
    content: string;    // File content to commit
    branch?: string;    // Target branch (default: main/master)
}

// User info from GitHub API
interface GitHubUser {
    login: string;
    name?: string;
    avatar_url: string;
    email?: string;
}

class GitHubService {
    private token: string | null = null;
    private user: GitHubUser | null = null;

    constructor() {
        // Try to load token and user from local storage on initialization
        this.token = localStorage.getItem(TOKEN_STORAGE_KEY);
        const userJson = localStorage.getItem(USER_STORAGE_KEY);
        if (userJson) {
            try {
                this.user = JSON.parse(userJson);
            } catch (e) {
                console.error('Failed to parse stored user:', e);
            }
        }
    }

    /**
     * Initialize the GitHub service with authentication token
     * @param params Authentication parameters
     */
    initialize(params: { token: string }) {
        this.token = params.token;
        localStorage.setItem(TOKEN_STORAGE_KEY, params.token);
    }

    /**
     * Redirect to GitHub for OAuth authentication via backend
     * @param redirectUrl Optional URL to redirect to after successful authentication
     */
    redirectToGitHub(redirectUrl?: string) {
        // Use the API adapter to get the login URL
        const loginUrl = apiAdapter.getGitHubLoginUrl(redirectUrl);
        window.location.href = loginUrl;
    }

    /**
     * Handle the OAuth callback from GitHub
     * With the Symfony backend, the token is directly returned in the URL
     * @returns The redirect URL from the server response, if any
     */
    async handleAuthCallback(token: string): Promise<string | null> {
        // If we already have a token, don't try to set it again
        if (this.token && this.isAuthenticated()) {
            console.log('Already authenticated, skipping token setup');
            return null;
        }

        try {
            console.log('Setting up token from callback...');
            
            this.token = token;

            // Save token to local storage
            if (this.token) {
                localStorage.setItem(TOKEN_STORAGE_KEY, this.token);
                console.log('Token saved to local storage');
            }

            // Get user data from GitHub API
            await this.getCurrentUser();

            return null;
        } catch (error) {
            console.error('Error handling GitHub callback:', error);
            throw error;
        }
    }

    /**
     * Check if the user is authenticated
     */
    isAuthenticated(): boolean {
        return !!this.token;
    }

    /**
     * Get current authenticated user
     */
    getUser(): GitHubUser | null {
        return this.user;
    }

    /**
     * Logout user
     */
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        localStorage.removeItem(USER_STORAGE_KEY);
    }

    /**
     * Get current authenticated user information
     */
    async getCurrentUser(): Promise<GitHubUser> {
        if (!this.token) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            // If we already have user data, return it
            if (this.user) {
                return this.user;
            }

            // Get user data from our backend via the API adapter
            const userData = await apiAdapter.getUserInfo();
            
            this.user = {
                login: userData.login,
                name: userData.name || undefined,
                avatar_url: userData.avatarUrl,
                email: userData.email || undefined
            };

            // Save to local storage
            localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user));
            return this.user;
        } catch (error) {
            console.error('Failed to get user information:', error);
            throw error;
        }
    }

    /**
     * Check if the user has write access to a repository
     * @param owner Repository owner
     * @param repo Repository name
     * @returns True if the user has write access, false otherwise
     */
    async checkRepositoryWriteAccess(owner: string, repo: string): Promise<boolean> {
        if (!this.token) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            const repoInfo = await apiAdapter.checkRepositoryAccess(owner, repo);
            return repoInfo.hasWriteAccess === true;
        } catch (error) {
            console.error('Error checking repository permissions:', error);
            return false;
        }
    }

    /**
     * Get the GitHub App installation URL for a repository
     * @param owner Repository owner
     * @param repo Repository name
     * @param repoId Repository ID (optional)
     * @returns The installation URL for the GitHub App
     */
    getAppInstallationUrl(owner: string, repo: string, repoId?: number): string {
        if (repoId) {
            // Use the specific GitHub App installation URL with the repository ID preselected
            return `https://github.com/apps/lesson-plan-editor/installations/new?target_id=${repoId}`;
        } else {
            // Fallback to the basic installation URL if no repository ID is available
            return 'https://github.com/apps/lesson-plan-editor/installations/new';
        }
    }

    /**
     * Commit a file to a GitHub repository
     */
    async commitFile(params: CommitFileParams) {
        if (!this.token) {
            throw new Error('Not authenticated with GitHub');
        }

        const {owner, repo, path, message, content, branch = 'main'} = params;

        try {
            return await apiAdapter.saveLessonPlan(owner, repo, path, content, message, undefined, branch);
        } catch (error) {
            console.error('Error committing file:', error);
            throw error;
        }
    }

    /**
     * Check if there are commits on a branch
     * @param owner Repository owner
     * @param repo Repository name
     * @param branch Branch name
     * @returns True if there are commits, false otherwise
     */
    async hasBranchCommits(owner: string, repo: string, branch: string): Promise<boolean> {
        if (!this.token) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            const commits = await apiAdapter.getBranchCommits(owner, repo, branch);
            return commits.length > 0;
        } catch (error) {
            console.error('Error checking branch commits:', error);
            // If we can't get the commits, assume there are some
            return true;
        }
    }

    /**
     * Check if a file has uncommitted changes by comparing with the latest version on GitHub
     */
    async hasUncommittedChanges(owner: string, repo: string, path: string, content: string, branch: string): Promise<boolean> {
        try {
            // Get the current file content from GitHub
            const githubContent = await this.getFileContent(owner, repo, path, branch);

            // Compare the content
            return githubContent !== content;
        } catch (error) {
            console.error('Error checking for uncommitted changes:', error);
            // If we can't get the file (e.g., it doesn't exist yet), consider it as having changes
            return true;
        }
    }

    /**
     * Get file content from GitHub
     */
    async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
        try {
            return await apiAdapter.getFileContent(owner, repo, path, branch);
        } catch (error) {
            console.error('Error getting file content:', error);
            throw error;
        }
    }
}

// Create singleton instance
const githubService = new GitHubService();
export default githubService;
