# LEARN-FAIR Lesson Plan Editor — Backend API

Symfony API for the FAIR lesson plan editor. It handles GitHub OAuth and proxies
GitHub operations (listing/reading/committing lesson plans) for the frontend.

The frontend is a separate repository (`lesson-plan-editor-frontend`), a static
React/Vite SPA deployed to Cloudflare Pages. This repo is **API-only** — it does
not build or serve any UI.

## Architecture

- **Backend** (this repo): `api.editor.fairdata.education` — Symfony API + GitHub OAuth.
- **Frontend** (separate repo): `editor.fairdata.education` — static SPA on Cloudflare Pages.

Both hosts share the registrable domain `fairdata.education`, so they are
*same-site*. Auth uses a `SameSite=Lax` session cookie set by this API; the
browser sends it with the frontend's cross-origin (but same-site) API requests.
CORS is handled by `nelmio/cors-bundle`; the allowed origin and the post-login
redirect target are configured via environment variables.

All routes are under `/api/*`.

## Requirements

- PHP 8.x + Composer
- A GitHub OAuth App

## Setup

1. Install PHP dependencies:
   ```bash
   composer install
   ```

2. Create a local env override:
   ```bash
   cp .env .env.local
   ```

3. Configure the GitHub OAuth App credentials (in `.env.local` or the environment).
   The OAuth **callback URL** registered on GitHub must point at this API:
   ```
   https://api.editor.fairdata.education/api/auth/github/callback
   ```
   (for local dev, `http://localhost:8000/api/auth/github/callback`).

4. Environment variables of note:
   - `CORS_ALLOW_ORIGIN` — regex of allowed frontend origins (localhost + `editor.fairdata.education`).
   - `FRONTEND_URL` — where the API redirects after a successful OAuth login.

5. Generate JWT keys if not present (used by `lexik/jwt-authentication-bundle`):
   ```bash
   php bin/console lexik:jwt:generate-keypair
   ```

6. Run the dev server:
   ```bash
   symfony server:start --port=8000
   # or
   php -S localhost:8000 -t public
   ```

## Deployment

Deployed via the Ansible role under `ansible/` (see `compose*.yaml` / `Dockerfile`
for the container build). The frontend is deployed independently on Cloudflare
Pages and is not part of this repo's release.
