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
    
    // Cache for auth status to prevent multiple calls
    private authStatusCache: { timestamp: number; data: any } | null = null;
    private readonly AUTH_CACHE_TTL = 30000; // 30 seconds cache TTL
    
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
     * Uses a cache to prevent multiple calls within a short time period
     */
    async checkAuthStatus(): Promise<any> {
        // Check if we have a valid cache entry
        const now = Date.now();
        if (this.authStatusCache && (now - this.authStatusCache.timestamp < this.AUTH_CACHE_TTL)) {
            console.log('Using cached auth status');
            return this.authStatusCache.data;
        }

        try {
            console.log('Fetching fresh auth status');
            const response = await this.request<{authenticated: boolean, user?: any}>('/auth/status');
            this.isAuthenticated = response.authenticated;
            this.userData = response.user || null;
            
            // Update the cache
            this.authStatusCache = {
                timestamp: now,
                data: response
            };
            
            return response;
        } catch (error) {
            console.error('Error checking auth status:', error);
            this.isAuthenticated = false;
            this.userData = null;
            this.authStatusCache = null; // Clear cache on error
            throw error;
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
            this.authStatusCache = null; // Clear auth cache on logout
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
        const branchNames = repoInfo.branches || [];
        
        // Convert string branch names to Branch objects
        return branchNames.map((branchName: string) => ({
            name: branchName,
            commit: {
                sha: '', // We don't have this information from the backend
                url: ''
            },
            protected: false // We don't have this information from the backend
        }));
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
     * Get contributors from GitHub repository
     * @param owner Repository owner (organization or username)
     * @param repo Repository name
     * @param branch Branch name
     * @returns Array of contributors
     */
    async getContributors(owner?: string, repo?: string, branch?: string): Promise<any[]> {
        // Build query parameters
        const params = new URLSearchParams();
        if (owner) params.append('owner', owner);
        if (repo) params.append('repo', repo);
        if (branch) params.append('branch', branch);

        // Create endpoint with query parameters
        const endpoint = `/contributors${params.toString() ? `?${params.toString()}` : ''}`;
        
        console.log(`Fetching contributors from API: ${endpoint}`);
        return this.request<any[]>(endpoint);
    }

    /**
     * Get file content from GitHub
     */
    async getFileContent(owner: string, repo: string, path: string, branch: string): Promise<string> {
        // Add stack trace to debug where the API call is coming from
        const stackTrace = new Error().stack;
        console.log('🚨 ACTUAL API CALL to file endpoint:', { owner, repo, path, branch });
        console.log('Called from:', stackTrace);
        
        try {
            const lessonPlan = await this.getLessonPlan(owner, repo, path, branch);
            console.log('File content response received');
            
            // Process the response
            let content = '';
            
            // Check if we have decoded content
            if (lessonPlan && lessonPlan.decodedContent !== undefined) {
                content = lessonPlan.decodedContent;
            } else if (lessonPlan && lessonPlan.content) {
                // Try to use content if decodedContent is not available
                try {
                    // Content might be base64 encoded
                    // Use TextDecoder to properly handle UTF-8 encoding
                    const base64 = lessonPlan.content.replace(/\s/g, '');
                    const binary = atob(base64);
                    const bytes = new Uint8Array(binary.length);
                    for (let i = 0; i < binary.length; i++) {
                        bytes[i] = binary.charCodeAt(i);
                    }
                    content = new TextDecoder('utf-8').decode(bytes);
                } catch (e) {
                    console.warn('Error decoding base64 content:', e);
                    // If not base64, return as is
                    content = lessonPlan.content;
                }
            } else {
                // If we can't get content, return empty string
                console.warn('No content found for file:', path);
            }
            
            return content;
        } catch (error) {
            console.error('Error getting file content:', error);
            throw error;
        }
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
