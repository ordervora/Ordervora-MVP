# OrderVora Production Source of Truth

Last verified: 2026-07-11

## Authoritative production architecture

| Layer | Authoritative production service |
|---|---|
| Frontend | Vercel project `ordervora-web` |
| Public domains | `ordervora.com`, `www.ordervora.com` |
| Source repository | `ordervora/Ordervora-MVP` |
| Production branch | `main` only |
| Backend API | Render service `ordervora-api` |
| Backend URL | `https://ordervora-api.onrender.com` |
| Production database | PostgreSQL selected by `DATABASE_URL` inside the Render API service |
| Supabase | Not an authoritative production database unless a future audited change explicitly reconnects it |

## Verified Vercel production release

The Vercel production deployment was verified as:

- Project: `ordervora-web`
- Git reference: `main`
- Commit: `b0cf237ebc96fba20d4d7005944864f0a943177f`
- Deployment target: `production`
- Deployment state: `READY`

Preview deployments from `claude/*` or any other branch are not production releases and must never be reported as released to customers.

## Ownership of configuration

### Vercel frontend

Vercel owns frontend/runtime routing variables only. It must route application API requests to the live Render API and must not point production traffic to localhost, a preview deployment, Supabase, or an obsolete API.

### Render API

Render owns all server-only secrets and backend runtime variables, including:

- `DATABASE_URL`
- `DIRECT_URL` when required
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_ADDRESS`
- `SITE_PLATFORM_DOMAIN`
- authentication secrets
- AI provider secrets
- payment provider secrets

Server-only secrets must not be copied into public Vercel variables.

## Database rule

There is one authoritative production database: the PostgreSQL database reached by the live Render API's `DATABASE_URL`.

All production writes and reads for users, restaurants, menus, imports, sites, domains, carts, and orders must pass through the live API and reach that database.

Supabase must be treated as stale/non-authoritative until an explicit audit proves production runtime usage. Do not delete it automatically, and do not apply schema or RLS changes to it as a substitute for fixing the Render production database.

## Release rule

A change is production only when all of the following are true:

1. The change is merged into `main`.
2. Vercel creates a deployment with target `production` from that exact `main` commit.
3. The production aliases point to that deployment.
4. The Render API is running a compatible backend commit and schema.
5. The real production user flow has been tested.

A successful Preview deployment or local test does not satisfy this rule.

## Known configuration concern

`api.ordervora.com` is currently listed as an alias on the Vercel frontend project. This must not be assumed to be the Render API endpoint. The canonical backend endpoint remains `https://ordervora-api.onrender.com` until DNS/routing is deliberately audited and changed.

## Prohibited actions

- Do not create a second production database.
- Do not reset, truncate, reseed, or replace production data.
- Do not deploy a feature branch directly as production.
- Do not describe a Preview deployment as production.
- Do not move backend secrets into Vercel public variables.
- Do not reconnect Supabase without a documented migration and rollback plan.
