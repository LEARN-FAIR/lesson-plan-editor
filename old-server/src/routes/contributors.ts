import express from 'express';
import {fetchContributors} from '../services/contributorService';

export const contributorsRouter = express.Router();

// GET /api/contributors
// Query parameters:
// - owner: Repository owner (organization or username)
// - repo: Repository name
// - branch: Branch name
contributorsRouter.get('/', async (req, res) => {
    try {
        const {owner, repo, branch} = req.query;

        // Convert query parameters to strings or use undefined
        const ownerStr = owner ? String(owner) : undefined;
        const repoStr = repo ? String(repo) : undefined;
        const branchStr = branch ? String(branch) : undefined;

        console.log(`Fetching contributors for: ${ownerStr || 'default'}/${repoStr || 'default'} (${branchStr || 'default branch'})`);

        const contributors = await fetchContributors(ownerStr, repoStr, branchStr);
        res.status(200).json(contributors);
    } catch (error) {
        console.error('Error in contributors route:', error);
        res.status(500).json({error: 'Failed to fetch contributors'});
    }
});
