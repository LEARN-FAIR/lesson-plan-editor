# GitHub OAuth Backend Server

This server handles the secure exchange of GitHub OAuth authorization codes for access tokens, which is required for
secure GitHub integration in the LEARN-FAIR Lesson Plan Editor.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Create a `.env` file based on the `.env.example` file:
   ```
   cp .env.example .env
   ```

3. Register a new OAuth application on GitHub:
    - Go to GitHub > Settings > Developer settings > OAuth Apps > New OAuth App
    - Set the Homepage URL to `https://localhost:3000`
    - Set the Authorization callback URL to `https://localhost:3000/github-callback`
    - Copy the Client ID and Client Secret to your `.env` file

4. Update your `.env` file with the GitHub Client ID and Client Secret.

## Running the Server

Development mode:

```
npm run dev
```

Production build:

```
npm run build
npm start
```

## API Endpoints

### `POST /api/auth/github/callback`

Exchanges a GitHub authorization code for an access token.

**Request Body:**

```json
{
  "code": "github_authorization_code"
}
```

**Response:**

```json
{
  "access_token": "github_access_token",
  "token_type": "bearer",
  "scope": "repo"
}
```

### `GET /api/auth/github/user`

Gets the authenticated user's information from GitHub.

**Headers:**

```
Authorization: Bearer github_access_token
```

**Response:**

```json
{
  "login": "username",
  "name": "User Name",
  "avatar_url": "https://avatars.githubusercontent.com/u/12345678",
  "email": "user@example.com"
}
```

## Security Notes

This server handles the GitHub OAuth flow securely by keeping the Client Secret on the server side. The frontend
application should never have access to the Client Secret.
