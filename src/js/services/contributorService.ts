import apiAdapter from './apiAdapter';
import logger from '../utils/logger';

export interface Contributor {
    id: number;
    login: string;
    avatar_url: string;
    html_url: string;
    contributions: number;
    type: string;
}

/**
 * Fetch contributors for the specified repository and branch
 * @param owner Repository owner
 * @param repo Repository name
 * @param branch Branch name
 * @returns Promise<Contributor[]> Array of contributors
 */
export const fetchContributors = async (owner: string, repo: string, branch?: string): Promise<Contributor[]> => {
    try {
        // Use the ApiAdapter to fetch contributors
        const contributors = await apiAdapter.getContributors(
            owner,
            repo,
            branch || undefined
        );
        
        return contributors as Contributor[];
    } catch (error) {
        logger.error('Error fetching contributors:', error);
        // Fallback to empty array if the API fails
        return [];
    }
};

export const getContributorDisplayName = (contributor: Contributor): string => {
    return `${contributor.firstName} ${contributor.lastName} (${contributor.id})`;
};
