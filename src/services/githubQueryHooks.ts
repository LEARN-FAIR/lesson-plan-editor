import {useQuery} from '@tanstack/react-query';
import githubService from './githubService';

/**
 * React Query hook for checking if a branch has commits
 */
export const useHasCommitsOnBranch = (owner: string, repo: string, branch: string) => {
    return useQuery({
        queryKey: ['hasCommitsOnBranch', owner, repo, branch],
        queryFn: () => githubService.hasCommitsOnBranch(owner, repo, branch),
        // Only run if all parameters are provided
        enabled: !!owner && !!repo && !!branch,
        // Keep data fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * React Query hook for getting file content from GitHub
 */
export const useFileContent = (owner: string, repo: string, path: string, branch: string) => {
    return useQuery({
        queryKey: ['fileContent', owner, repo, path, branch],
        queryFn: () => githubService.getFileContent(owner, repo, path, branch),
        // Only run if all parameters are provided
        enabled: !!owner && !!repo && !!path && !!branch,
        // Keep data fresh for 5 minutes
        staleTime: 5 * 60 * 1000,
    });
};

/**
 * React Query hook for checking if a file has uncommitted changes
 */
export const useHasUncommittedChanges = (
    owner: string,
    repo: string,
    path: string,
    content: string,
    branch: string
) => {
    // Use the fileContent query to get the cached GitHub content
    const fileContentQuery = useFileContent(owner, repo, path, branch);
    
    // Compare local content with cached GitHub content
    return useQuery({
        queryKey: ['hasUncommittedChanges', owner, repo, path, branch],
        queryFn: async () => {
            // Log the current state to help with debugging
            console.log('useHasUncommittedChanges state:', {
                fileContentQueryStatus: fileContentQuery.status,
                fileContentQueryData: fileContentQuery.data,
                hasLocalContent: !!content,
                localContentLength: content?.length
            });
            
            // If we have cached GitHub content, compare directly without an API call
            if (fileContentQuery.data !== undefined) {
                const githubContent = fileContentQuery.data || '';
                
                // Normalize line endings and whitespace for comparison
                const normalizedGithubContent = githubContent.replace(/\r\n/g, '\n').trim();
                const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
                
                console.log('Content comparison:', {
                    normalizedGithubContentLength: normalizedGithubContent.length,
                    normalizedLocalContentLength: normalizedLocalContent.length,
                    isDifferent: normalizedGithubContent !== normalizedLocalContent
                });
                
                return normalizedGithubContent !== normalizedLocalContent;
            }
            
            // If fileContent query failed, try to refetch it
            if (fileContentQuery.isError) {
                console.warn('File content query failed, attempting to refetch');
                const refetchResult = await fileContentQuery.refetch();
                
                // If refetch succeeded, try again with the new data
                if (refetchResult.data !== undefined) {
                    const githubContent = refetchResult.data || '';
                    const normalizedGithubContent = githubContent.replace(/\r\n/g, '\n').trim();
                    const normalizedLocalContent = content.replace(/\r\n/g, '\n').trim();
                    return normalizedGithubContent !== normalizedLocalContent;
                }
            }
            
            // Fallback to API call if no cached content or refetch failed
            console.log('Falling back to direct API call for uncommitted changes check');
            return githubService.hasUncommittedChanges(owner, repo, path, content, branch);
        },
        // Only run if all parameters are provided
        enabled: !!owner && !!repo && !!path && !!content && !!branch,
        // Keep data fresh for 1 minute
        staleTime: 60 * 1000,
        // Retry failed queries
        retry: 2,
    });
};

/**
 * React Query hook for fetching the current GitHub user
 */
export const useGitHubUser = () => {
    return useQuery({
        queryKey: ['githubUser'],
        queryFn: () => githubService.getCurrentUser(),
        // Only run if the user is authenticated
        enabled: githubService.isAuthenticated(),
        // Keep data fresh for 30 minutes
        staleTime: 30 * 60 * 1000,
        // Don't refetch on window focus since user data rarely changes during a session
        refetchOnWindowFocus: false,
    });
};
