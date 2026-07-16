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

## Deployment — Scaleway Serverless Containers

The backend runs as a FrankenPHP container on **Scaleway Serverless Containers**,
region `nl-ams` (Amsterdam), scale-to-zero. `.github/workflows/deploy.yml` builds
the Dockerfile's `frankenphp_prod` stage, pushes it to the Scaleway Container
Registry, and redeploys on every push to `main`.

Container settings (set once, see below):

- Port **8080**, min scale **0**, max scale **1**, ~256–512 MB.
- Env: `SERVER_NAME=:8080`, `CADDY_GLOBAL_OPTIONS=auto_https off` (Scaleway
  terminates TLS). Secret env: `APP_SECRET`, `GITHUB_CLIENT_SECRET`. Plus
  `GITHUB_CLIENT_ID`.
- The frontend calls `GET /api/auth/status` on load, waking the container while
  the user is on the login page, so the cold start is hidden.

**Sessions:** file-based sessions stay consistent because max scale is **1**.
After a long idle the container scales to zero and the session is dropped, so the
next visit re-authenticates via a quick GitHub OAuth redirect. If you ever raise
max scale above 1, move sessions to a shared store (e.g. Upstash Redis) first —
file sessions do not work across instances.

### One-time setup

1. **Container Registry**: create a namespace (e.g. `learn-fair`) in `nl-ams` →
   your image path is `rg.nl-ams.scw.cloud/learn-fair/lesson-plan-editor`.
2. **API key**: IAM → API keys → generate; note the **Access key**, **Secret key**,
   and your **Project ID**.
3. **GitHub secrets** (repo → Settings → Secrets and variables → Actions):

   | Secret | Value |
   | --- | --- |
   | `SCW_ACCESS_KEY` | Scaleway API access key |
   | `SCW_SECRET_KEY` | Scaleway API secret key |
   | `SCW_PROJECT_ID` | Scaleway project id |
   | `SCW_REGISTRY_IMAGE` | `rg.nl-ams.scw.cloud/learn-fair/lesson-plan-editor` |
   | `SCW_CONTAINER_ID` | *(leave unset for the first run — see below)* |

4. **First run** (build + push only): trigger the workflow. With `SCW_CONTAINER_ID`
   unset it builds and pushes the image and skips the deploy step.
5. **Create the container** (console or `scw`) in a Serverless Containers namespace,
   pointing at `…/lesson-plan-editor:latest`, port 8080, min 0 / max 1, and set the
   env + secret env vars listed above. Copy its **container ID**.
6. Add the `SCW_CONTAINER_ID` GitHub secret and re-run — now every push builds,
   pushes an immutable `:<sha>` tag, and redeploys the container.

Non-secret config (`CORS_ALLOW_ORIGIN`, `FRONTEND_URL`) is baked from committed
`.env`; override via container env vars if the domains change.

### After the first deploy

- Add the container's endpoint as a **custom domain** `api.editor.fairdata.education`
  in the Scaleway console, then create the CNAME it shows at your DNS provider
  (Cloudflare — set it **DNS-only / grey cloud**).
- Set the GitHub OAuth App **callback URL** to
  `https://api.editor.fairdata.education/api/auth/github/callback`.

> **Security:** the `APP_SECRET` in committed `.env` is public — set a fresh one as
> the container's `APP_SECRET` secret env var (it overrides the baked value), and
> ideally rotate the committed value too.

An older Ansible deploy (`ansible/`, `compose*.yaml`) targeting the previous host
also exists; Scaleway is the current path. The frontend deploys independently to
Cloudflare.
