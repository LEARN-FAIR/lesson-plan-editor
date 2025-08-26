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
    return useQuery({
        queryKey: ['hasUncommittedChanges', owner, repo, path, branch, content.length],
        queryFn: () => githubService.hasUncommittedChanges(owner, repo, path, content, branch),
        // Only run if all parameters are provided
        enabled: !!owner && !!repo && !!path && !!content && !!branch,
        // Keep data fresh for 1 minute since content might change frequently
        staleTime: 60 * 1000,
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
