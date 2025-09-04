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

    constructor() {
        // Try to load selected repo from local storage
        const repoJson = localStorage.getItem(SELECTED_REPO_KEY);
        if (repoJson) {
            try {
                this.selectedRepo = JSON.parse(repoJson);
            } catch (e) {
                console.error('Failed to parse stored repo:', e);
            }
        }

        // Try to load selected branch from local storage
        const branch = localStorage.getItem(SELECTED_BRANCH_KEY);
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
            const repos = await apiAdapter.getTargetRepoAndForks();
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

            const data = await apiAdapter.searchRepositories(query);
            return data;
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

            const branches = await apiAdapter.getRepositoryBranches(owner, repo);
            return branches;
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
            localStorage.setItem(SELECTED_REPO_KEY, JSON.stringify(repo));
            // Reset selected branch when changing repo
            this.setSelectedBranch(null);
        } else {
            localStorage.removeItem(SELECTED_REPO_KEY);
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
            localStorage.setItem(SELECTED_BRANCH_KEY, branch);
        } else {
            localStorage.removeItem(SELECTED_BRANCH_KEY);
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
        localStorage.removeItem(SELECTED_REPO_KEY);
    }

    /**
     * Clear the selected branch
     */
    clearSelectedBranch(): void {
        this.selectedBranch = null;
        localStorage.removeItem(SELECTED_BRANCH_KEY);
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
            const newFork = await apiAdapter.createFork();
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
