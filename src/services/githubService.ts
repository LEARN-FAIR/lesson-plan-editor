/**
 * GitHub service for handling GitHub API operations
 * Uses OAuth flow for authentication
 */

import { Octokit } from '@octokit/rest';

// Session storage keys
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
  private octokit: Octokit | null = null;
  private token: string | null = null;
  private user: GitHubUser | null = null;

  constructor() {
    // Try to load token and user from session storage on initialization
    this.token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const userJson = sessionStorage.getItem(USER_STORAGE_KEY);
    if (userJson) {
      try {
        this.user = JSON.parse(userJson);
      } catch (e) {
        console.error('Failed to parse stored user:', e);
      }
    }

    // Initialize Octokit if token exists
    if (this.token) {
      this.octokit = new Octokit({ auth: this.token });
    }
  }

  /**
   * Initialize the GitHub service with authentication token
   * @param params Authentication parameters
   */
  initialize(params: { token: string }) {
    this.token = params.token;
    this.octokit = new Octokit({ auth: params.token });
    sessionStorage.setItem(TOKEN_STORAGE_KEY, params.token);
  }

  /**
   * Redirect to GitHub for OAuth authentication via backend
   */
  redirectToGitHub() {
    // Use the backend endpoint to handle GitHub OAuth redirection
    window.location.href = `${API_URL}/auth/github/login`;
  }

  /**
   * Handle the OAuth callback from GitHub
   * Uses our backend to securely exchange the code for an access token
   */
  async handleAuthCallback(code: string): Promise<void> {
    // If we already have a token, don't try to exchange the code again
    if (this.token && this.isAuthenticated()) {
      console.log('Already authenticated, skipping code exchange');
      return Promise.resolve();
    }
    
    try {
      console.log('Exchanging code for token...');
      
      // Exchange the code for an access token via our backend
      const tokenResponse = await fetch(`${API_URL}/auth/github/callback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code })
      });
      
      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json();
        throw new Error(errorData.error || 'Failed to exchange code for token');
      }
      
      const tokenData = await tokenResponse.json();
      this.token = tokenData.access_token;
      
      // Save token to session storage
      if (this.token) {
        sessionStorage.setItem(TOKEN_STORAGE_KEY, this.token);
        console.log('Token saved to session storage');
      }
      
      // Initialize Octokit with the token
      this.octokit = new Octokit({ auth: this.token });
      
      // Get user data from GitHub API
      await this.getCurrentUser();
      
      return Promise.resolve();
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
    this.octokit = null;
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(USER_STORAGE_KEY);
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
      
      // Try to get user data from our backend first (more secure)
      try {
        if (!this.token) {
          throw new Error('Token is not available');
        }
        
        const userResponse = await fetch(`${API_URL}/auth/github/user`, {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });
        
        if (userResponse.ok) {
          const userData = await userResponse.json();
          this.user = {
            login: userData.login,
            name: userData.name || undefined,
            avatar_url: userData.avatar_url,
            email: userData.email || undefined
          };
          
          // Save to session storage
          sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user));
          return this.user;
        }
      } catch (backendError) {
        console.warn('Failed to get user from backend, falling back to direct API call:', backendError);
      }
      
      // Fallback to direct GitHub API call if backend fails
      if (!this.octokit) {
        this.octokit = new Octokit({ auth: this.token });
      }
      
      const response = await this.octokit.users.getAuthenticated();
      this.user = {
        login: response.data.login,
        name: response.data.name || undefined,
        avatar_url: response.data.avatar_url,
        email: response.data.email || undefined
      };
      
      // Save to session storage
      sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user));
      
      return this.user;
    } catch (error) {
      console.error('Failed to get user information:', error);
      throw error;
    }
  }

  /**
   * Generate a random string of specified length
   */
  private generateRandomString(length: number): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  /**
   * Commit a file to a GitHub repository
   */
  async commitFile(params: CommitFileParams) {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized. Call initialize() first.');
    }
    
    const { owner, repo, path, message, content, branch = 'main' } = params;

    try {
      // First, check if the file already exists to get its SHA
      let fileSha: string | undefined;
      try {
        const fileResponse = await this.octokit.repos.getContent({
          owner,
          repo,
          path,
          ref: branch
        });
        
        // getContent returns either a file or an array of files
        if (!Array.isArray(fileResponse.data)) {
          fileSha = fileResponse.data.sha;
        }
      } catch (err) {
        // File doesn't exist, which is fine for creating a new file
        console.log('File does not exist yet, will create new:', path);
      }

      // Prepare the content by Base64 encoding it
      const contentEncoded = btoa(content);
      
      // Create or update the file
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: contentEncoded,
        sha: fileSha, // Include SHA if updating an existing file
        branch
      });
      
      return response.data;
    } catch (error) {
      console.error('Error loading GitHub session:', error);
    }
  }
}

// Create singleton instance
const githubService = new GitHubService();
export default githubService;
