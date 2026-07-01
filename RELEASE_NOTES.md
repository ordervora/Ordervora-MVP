# Release Notes — v0.1.0-foundation

## Sprint 01 Summary

Sprint 01 established the foundation of the Ordervora MVP monorepo: a pnpm
workspace containing a Next.js frontend and an Express + Prisma backend,
with working CI, linting, and a health-check endpoint. The repository had
no prior history, so this sprint scaffolded the project from scratch and
verified every part of it before merging to `main`.

No product features (ordering, menus, auth, etc.) were built in this
sprint — this is infrastructure/foundation only. Sprint 02 has not been
started.

## Features Completed

- **Monorepo workspace**: pnpm workspace (`apps/*`, `packages/*`) with a
  single root lockfile and shared root scripts (`lint`, `typecheck`,
  `build`, `dev`, `test`).
- **Frontend (`apps/web`)**: Next.js 16 App Router app, TypeScript, Tailwind
  CSS v4, ESLint 9 flat config (`eslint-config-next`). Builds to static
  pages with Turbopack.
- **Backend (`apps/api`)**: Express 5 app with a `GET /health` endpoint
  returning `{ status, uptime, timestamp }`. TypeScript compiled via `tsc`,
  dev loop via `tsx watch`.
- **Database layer**: Prisma 7 schema (`apps/api/prisma/schema.prisma`)
  with a foundational `User` model, `PrismaClient` wired up through the
  `@prisma/adapter-pg` driver adapter (`apps/api/src/lib/prisma.ts`).
- **CI** (`.github/workflows/ci.yml`): on every push/PR to `main`, installs
  dependencies, validates and generates the Prisma client, lints,
  typechecks, and builds both apps.
- **Verification report** (`SPRINT_01_REPORT.md`): a full 14-point
  checklist verifying package.json validity, workspace config, builds,
  Prisma schema, Tailwind, ESLint, CI, imports, dependencies, duplicate
  files, TypeScript config, and the health endpoint.

## Architecture Decisions

- **pnpm workspaces** over a single flat package or Turborepo/Nx — the
  project is small enough that plain pnpm workspace globs (`apps/*`,
  `packages/*`) give project isolation without extra tooling overhead.
- **Separate Next.js frontend and Express backend** (rather than Next.js
  API routes) — keeps the API deployable and scalable independently of the
  frontend, and matches a conventional two-service architecture for the
  MVP.
- **Prisma 7 with driver adapters** — this project intentionally pins the
  current Prisma major version rather than an older one. Prisma 7 removed
  inline `datasource.url` support in `schema.prisma`; connection
  configuration now lives in `apps/api/prisma.config.ts`, and
  `PrismaClient` is constructed with an explicit `@prisma/adapter-pg`
  adapter instead of relying on the schema's connection string directly.
  This is a deliberate choice to start on the current major version rather
  than begin on a version that will require an early migration.
- **ESLint flat config** (`eslint.config.mjs`) in both apps, matching the
  current ESLint 9 default and Next.js 16's own tooling, instead of the
  legacy `.eslintrc` format.
- **TypeScript `NodeNext` module resolution** in `apps/api` — required so
  the `exports`-mapped `@prisma/client/runtime/client` subpath and the
  generated Prisma client (which is now generated as TypeScript source
  under `apps/api/generated/prisma`) both resolve and compile correctly.

## Known Limitations

- **No database is provisioned.** The Prisma schema validates and the
  client generates, but no Postgres instance is connected in this
  environment; `apps/api/.env` holds a placeholder `DATABASE_URL` only.
  Actual query execution against a live database has not been exercised.
- **No automated tests yet.** The `test` script exists at the root
  (`pnpm -r --if-present test`) but neither app has test files or a test
  runner configured.
- **No authentication, ordering, or business-domain features.** The
  `User` model is a placeholder to prove the Prisma toolchain works, not a
  designed data model.
- **CI does not run against a real database** — it validates the schema
  and generates the client, but does not run migrations or integration
  tests against Postgres.
- **Environment-specific Prisma download quirk**: in some sandboxed/proxied
  environments, downloading Prisma's `schema-engine` binary from
  `binaries.prisma.sh` can be reset by a restrictive egress proxy. This is
  not a code defect (a direct `curl` through the same proxy succeeds) and
  does not affect GitHub Actions, which has open network access.

## Environment Requirements

- **Node.js**: 22.x (matches `engines.node: >=20` in the root
  `package.json`; developed and verified against Node 22.22.2).
- **pnpm**: 10.x (pinned via `packageManager: pnpm@10.33.0` in the root
  `package.json`).
- **PostgreSQL**: required only to actually run the API against a real
  database (not required to build, lint, or typecheck). Set
  `DATABASE_URL` in `apps/api/.env` (see `apps/api/.env.example`).

## Commands to Run the Project

```bash
# from the repo root
pnpm install

# lint / typecheck / build everything
pnpm run lint
pnpm run typecheck
pnpm run build

# run the frontend (http://localhost:3000)
pnpm --filter web dev

# run the backend (http://localhost:4000), then:
# curl http://localhost:4000/health
pnpm --filter api dev

# Prisma (from apps/api, requires DATABASE_URL to be set)
pnpm --filter api exec prisma validate
pnpm --filter api exec prisma generate
```
