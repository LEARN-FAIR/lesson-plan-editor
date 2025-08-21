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
const SELECTED_BRANCH_KEY = 'selected_github_branch';

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
  url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  forks_count: number;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    url: string;
  } | null;
  topics: string[];
  visibility: string;
  forks: number;
  open_issues: number;
  watchers: number;
}

export interface Branch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

class GitHubRepoService {
  private selectedRepo: Repository | null = null;
  private selectedBranch: string | null = null;

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

    // Try to load selected branch from session storage
    const branch = sessionStorage.getItem(SELECTED_BRANCH_KEY);
    if (branch) {
      this.selectedBranch = branch;
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
        // Check if it's a fork and then check if it's a fork of our target
        if (repo.fork) {
          // For direct API response, we need to check the source property
          if ((repo as any).source) {
            const sourceRepo = (repo as any).source;
            return sourceRepo && sourceRepo.full_name === `${TARGET_OWNER}/${TARGET_REPO}`;
          }
          
          // For repos without source info in the initial response, check the name pattern
          // This is a heuristic and not 100% reliable
          if (repo.name === TARGET_REPO) {
            return true;
          }
          
          // We could make an additional API call to get detailed fork info if needed
          // but for now this basic check should work for most cases
        }
        return false;
      });
      
      console.log('Found user forks:', userForks.length);
      
      repos = [...repos, ...userForks as Repository[]];
      
      return repos;
    } catch (error) {
      console.error('Error fetching repositories:', error);
      throw error;
    }
  }

  /**
   * Search for repositories matching the query
   */
  async searchRepositories(query: string): Promise<Repository[]> {
    try {
      if (!githubService.isAuthenticated()) {
        throw new Error('Not authenticated with GitHub');
      }
      
      const response = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=10`, {
        headers: {
          'Authorization': `Bearer ${sessionStorage.getItem('github_oauth_token')}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.items;
    } catch (error) {
      console.error('Error searching repositories:', error);
      throw error;
    }
  }
  
  /**
   * Get branches for a repository
   */
  async getBranches(owner: string, repo: string): Promise<Branch[]> {
    try {
      if (!githubService.isAuthenticated()) {
        throw new Error('Not authenticated with GitHub');
      }
      
      console.log(`Fetching branches for ${owner}/${repo}`);
      console.log('Auth token exists:', !!sessionStorage.getItem('github_oauth_token'));
      
      // Use Octokit instead of fetch for better error handling
      const octokit = new Octokit({ auth: sessionStorage.getItem('github_oauth_token') });
      
      const response = await octokit.repos.listBranches({
        owner,
        repo,
        per_page: 100
      });
      
      console.log('Branches response:', response.status, response.data.length);
      return response.data as Branch[];
    } catch (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }
  }

  /**
   * Set the selected repository
   */
  setSelectedRepo(repo: Repository | null): void {
    this.selectedRepo = repo;
    if (repo) {
      sessionStorage.setItem(SELECTED_REPO_KEY, JSON.stringify(repo));
      // Reset selected branch when changing repo
      this.setSelectedBranch(null);
    } else {
      sessionStorage.removeItem(SELECTED_REPO_KEY);
      this.setSelectedBranch(null);
    }
  }

  /**
   * Get the selected repository
   */
  getSelectedRepo(): Repository | null {
    return this.selectedRepo;
  }
  
  /**
   * Set the selected branch
   */
  setSelectedBranch(branch: string | null): void {
    this.selectedBranch = branch;
    if (branch) {
      sessionStorage.setItem(SELECTED_BRANCH_KEY, branch);
    } else {
      sessionStorage.removeItem(SELECTED_BRANCH_KEY);
    }
  }
  
  /**
   * Get the selected branch
   */
  getSelectedBranch(): string | null {
    return this.selectedBranch;
  }

  /**
   * Check if a repository is the target repository or its fork
   * @param repo The repository to check
   * @returns True if the repository is the target or its fork, false otherwise
   */
  isTargetRepoOrFork(repo: Repository): boolean {
    // Check if it's the target repository
    if (repo.owner.login === TARGET_OWNER && repo.name === TARGET_REPO) {
      return true;
    }
    
    // Check if it's a fork of the target repository
    if (repo.fork) {
      // If source information is available
      if ((repo as any).source) {
        const sourceRepo = (repo as any).source;
        return sourceRepo && sourceRepo.full_name === `${TARGET_OWNER}/${TARGET_REPO}`;
      }
      
      // Fallback to name matching (less reliable)
      if (repo.name === TARGET_REPO) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Clear the selected repository
   */
  clearSelectedRepo(): void {
    this.selectedRepo = null;
    sessionStorage.removeItem(SELECTED_REPO_KEY);
  }
  
  /**
   * Clear the selected branch
   */
  clearSelectedBranch(): void {
    this.selectedBranch = null;
    sessionStorage.removeItem(SELECTED_BRANCH_KEY);
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

  /**
   * Create a new branch in the selected repository
   * @param branchName Name for the new branch
   * @param sourceBranch Source branch to create from (defaults to the default branch)
   * @returns The newly created branch
   */
  async createBranch(branchName: string, sourceBranch?: string): Promise<Branch> {
    if (!githubService.isAuthenticated()) {
      throw new Error('Not authenticated with GitHub');
    }

    const repo = this.getSelectedRepo();
    if (!repo) {
      throw new Error('No repository selected');
    }

    try {
      const octokit = new Octokit({ auth: sessionStorage.getItem('github_oauth_token') });
      
      // If no source branch is provided, use the current branch or default branch
      const sourceRef = sourceBranch || this.getSelectedBranch() || repo.default_branch;
      
      // Get the SHA of the latest commit on the source branch
      const refResponse = await octokit.git.getRef({
        owner: repo.owner.login,
        repo: repo.name,
        ref: `heads/${sourceRef}`
      });
      
      const sha = refResponse.data.object.sha;
      
      // Create the new branch
      const createRefResponse = await octokit.git.createRef({
        owner: repo.owner.login,
        repo: repo.name,
        ref: `refs/heads/${branchName}`,
        sha
      });
      
      // Format the response to match our Branch interface
      const newBranch: Branch = {
        name: branchName,
        commit: {
          sha,
          url: createRefResponse.data.object.url
        },
        protected: false
      };
      
      // Set this as the selected branch
      this.setSelectedBranch(branchName);
      
      return newBranch;
    } catch (error) {
      console.error('Error creating branch:', error);
      throw error;
    }
  }
}

// Create singleton instance
const githubRepoService = new GitHubRepoService();
export default githubRepoService;
