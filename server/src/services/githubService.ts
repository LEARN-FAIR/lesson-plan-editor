import {Octokit} from '@octokit/rest';
import axios from 'axios';

// Target repository and its forks
const TARGET_REPO = 'ELIXIR-TrP-FAIR-Converge';
const TARGET_OWNER = 'elixir-europe-training';

// Types for file parameters
export interface CommitFileParams {
    owner: string;      // GitHub username or organization name
    repo: string;       // Repository name
    path: string;       // File path within the repository
    message: string;    // Commit message
    content: string;    // File content to commit
    branch?: string;    // Target branch (default: main/master)
    token: string;      // GitHub access token
}

// User info from GitHub API
export interface GitHubUser {
    login: string;
    name?: string;
    avatar_url: string;
    email?: string;
}

// Repository interface
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

class GitHubService {
    /**
     * Get user information using the access token
     */
    async getCurrentUser(token: string): Promise<GitHubUser> {
        try {
            const userResponse = await axios.get('https://api.github.com/user', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            return {
                login: userResponse.data.login,
                name: userResponse.data.name || undefined,
                avatar_url: userResponse.data.avatar_url,
                email: userResponse.data.email || undefined
            };
        } catch (error) {
            console.error('Error fetching GitHub user:', error);
            throw error;
        }
    }

    /**
     * Check if the user has write access to a repository
     */
    async checkRepositoryWriteAccess(owner: string, repo: string, token: string): Promise<boolean> {
        try {
            const octokit = new Octokit({auth: token});

            // Get repository permissions for the authenticated user
            const repoResponse = await octokit.repos.get({
                owner,
                repo
            });

            // Check if the user has push access
            const permissions = repoResponse.data.permissions;
            return permissions?.push === true;
        } catch (error) {
            console.error('Error checking repository permissions:', error);
            return false;
        }
    }

    /**
     * Commit a file to a GitHub repository
     */
    async commitFile(params: CommitFileParams) {
        const {owner, repo, path, message, content, branch = 'main', token} = params;
        const octokit = new Octokit({auth: token});

        try {
            // First, check if the file already exists to get its SHA
            let fileSha: string | undefined;
            try {
                const fileResponse = await octokit.repos.getContent({
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

            // Prepare the content by Base64 encoding it with Unicode support
            // Use a Unicode-safe base64 encoding to handle non-Latin1 characters
            const contentEncoded = Buffer.from(content).toString('base64');

            // Create or update the file
            const response = await octokit.repos.createOrUpdateFileContents({
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
            console.error('Error committing file to GitHub:', error);
            throw error;
        }
    }

    /**
     * Get the target repository and its forks
     */
    async getTargetRepoAndForks(token: string): Promise<Repository[]> {
        try {
            const octokit = new Octokit({auth: token});

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
                    if (repo.name === TARGET_REPO) {
                        return true;
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
     * Search for repositories matching the query
     */
    async searchRepositories(query: string, token: string): Promise<Repository[]> {
        try {
            const response = await axios.get(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=updated&order=desc&per_page=10`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.status) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            return response.data.items;
        } catch (error) {
            console.error('Error searching repositories:', error);
            throw error;
        }
    }

    /**
     * Get branches for a repository
     */
    async getBranches(owner: string, repo: string, token: string): Promise<Branch[]> {
        try {
            const octokit = new Octokit({auth: token});

            const response = await octokit.repos.listBranches({
                owner,
                repo,
                per_page: 100
            });

            return response.data as Branch[];
        } catch (error) {
            console.error('Error fetching branches:', error);
            throw error;
        }
    }

    /**
     * Create a fork of the target repository
     */
    async createFork(token: string): Promise<Repository> {
        try {
            const octokit = new Octokit({auth: token});

            const forkResponse = await octokit.repos.createFork({
                owner: TARGET_OWNER,
                repo: TARGET_REPO
            });

            return forkResponse.data as Repository;
        } catch (error) {
            console.error('Error creating fork:', error);
            throw error;
        }
    }

    /**
     * Create a new branch in a repository
     */
    async createBranch(owner: string, repo: string, branchName: string, sourceBranch: string, token: string): Promise<Branch> {
        try {
            const octokit = new Octokit({auth: token});

            // Get the SHA of the latest commit on the source branch
            const refResponse = await octokit.git.getRef({
                owner,
                repo,
                ref: `heads/${sourceBranch}`
            });

            const sha = refResponse.data.object.sha;

            // Create the new branch
            const createRefResponse = await octokit.git.createRef({
                owner,
                repo,
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

            return newBranch;
        } catch (error) {
            console.error('Error creating branch:', error);
            throw error;
        }
    }

    /**
     * Check if there are commits on a branch
     * @param owner Repository owner
     * @param repo Repository name
     * @param branch Branch name
     * @param token GitHub access token
     * @returns Array of commits on the branch
     */
    async getCommitsOnBranch(owner: string, repo: string, branch: string, token: string): Promise<any[]> {
        try {
            const octokit = new Octokit({auth: token});

            const response = await octokit.repos.listCommits({
                owner,
                repo,
                sha: branch,
                per_page: 10 // Limit to 10 commits for performance
            });

            return response.data;
        } catch (error) {
            console.error('Error checking branch commits:', error);
            throw error;
        }
    }

    /**
     * Get file content from a repository
     * @param owner Repository owner
     * @param repo Repository name
     * @param path File path
     * @param branch Branch name
     * @param token GitHub access token
     * @returns File content as a string
     */
    async getFileContent(owner: string, repo: string, path: string, branch: string, token: string): Promise<string> {
        try {
            const octokit = new Octokit({auth: token});

            const response = await octokit.repos.getContent({
                owner,
                repo,
                path,
                ref: branch
            });

            // getContent returns either a file or an array of files
            if (Array.isArray(response.data)) {
                throw new Error('Path is a directory, not a file');
            }

            // Check if response.data has the expected structure
            if (!('content' in response.data)) {
                throw new Error('Unexpected response format from GitHub API');
            }

            // Get the content and decode from base64
            const content = response.data.content;
            const decoded = Buffer.from(content, 'base64').toString('utf-8');

            return decoded;
        } catch (error) {
            console.error('Error getting file content:', error);
            throw error;
        }
    }
}

// Create singleton instance
const githubService = new GitHubService();
export default githubService;
