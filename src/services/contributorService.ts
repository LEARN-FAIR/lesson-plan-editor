import githubRepoService from './githubRepoService';

export interface Contributor {
  id: string;
  orcid?: string;
  firstName: string;
  lastName: string;
  git?: string;
}

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';

/**
 * Fetch contributors from the backend API
 * Uses the currently selected repository and branch if available
 */
export const fetchContributors = async (): Promise<Contributor[]> => {
  try {
    // Get the selected repository and branch from the GitHub repo service
    const selectedRepo = githubRepoService.getSelectedRepo();
    const selectedBranch = githubRepoService.getSelectedBranch();
    
    // Build the URL with query parameters if repo and branch are selected
    let url = `${API_URL}/contributors`;
    const params = new URLSearchParams();
    
    if (selectedRepo) {
      params.append('owner', selectedRepo.owner.login);
      params.append('repo', selectedRepo.name);
      
      if (selectedBranch) {
        params.append('branch', selectedBranch);
      }
    }
    
    // Add query parameters if any were set
    if (params.toString()) {
      url = `${url}?${params.toString()}`;
    }
    
    console.log(`Fetching contributors from: ${url}`);
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contributors: ${response.status} ${response.statusText}`);
    }
    
    const contributors = await response.json() as Contributor[];
    return contributors;
  } catch (error) {
    console.error('Error fetching contributors:', error);
    // Fallback to empty array if the API fails
    return [];
  }
};

export const getContributorDisplayName = (contributor: Contributor): string => {
  return `${contributor.firstName} ${contributor.lastName} (${contributor.id})`;
};
