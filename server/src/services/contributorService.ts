import axios from 'axios';
import yaml from 'yaml';

export interface Contributor {
    id: string;
    orcid?: string;
    firstName: string;
    lastName: string;
    git?: string;
}

// Default repository and branch if not specified
const DEFAULT_OWNER = 'elixir-europe-training';
const DEFAULT_REPO = 'ELIXIR-TrP-FAIR-Converge';
const DEFAULT_BRANCH = 'main';
const CONTRIBUTORS_PATH = '_data/contributors.yaml';

/**
 * Fetch contributors from a GitHub repository's YAML file
 * @param owner Repository owner (organization or username)
 * @param repo Repository name
 * @param branch Branch name
 * @returns Array of contributors
 */
export const fetchContributors = async (
    owner: string = DEFAULT_OWNER,
    repo: string = DEFAULT_REPO,
    branch: string = DEFAULT_BRANCH
): Promise<Contributor[]> => {
    try {
        const contributorsUrl = `https://raw.githubusercontent.com/${owner}/${repo}/refs/heads/${branch}/${CONTRIBUTORS_PATH}`;
        console.log(`Fetching contributors from: ${contributorsUrl}`);

        const response = await axios.get(contributorsUrl);

        if (response.status !== 200) {
            throw new Error(`Failed to fetch contributors: ${response.status} ${response.statusText}`);
        }

        const yamlText = response.data;
        const contributors = yaml.parse(yamlText) as Contributor[];

        return contributors;
    } catch (error) {
        console.error('Error fetching contributors:', error);
        return [];
    }
};
