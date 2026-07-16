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

## Deployment — Google Cloud Run (serverless container)

The backend runs as a FrankenPHP container on **Cloud Run**, scale-to-zero
(free tier). `.github/workflows/deploy.yml` builds the Dockerfile's
`frankenphp_prod` stage via Cloud Build and deploys on every push to `main`.

Key settings baked into the workflow:

- Region `europe-west4` (Netherlands); `--min-instances 0 --max-instances 1`.
- `--cpu-boost` for faster cold starts. The frontend already calls
  `GET /api/auth/status` on load, which wakes the container while the user is on
  the login page, so the ~1s cold start is hidden.
- `SERVER_NAME=:8080` so Caddy serves plain HTTP on Cloud Run's port (Cloud Run
  terminates TLS).

**Sessions:** file-based sessions stay consistent because of `--max-instances 1`.
After a long idle the instance scales to zero and the session is dropped, so the
next visit re-authenticates via a quick GitHub OAuth redirect. If you ever need
more than one instance, move sessions to a shared store (e.g. Upstash Redis)
first — file sessions do not work across instances.

### One-time setup

```bash
PROJECT_ID=your-gcp-project
gcloud config set project "$PROJECT_ID"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com secretmanager.googleapis.com

# Secrets (Secret Manager)
php -r 'echo bin2hex(random_bytes(16));' | gcloud secrets create lpe-app-secret --data-file=-
printf '%s' 'YOUR_GITHUB_OAUTH_CLIENT_SECRET' | gcloud secrets create lpe-github-client-secret --data-file=-

# Deploy service account for GitHub Actions
gcloud iam service-accounts create lpe-deployer --display-name="Lesson Plan Editor deployer"
SA="lpe-deployer@$PROJECT_ID.iam.gserviceaccount.com"
for role in roles/run.admin roles/cloudbuild.builds.editor \
            roles/artifactregistry.admin roles/iam.serviceAccountUser roles/storage.admin; do
  gcloud projects add-iam-policy-binding "$PROJECT_ID" --member="serviceAccount:$SA" --role="$role"
done

# Workload Identity Federation (no downloadable key; works when
# iam.disableServiceAccountKeyCreation is enforced).
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud iam workload-identity-pools create github-pool \
  --location=global --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers create-oidc github-provider \
  --location=global --workload-identity-pool=github-pool --display-name="GitHub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner" \
  --attribute-condition="assertion.repository_owner == 'LEARN-FAIR'"
gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/attribute.repository/LEARN-FAIR/lesson-plan-editor"

# Values for the GitHub secrets below:
echo "GCP_DEPLOY_SA   = $SA"
echo "GCP_WIF_PROVIDER = projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/github-pool/providers/github-provider"

# Let the Cloud Run runtime SA read the secrets
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
RUNTIME_SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
for s in lpe-app-secret lpe-github-client-secret; do
  gcloud secrets add-iam-policy-binding "$s" \
    --member="serviceAccount:$RUNTIME_SA" --role=roles/secretmanager.secretAccessor
done
```

### GitHub Actions secrets

| Secret | Value |
| --- | --- |
| `GCP_PROJECT_ID` | your GCP project id |
| `GCP_WIF_PROVIDER` | the `projects/…/providers/github-provider` string printed above |
| `GCP_DEPLOY_SA` | `lpe-deployer@<project-id>.iam.gserviceaccount.com` |
| `GH_OAUTH_CLIENT_ID` | GitHub OAuth App client id |

Non-secret config (`CORS_ALLOW_ORIGIN`, `FRONTEND_URL`) is already baked from
committed `.env`; override at deploy with extra `--set-env-vars` if needed.

### After the first deploy

- Map the domain: `gcloud run domain-mappings create --service lesson-plan-editor \
  --domain api.editor.fairdata.education --region europe-west4`, then add the DNS
  records it prints.
- Set the GitHub OAuth App **callback URL** to
  `https://api.editor.fairdata.education/api/auth/github/callback`.

> **Security:** the `APP_SECRET` committed in `.env` is public — the `lpe-app-secret`
> Secret Manager value overrides it at runtime, so set a fresh one there (and
> ideally rotate the committed value).

An older Ansible deploy (`ansible/`, `compose*.yaml`) targeting the previous host
also exists; Cloud Run is the current path. The frontend deploys independently to
Cloudflare.
