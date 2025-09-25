/**
 * GitHub repository service for repository operations
 * All GitHub API calls are now routed through the backend
 */

import githubService from './githubService';
import apiAdapter from './apiAdapter';

// Target repository and its forks
const TARGET_REPO = 'ELIXIR-TrP-FAIR-Converge';
const TARGET_OWNER = 'elixir-europe-training';

// Local storage keys
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

    /**
     * Get the target repository and its forks
     * Only returns repositories that the user has access to
     */
    async getTargetRepoAndForks(): Promise<Repository[]> {
        if (!githubService.isAuthenticated()) {
            throw new Error('Not authenticated with GitHub');
        }

        try {
            return await apiAdapter.getTargetRepoAndForks();
        } catch (error) {
            console.error('Error fetching repositories:', error);
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

            const branches = await apiAdapter.getRepositoryBranches(owner, repo);
            return branches;
        } catch (error) {
            console.error('Error fetching branches:', error);
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
            console.error('No repository selected in githubRepoService');
            throw new Error('No repository selected. Please ensure you are logged in and have selected a repository.');
        }

        try {
            // If no source branch is provided, use the current branch or default branch
            const sourceRef = sourceBranch || this.getSelectedBranch() || repo.default_branch;

            const newBranch = await apiAdapter.createBranch(repo.owner.login, repo.name, branchName, sourceRef);

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
