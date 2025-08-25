import { useQuery } from '@tanstack/react-query';
import { fetchContributors, Contributor } from './contributorService';

/**
 * React Query hook to fetch contributors
 * @returns Query result with contributors data
 */
export const useContributors = () => {
  return useQuery<Contributor[], Error>({
    queryKey: ['contributors'],
    queryFn: () => fetchContributors(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: true, // Always fetch contributors when the component mounts
  });
};
