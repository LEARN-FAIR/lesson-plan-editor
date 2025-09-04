import React, {createContext, useContext, useEffect} from 'react';
import {useQuery} from '@tanstack/react-query';
import githubRepoService, {Repository} from '../services/githubRepoService';
import {useAuth} from './AuthContext';

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
    refetchRepositories: () => {
    }
});

export const useRepositories = () => useContext(RepositoryContext);

export const RepositoryProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    // Get authentication state from AuthContext
    const { isAuthenticated, isLoading: authLoading } = useAuth();
    
    // Use React Query to fetch repositories
    const {
        data: repositories = [],
        isLoading: reposLoading,
        error,
        refetch
    } = useQuery<Repository[], Error>({
        queryKey: ['repositories', isAuthenticated], // Add isAuthenticated as part of the key
        queryFn: () => githubRepoService.getTargetRepoAndForks(),
        staleTime: 5 * 60 * 1000, // 5 minutes
        enabled: isAuthenticated, // Only fetch if authenticated
    });

    // When repositories load, log for debugging
    useEffect(() => {
        if (repositories.length > 0) {
            console.log(`Loaded ${repositories.length} repositories in RepositoryContext`);
        }
    }, [repositories]);
    
    // Calculate combined loading state
    const isLoading = authLoading || (isAuthenticated && reposLoading);

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
