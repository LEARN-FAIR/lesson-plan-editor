import express from 'express';
import axios from 'axios';

export const authRouter = express.Router();

/**
 * Initiate GitHub OAuth flow
 * This endpoint redirects the user to GitHub's authorization page
 */
authRouter.get('/github/login', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const redirectUri = `${process.env.CORS_ORIGIN}/github-callback`;
  const scope = 'repo'; // Permissions needed
  
  // Generate a random state parameter for security
  const state = generateRandomString(32);
  
  // Construct the GitHub authorization URL
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;
  
  // Redirect the user to GitHub's authorization page
  res.redirect(githubAuthUrl);
});

/**
 * Generate a random string of specified length
 */
function generateRandomString(length: number): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

/**
 * Exchange GitHub OAuth code for access token
 * This endpoint handles the secure exchange of the authorization code for an access token
 */
authRouter.post('/github/callback', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    // Exchange the code for an access token
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code
      },
      {
        headers: {
          Accept: 'application/json'
        }
      }
    );

    // Check if the token exchange was successful
    if (tokenResponse.data.error) {
      console.error('GitHub token exchange error:', tokenResponse.data);
      return res.status(400).json({ error: tokenResponse.data.error_description || 'Failed to exchange code for token' });
    }

    // Return the access token to the client
    return res.json({
      access_token: tokenResponse.data.access_token,
      token_type: tokenResponse.data.token_type,
      scope: tokenResponse.data.scope
    });
  } catch (error) {
    console.error('Error exchanging GitHub code for token:', error);
    return res.status(500).json({ error: 'Failed to exchange code for token' });
  }
});

/**
 * Get user information using the access token
 */
authRouter.get('/github/user', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Get user information from GitHub API
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    
    return res.json(userResponse.data);
  } catch (error) {
    console.error('Error fetching GitHub user:', error);
    return res.status(500).json({ error: 'Failed to fetch user information' });
  }
});
