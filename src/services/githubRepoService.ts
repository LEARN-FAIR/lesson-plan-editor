/**
 * GitHub repository service for repository operations
 */

import githubService from './githubService';
import { Octokit } from '@octokit/rest';

// Target repository and its forks
const TARGET_REPO = 'ELIXIR-TrP-FAIR-Converge';
const TARGET_OWNER = 'elixir-europe-training';

// Session storage keys
const SELECTED_REPO_KEY = 'selected_github_repo';

// Extended interface for GitHub repository with additional properties we need
export interface Repository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
  fork: boolean;
  default_branch: string;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  // Custom property for fork source information
  source?: {
    full_name: string;
  };
}

class GitHubRepoService {
  private selectedRepo: Repository | null = null;

  constructor() {
    // Try to load selected repo from session storage
    const repoJson = sessionStorage.getItem(SELECTED_REPO_KEY);
    if (repoJson) {
      try {
        this.selectedRepo = JSON.parse(repoJson);
      } catch (e) {
        console.error('Failed to parse stored repo:', e);
      }
    }
  }

  /**
   * Get the target repository and its forks
   * Only returns repositories that the user has access to
   */
  async getTargetRepoAndForks(): Promise<Repository[]> {
    if (!githubService.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const octokit = new Octokit({ auth: sessionStorage.getItem('github_oauth_token') });
      
      // First check if the user has access to the target repository
      let repos: Repository[] = [];
      
      try {
        // Check if user has access to the original repository
        const targetRepoResponse = await octokit.repos.get({
          owner: TARGET_OWNER,
          repo: TARGET_REPO
        });
        
        repos.push(targetRepoResponse.data as Repository);
      } catch (error) {
        console.log('User does not have access to the original repository');
      }
      
      // Get user's repositories
      const userReposResponse = await octokit.repos.listForAuthenticatedUser({
        per_page: 100
      });
      
      // Filter to only include forks of the target repository
      const userForks = userReposResponse.data.filter(repo => {
        // Check if it's a fork and then check the source repository
        if (repo.fork) {
          // Get the source repository details to check if it's a fork of our target
          try {
            const sourceRepo = (repo as any).source;
            return sourceRepo && sourceRepo.full_name === `${TARGET_OWNER}/${TARGET_REPO}`;
          } catch (e) {
            return false;
          }
        }
        return false;
      });
      
      repos = [...repos, ...userForks as Repository[]];
      
      return repos;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw error;
    }
  }

  /**
   * Set the selected repository
   */
  setSelectedRepo(repo: Repository): void {
    this.selectedRepo = repo;
    sessionStorage.setItem(SELECTED_REPO_KEY, JSON.stringify(repo));
  }

  /**
   * Get the selected repository
   */
  getSelectedRepo(): Repository | null {
    return this.selectedRepo;
  }

  /**
   * Clear the selected repository
   */
  clearSelectedRepo(): void {
    this.selectedRepo = null;
    sessionStorage.removeItem(SELECTED_REPO_KEY);
  }

  /**
   * Check if a repository is selected
   */
  hasSelectedRepo(): boolean {
    return this.selectedRepo !== null;
  }

  /**
   * Create a fork of the target repository if the user doesn't have one
   */
  async createFork(): Promise<Repository> {
    if (!githubService.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    try {
      const octokit = new Octokit({ auth: sessionStorage.getItem('github_oauth_token') });
      
      const forkResponse = await octokit.repos.createFork({
        owner: TARGET_OWNER,
        repo: TARGET_REPO
      });
      
      const newFork = forkResponse.data as Repository;
      this.setSelectedRepo(newFork);
      
      return newFork;
    } catch (error) {
      console.error('Error creating fork:', error);
      throw error;
    }
  }
}

// Create singleton instance
const githubRepoService = new GitHubRepoService();
export default githubRepoService;
