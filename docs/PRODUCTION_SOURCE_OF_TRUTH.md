# OrderVora Production Source of Truth

Last verified: 2026-07-11

## Canonical production architecture

- Frontend project: Vercel `ordervora-web`
- Public domains: `ordervora.com`, `www.ordervora.com`
- GitHub repository: `ordervora/Ordervora-MVP`
- Production branch: `main`
- Current verified production frontend commit: `b0cf237ebc96fba20d4d7005944864f0a943177f`
- Backend API: Render `https://ordervora-api.onrender.com`
- Frontend production API rewrite: hard-pinned in `apps/web/next.config.ts` to the Render API
- Production database: PostgreSQL used by the Render API
- Supabase status: not confirmed as part of the live production request path; treat as stale/non-canonical until separately proven otherwise

## Deployment rules

1. Only commits merged into `main` are considered production releases.
2. Vercel preview deployments from `claude/*` or other branches are never considered production.
3. A change is not released until the Vercel deployment target is `production` and its `githubCommitRef` is `main`.
4. The production commit SHA must match the head of `main` before acceptance testing begins.
5. Backend changes are not complete until the Render API has deployed the matching intended commit and passes health checks.
6. Never use a preview URL as the customer-facing production URL.

## Environment ownership

### Vercel frontend

Owns frontend-only build and runtime configuration.

The production API rewrite is currently fixed in code to:

`https://ordervora-api.onrender.com`

Do not configure a stale Vercel `API_URL` and assume it controls production traffic; production uses the hard-pinned Render URL in `apps/web/next.config.ts`.

### Render API

Owns server-side secrets and backend configuration, including:

- `DATABASE_URL`
- `DIRECT_URL` when required by Prisma
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_ADDRESS`
- AI provider keys
- Stripe secrets
- JWT/session secrets
- `SITE_PLATFORM_DOMAIN`

Do not place backend-only secrets in Vercel and expect the Render API to read them.

### Production database

The canonical production database is whichever PostgreSQL database is referenced by the live Render API `DATABASE_URL`.

Before changing migrations:

- confirm a recoverable backup exists;
- run `prisma migrate status`;
- never reset, drop, truncate, or reseed production data;
- verify the Business Wizard, public storefront, imports, orders, and KDS all read and write the same database.

## Known infrastructure concern

The Vercel project currently lists `api.ordervora.com` among its domains even though the backend API is hosted on Render. This must be reviewed before relying on that hostname. Until routing is explicitly verified, the canonical API origin remains:

`https://ordervora-api.onrender.com`

## Release acceptance checklist

A release is accepted only when all are true:

- GitHub change is merged into `main`.
- Vercel deployment target is `production`.
- Vercel deployment metadata shows `githubCommitRef=main`.
- Vercel deployment SHA equals the intended `main` SHA.
- Render API is deployed and healthy.
- The frontend reaches the Render API.
- A real production smoke test succeeds.

## Current verified state

At verification time:

- GitHub default branch is `main`.
- Vercel production is deployed from `main`.
- Production frontend commit is `b0cf237ebc96fba20d4d7005944864f0a943177f`.
- A newer READY deployment from `claude/sprint-20a-ai-content` is a preview deployment, not production.

This document is the canonical reference for future development and release decisions.