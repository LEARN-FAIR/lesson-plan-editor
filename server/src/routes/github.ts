import express from 'express';
import githubService from '../services/githubService';

export const githubRouter = express.Router();

// Middleware to verify token
const verifyToken = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  
  // Initialize req.body if it doesn't exist (for GET requests)
  if (!req.body) {
    req.body = {};
  }
  
  req.body.token = authHeader.split(' ')[1];
  next();
};

// Get current user
githubRouter.get('/user', verifyToken, async (req, res) => {
  try {
    const user = await githubService.getCurrentUser(req.body.token);
    return res.json(user);
  } catch (error) {
    console.error('Error fetching GitHub user:', error);
    return res.status(500).json({ error: 'Failed to fetch user information' });
  }
});

// Check repository write access
githubRouter.get('/repo/:owner/:repo/access', verifyToken, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const hasAccess = await githubService.checkRepositoryWriteAccess(owner, repo, req.body.token);
    return res.json({ hasAccess });
  } catch (error) {
    console.error('Error checking repository access:', error);
    return res.status(500).json({ error: 'Failed to check repository access' });
  }
});

// Commit file to repository
githubRouter.post('/repo/:owner/:repo/commit', verifyToken, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { path, message, content, branch, token } = req.body;
    
    if (!path || !message || !content) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const result = await githubService.commitFile({
      owner,
      repo,
      path,
      message,
      content,
      branch,
      token
    });
    
    return res.json(result);
  } catch (error) {
    console.error('Error committing file:', error);
    return res.status(500).json({ error: 'Failed to commit file' });
  }
});

// Get target repository and its forks
githubRouter.get('/repos/target-and-forks', verifyToken, async (req, res) => {
  try {
    const repos = await githubService.getTargetRepoAndForks(req.body.token);
    return res.json(repos);
  } catch (error) {
    console.error('Error fetching repositories:', error);
    return res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Search repositories
githubRouter.get('/repos/search', verifyToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || typeof q !== 'string') {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    
    const repos = await githubService.searchRepositories(q, req.body.token);
    return res.json(repos);
  } catch (error) {
    console.error('Error searching repositories:', error);
    return res.status(500).json({ error: 'Failed to search repositories' });
  }
});

// Get branches for a repository
githubRouter.get('/repo/:owner/:repo/branches', verifyToken, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const branches = await githubService.getBranches(owner, repo, req.body.token);
    return res.json(branches);
  } catch (error) {
    console.error('Error fetching branches:', error);
    return res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// Create a fork of the target repository
githubRouter.post('/repos/fork', verifyToken, async (req, res) => {
  try {
    const fork = await githubService.createFork(req.body.token);
    return res.json(fork);
  } catch (error) {
    console.error('Error creating fork:', error);
    return res.status(500).json({ error: 'Failed to create fork' });
  }
});

// Create a new branch in a repository
githubRouter.post('/repo/:owner/:repo/branches', verifyToken, async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const { branchName, sourceBranch, token } = req.body;
    
    if (!branchName || !sourceBranch) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const branch = await githubService.createBranch(owner, repo, branchName, sourceBranch, token);
    return res.json(branch);
  } catch (error) {
    console.error('Error creating branch:', error);
    return res.status(500).json({ error: 'Failed to create branch' });
  }
});
