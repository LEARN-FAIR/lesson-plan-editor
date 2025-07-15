/**
 * GitHub service for handling GitHub API operations
 * Uses OAuth flow for authentication
 */

import { Octokit } from '@octokit/rest';

// Session storage keys
const TOKEN_STORAGE_KEY = 'github_oauth_token';
const USER_STORAGE_KEY = 'github_user';

// Configuration
const CLIENT_ID = 'Iv23liKrIx8ddAZ4XLwU'; // Replace with your GitHub OAuth App client ID
const REDIRECT_URI = `${window.location.origin}/github-callback`;
const SCOPE = 'repo'; // Permissions needed

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
   * Redirect to GitHub for OAuth authentication
   */
  redirectToGitHub() {
    const params = new URLSearchParams({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: SCOPE,
      state: this.generateRandomString(32)
    });
    
    // Redirect to GitHub OAuth login page
    window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle the OAuth callback from GitHub
   * NOTE: In a production app, this should be handled by a backend service
   * to keep client_secret secure. This is just a mock implementation.
   */
  async handleAuthCallback(code: string): Promise<void> {
    // This is a mock implementation for demonstration
    // In a real app, you would send the code to your backend
    // and the backend would make the token exchange request
    
    // Simulate token exchange
    this.token = `mock_oauth_token_${this.generateRandomString(16)}`;
    sessionStorage.setItem(TOKEN_STORAGE_KEY, this.token);
    this.octokit = new Octokit({ auth: this.token });
    
    // Get mock user data
    this.user = {
      login: 'mockuser',
      name: 'Mock User',
      avatar_url: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
      email: 'mock@example.com'
    };
    
    sessionStorage.setItem(USER_STORAGE_KEY, JSON.stringify(this.user));
    return Promise.resolve();
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
    if (!this.octokit) {
      throw new Error('GitHub client not initialized. Call initialize() first.');
    }

    try {
      // If we already have user data, return it
      if (this.user) {
        return this.user;
      }
      
      // Otherwise fetch from API
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
