/**
 * API Adapter for making requests to the backend
 */

/**
 * API Adapter Service
 * 
 * This service adapts frontend API calls to work with the new Symfony backend.
 * It provides a consistent interface for the frontend services while routing
 * requests to the appropriate Symfony endpoints.
 */

// Backend API URL - Update this to point to the Symfony backend
const API_URL = process.env.REACT_APP_API_URL || 'https://localhost:8000/api';


class ApiAdapter {
    constructor() {
        // Initialize the adapter
        void this.checkAuthStatus();
    }
    /**
     * Get the base API URL
     */
    getBaseUrl(): string {
        return API_URL;
    }
    
    // Session-based authentication doesn't need token storage methods
    private isAuthenticated: boolean = false;
    private userData: any = null;
    
    /**
     * Get authentication status
     */
    getAuthStatus(): boolean {
        return this.isAuthenticated;
    }
    
    /**
     * Get user data if authenticated
     */
    getUserData(): any {
        return this.userData;
    }
    
    /**
     * Add necessary headers to request options
     */
    private addHeaders(options: RequestInit = {}): RequestInit {
        const headers: Record<string, string> = {};
        
        // Only add Content-Type for POST or PUT requests
        if (options.method === 'POST' || options.method === 'PUT') {
            headers['Content-Type'] = 'application/json';
        }
        
        return {
            ...options,
            headers: {
                ...options.headers,
                ...headers
            },
            credentials: 'include' // Include cookies in all requests
        };
    }

    /**
     * Make an authenticated API request using session cookies
     */
    private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
        const response = await fetch(`${API_URL}${endpoint}`, this.addHeaders(options));
        
        if (!response.ok) {
            let errorMessage = `API request failed: ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
                
                // If unauthorized, update authentication status
                if (response.status === 401) {
                    this.isAuthenticated = false;
                    this.userData = null;
                }
            } catch (e) {
                // If parsing fails, use the default error message
            }
            throw new Error(errorMessage);
        }
        
        return await response.json() as T;
    }

    // ===== Auth Endpoints =====

    /**
     * Get GitHub OAuth login URL
     */
    getGitHubLoginUrl(redirectUrl?: string): string {
        let loginUrl = `${API_URL}/auth/github`;
        
        if (redirectUrl) {
            const encodedRedirectUrl = encodeURIComponent(redirectUrl);
            loginUrl += `?redirect_url=${encodedRedirectUrl}`;
        }
        
        return loginUrl;
    }

    /**
     * Check for authentication success in URL fragment after OAuth callback
     * Returns true if authentication was successful
     */
    checkAuthSuccessInUrl(): boolean {
        const hash = window.location.hash;
        if (hash && hash.includes('auth=success')) {
            // Remove the auth parameter from the URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return true;
        }
        return false;
    }

    // ===== GitHub User Endpoints =====

    /**
     * Get user information from GitHub
     */
    async getUserInfo(): Promise<any> {
        return this.request('/github/user');
    }
    
    /**
     * Check if the user is authenticated using session
     */
    async checkAuthStatus(): Promise<any> {
        try {
            const response = await this.request<{authenticated: boolean, user?: any}>('/auth/status');
            this.isAuthenticated = response.authenticated;
            this.userData = response.user || null;
            return response;
        } catch (error) {
            this.isAuthenticated = false;
            this.userData = null;
            return { authenticated: false };
        }
    }
    
    /**
     * Logout user by clearing session on the server
     */
    async logout(): Promise<any> {
        try {
            // Notify backend to clear session
            await this.request('/auth/logout', { method: 'POST' });
            this.isAuthenticated = false;
            this.userData = null;
            return { success: true };
        } catch (error) {
            console.error('Logout error:', error);
            return { success: false, error: 'Failed to logout' };
        }
    }

    // ===== GitHub Repository Endpoints =====

    /**
     * Get target repository and its forks
     */
    async getTargetRepoAndForks(): Promise<any> {
        return this.request('/github/repositories');
    }

    /**
     * Search repositories
     */
    async searchRepositories(query: string): Promise<any> {
        return this.request(`/github/repositories?q=${encodeURIComponent(query)}`);
    }

    /**
     * Check repository access
     */
    async checkRepositoryAccess(owner: string, repo: string): Promise<any> {
        return this.request(`/github/repository/access?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`);
    }

    /**
     * Get repository branches
     */
    async getRepositoryBranches(owner: string, repo: string): Promise<any> {
        const repoInfo = await this.checkRepositoryAccess(owner, repo);
        return repoInfo.branches || [];
    }

    /**
     * Create a fork of the target repository
     */
    async createFork(): Promise<any> {
        // This would need to be implemented in the Symfony backend
        throw new Error('Fork creation not yet implemented in Symfony backend');
    }

    /**
     * Create a new branch
     */
    async createBranch(owner: string, repo: string, branchName: string, sourceBranch: string): Promise<any> {
        // This would need to be implemented in the Symfony backend
        throw new Error('Branch creation not yet implemented in Symfony backend');
    }

    // ===== Lesson Plan Endpoints =====

    /**
     * Get all lesson plans
     */
    async getLessonPlans(owner: string, repo: string, branch?: string): Promise<any> {
        let url = `/lesson-plans?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}`;
        if (branch) {
            url += `&branch=${encodeURIComponent(branch)}`;
        }
        return this.request(url);
    }

    /**
     * Get a specific lesson plan
     */
    async getLessonPlan(owner: string, repo: string, path: string, branch?: string): Promise<any> {
        let url = `/lesson-plans/file?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(path)}`;
        if (branch) {
            url += `&branch=${encodeURIComponent(branch)}`;
        }
        return this.request(url);
    }

    /**
     * Save a lesson plan
     */
    async saveLessonPlan(owner: string, repo: string, path: string, content: string, commitMessage: string, sha?: string, branch?: string): Promise<any> {
        return this.request('/lesson-plans/file', {
            method: 'POST',
            body: JSON.stringify({
                owner,
                repo,
                path,
                content,
                commitMessage,
                sha,
                branch
            })
        });
    }

    /**
     * Get file content from GitHub
     */
    async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
        const lessonPlan = await this.getLessonPlan(owner, repo, path, branch);
        return lessonPlan.decodedContent || '';
    }

    /**
     * Get commits for a branch
     */
    async getBranchCommits(owner: string, repo: string, branch: string): Promise<any[]> {
        return this.request(`/github/repository/${owner}/${repo}/commits?branch=${encodeURIComponent(branch)}`);
    }
}

// Create singleton instance
const apiAdapter = new ApiAdapter();
export default apiAdapter;

// Initialize the API adapter when this module is loaded
