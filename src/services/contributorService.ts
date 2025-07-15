import yaml from 'yaml';

export interface Contributor {
  id: string;
  orcid?: string;
  firstName: string;
  lastName: string;
  git?: string;
}

const CONTRIBUTORS_URL = 'https://raw.githubusercontent.com/elixir-europe-training/ELIXIR-TrP-FAIR-Converge/refs/heads/main/_data/contributors.yaml';

export const fetchContributors = async (): Promise<Contributor[]> => {
  try {
    const response = await fetch(CONTRIBUTORS_URL);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch contributors: ${response.status} ${response.statusText}`);
    }
    
    const yamlText = await response.text();
    const contributors = yaml.parse(yamlText) as Contributor[];
    
    return contributors;
  } catch (error) {
    console.error('Error fetching contributors:', error);
    return [];
  }
};

export const getContributorDisplayName = (contributor: Contributor): string => {
  return `${contributor.firstName} ${contributor.lastName} (${contributor.id})`;
};
