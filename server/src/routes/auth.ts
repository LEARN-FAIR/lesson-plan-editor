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

    // Get redirect_url from query parameters if provided
    const redirectUrl = req.query.redirect_url as string | undefined;

    // Create a state object that includes both a random string for security
    // and the redirect URL
    const stateObj = {
        nonce: generateRandomString(32), // Random string for CSRF protection
        redirectUrl: redirectUrl || '/'
    };

    // Encode the state object as a URL-safe base64 string
    const stateParam = Buffer.from(JSON.stringify(stateObj)).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');

    // Construct the GitHub authorization URL with the state parameter
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${stateParam}`;

    console.log(`Initiating GitHub OAuth with redirect_url: ${redirectUrl || '/'} (encoded in state parameter)`);
    console.log(`State parameter: ${stateParam}`);


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
        const {code, state} = req.body;

        if (!code) {
            return res.status(400).json({error: 'No code provided'});
        }

        // Default redirect URL
        let redirectUrl = '/';

        // Try to decode the state parameter to get the redirect URL
        if (state) {
            try {
                // Add padding if needed for base64 decoding
                let paddedState = state;
                while (paddedState.length % 4 !== 0) {
                    paddedState += '=';
                }

                // Replace URL-safe characters back to base64 standard
                paddedState = paddedState.replace(/-/g, '+').replace(/_/g, '/');

                const decodedState = JSON.parse(Buffer.from(paddedState, 'base64').toString());
                console.log('Decoded state:', decodedState);

                if (decodedState && decodedState.redirectUrl) {
                    redirectUrl = decodedState.redirectUrl;
                    console.log(`Extracted redirect_url from state: ${redirectUrl}`);
                }
            } catch (error) {
                console.error('Error decoding state parameter:', error);
                // Continue with default redirect URL
            }
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
            return res.status(400).json({error: tokenResponse.data.error_description || 'Failed to exchange code for token'});
        }

        // Return the access token to the client along with the redirect_url
        return res.json({
            access_token: tokenResponse.data.access_token,
            token_type: tokenResponse.data.token_type,
            scope: tokenResponse.data.scope,
            redirect_url: redirectUrl // Include the redirect URL in the response
        });
    } catch (error) {
        console.error('Error exchanging GitHub code for token:', error);
        return res.status(500).json({error: 'Failed to exchange code for token'});
    }
});

/**
 * Get user information using the access token
 */
authRouter.get('/github/user', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({error: 'Authorization token is required'});
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
        return res.status(500).json({error: 'Failed to fetch user information'});
    }
});
