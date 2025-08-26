import {useQuery} from '@tanstack/react-query';
import githubRepoService, {Branch, Repository} from './githubRepoService';

/**
 * React Query hook to fetch repositories and forks
 * @returns Query result with repositories data
 */
export const useRepositoriesAndForks = () => {
  return useQuery<Repository[], Error>({
    queryKey: ['repositories'],
    queryFn: () => githubRepoService.getTargetRepoAndForks(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always fetch repositories when the component mounts
  });
};

/**
 * React Query hook to fetch branches
 * @param owner The repository owner
 * @param repo The repository name
 * @returns Query result with branches data
 */
export const useBranches = (owner?: string, repo?: string) => {
  return useQuery<Branch[], Error>({
    queryKey: ['branches', owner, repo],
    queryFn: async () => {
      if (!owner || !repo) {
        return [];
      }
      return await githubRepoService.getBranches(owner, repo);
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: !!owner && !!repo, // Only run the query if owner and repo are provided
  });
};
