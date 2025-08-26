import React, { createContext, useContext, useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import githubRepoService, { Repository } from '../services/githubRepoService';

interface RepositoryContextType {
  repositories: Repository[];
  isLoading: boolean;
  error: Error | null;
  refetchRepositories: () => void;
}

const RepositoryContext = createContext<RepositoryContextType>({
  repositories: [],
  isLoading: false,
  error: null,
  refetchRepositories: () => {}
});

export const useRepositories = () => useContext(RepositoryContext);

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use React Query to fetch repositories
  const { 
    data: repositories = [], 
    isLoading, 
    error,
    refetch
  } = useQuery<Repository[], Error>({
    queryKey: ['repositories'],
    queryFn: () => githubRepoService.getTargetRepoAndForks(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!sessionStorage.getItem('github_oauth_token'), // Only fetch if authenticated
  });

  // When repositories load, log them for debugging
  useEffect(() => {
    if (repositories.length > 0) {
      console.log(`Loaded ${repositories.length} repositories in RepositoryContext`);
    }
  }, [repositories]);

  const value = {
    repositories,
    isLoading,
    error: error as Error | null,
    refetchRepositories: refetch
  };

  return (
    <RepositoryContext.Provider value={value}>
      {children}
    </RepositoryContext.Provider>
  );
};
