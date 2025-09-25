import githubRepoService from './githubRepoService';
import apiAdapter from './apiAdapter';

export interface Contributor {
    id: string;
    orcid?: string;
    firstName: string;
    lastName: string;
    git?: string;
}

/**
 * Fetch contributors from the backend API
 * Uses the currently selected repository and branch if available
 */
export const fetchContributors = async (): Promise<Contributor[]> => {
    try {
        // Get the selected repository and branch from the GitHub repo service
        const selectedRepo = githubRepoService.getSelectedRepo();
        const selectedBranch = githubRepoService.getSelectedBranch();

        // Use the ApiAdapter to fetch contributors
        const contributors = await apiAdapter.getContributors(
            selectedRepo?.owner.login,
            selectedRepo?.name,
            selectedBranch || undefined
        );
        
        return contributors as Contributor[];
    } catch (error) {
        console.error('Error fetching contributors:', error);
        // Fallback to empty array if the API fails
        return [];
    }
};

export const getContributorDisplayName = (contributor: Contributor): string => {
    return `${contributor.firstName} ${contributor.lastName} (${contributor.id})`;
};
