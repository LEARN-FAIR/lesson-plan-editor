# Session-Based GitHub OAuth Authentication Flow

This document describes the session-based GitHub OAuth authentication flow implemented in the LEARN-FAIR Lesson Plan Editor application.

## Overview

The application uses a pure session-based GitHub OAuth authentication model. This approach ensures that GitHub tokens are securely stored only on the backend (Symfony) session, never exposed to the frontend, and all authenticated API interactions are handled through secure cookies.

## Authentication Flow

1. **Login Initiation**:
   - User clicks the "Login with GitHub" button
   - Frontend redirects to the backend OAuth login URL
   - Backend redirects to GitHub OAuth authorization page

2. **OAuth Callback Handling**:
   - GitHub redirects back to our backend callback URL with an authorization code
   - Backend exchanges the code for an access token
   - Backend stores the token securely in the server-side session
   - Backend redirects to the frontend callback URL with an authentication success flag

3. **Frontend Session Establishment**:
   - Frontend GitHubCallback component detects the authentication success flag
   - Frontend verifies authentication by calling the backend `/auth/status` endpoint
   - Backend validates the session and returns authentication status
   - Frontend updates local authentication state based on the response
   - Frontend redirects to the appropriate page based on stored redirect URL

4. **Authenticated API Requests**:
   - All API requests include credentials (cookies) to maintain the session
   - Backend validates the session cookie on each request
   - GitHub API calls are made by the backend using the token stored in session

5. **Logout Process**:
   - User clicks logout
   - Frontend calls backend logout endpoint
   - Backend clears the session and GitHub token
   - Frontend updates local authentication state

## Security Considerations

- **Token Security**: GitHub OAuth tokens are never exposed to the client-side code
- **HTTPS**: All communication uses HTTPS to ensure secure cookie transmission
- **Session Management**: Sessions are managed securely on the backend
- **CORS Configuration**: CORS is configured to allow credentials and secure cross-origin requests

## Implementation Details

### Frontend Components

- **apiAdapter.ts**: Handles all API requests with credentials to maintain session
- **githubService.ts**: Manages GitHub authentication state and user information
- **GitHubCallback.tsx**: Processes OAuth callback and verifies authentication
- **AuthContext.tsx**: Provides authentication state to the entire application

### Backend Components

- **AuthController**: Handles authentication status and logout endpoints
- **GitHubController**: Manages GitHub OAuth flow and token exchange
- **Session Configuration**: Configured for secure session management

## Development Setup

To run the application with HTTPS support for secure cookies:

1. **Generate SSL certificates** (already done in the ssl directory)

2. **Start the development server with HTTPS**:
   ```
   npm run start:https
   ```

3. **Or use the custom HTTPS server**:
   ```
   npm run serve:https
   ```

## Production Deployment

For production deployment:

1. Ensure the frontend is served over HTTPS
2. Configure secure cookie settings on the backend
3. Set appropriate CORS headers to allow credentials
4. Ensure session storage is properly configured for production

## Troubleshooting

Common issues:

- **Authentication fails**: Check HTTPS configuration and cookie settings
- **Session not maintained**: Verify CORS configuration allows credentials
- **GitHub API calls fail**: Check if GitHub token is properly stored in session
