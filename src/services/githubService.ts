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

// Backend API URL - Update this if your backend is running on a different port/host
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

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
    // Use the backend endpoint to handle GitHub OAuth redirection
    let loginUrl = `${API_URL}/auth/github/login`;
    
    // Add redirect_url as a query parameter if provided
    if (redirectUrl) {
      // Encode the redirect URL to ensure it's properly passed
      const encodedRedirectUrl = encodeURIComponent(redirectUrl);
      loginUrl += `?redirect_url=${encodedRedirectUrl}`;
    }
    
    window.location.href = loginUrl;
  }

  /**
   * Handle the OAuth callback from GitHub
   * Uses our backend to securely exchange the code for an access token
   * @returns The redirect URL from the server response, if any
   */
  async handleAuthCallback(code: string, state?: string): Promise<string | null> {
    // If we already have a token, don't try to exchange the code again
    if (this.token && this.isAuthenticated()) {
      console.log('Already authenticated, skipping code exchange');
      return null;
    }
    
    try {
      console.log('Exchanging code for token...');
      console.log('State parameter received:', state);
      
      // The state parameter is just a random string for security, not JSON
      // We don't need to try to extract anything from it
      
      // Exchange the code for an access token via our backend
      const tokenResponse = await fetch(`${API_URL}/auth/github/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code, state })
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to exchange code for token');
      }
      
      const tokenData = await tokenResponse.json();
      this.token = tokenData.access_token;
      
      // Save token to local storage
      if (this.token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, this.token);
        console.log('Token saved to local storage');
      }
      
      // Get user data from GitHub API
      await this.getCurrentUser();
      
      // Use the redirect URL from the server response if available
      if (tokenData.redirect_url) {
        console.log('Using redirect_url from server response:', tokenData.redirect_url);
        return tokenData.redirect_url;
      }
      
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
      
      // Get user data from our backend
      const userResponse = await fetch(`${API_URL}/github/user`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!userResponse.ok) {
        throw new Error('Failed to get user information from backend');
      }
      
      const userData = await userResponse.json();
      this.user = {
        login: userData.login,
        name: userData.name || undefined,
        avatar_url: userData.avatar_url,
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
      const response = await fetch(`${API_URL}/github/repo/${owner}/${repo}/access`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to check repository access');
      }
      
      const data = await response.json();
      return data.hasAccess === true;
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
    
    const { owner, repo, path, message, content, branch = 'main' } = params;

    try {
      const response = await fetch(`${API_URL}/github/repo/${owner}/${repo}/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          path,
          message,
          content,
          branch
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to commit file');
      }
      
      return await response.json();
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
   * @returns True if there are commits on the branch, false otherwise
   */
  async hasCommitsOnBranch(owner: string, repo: string, branch: string): Promise<boolean> {
    if (!this.token) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const response = await fetch(`${API_URL}/github/repo/${owner}/${repo}/commits?branch=${encodeURIComponent(branch)}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to check branch commits');
      }
      
      const commits = await response.json();
      return Array.isArray(commits) && commits.length > 0;
    } catch (error) {
      console.error('Error checking branch commits:', error);
      return false;
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
      const response = await fetch(`${API_URL}/github/repo/${owner}/${repo}/content?path=${encodeURIComponent(path)}&branch=${encodeURIComponent(branch)}`, {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to get file content from GitHub');
      }
      
      const fileData = await response.json();
      return fileData.content;
    } catch (error) {
      console.error('Error getting file content:', error);
      throw error;
    }
  }
}

// Create singleton instance
const githubService = new GitHubService();
export default githubService;
