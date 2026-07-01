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
  **Superseded in Sprint 02**: the `prisma-client` generator (which wrote
  TS source to `apps/api/generated/prisma`) was replaced by the classic
  `prisma-client-js` generator — see the Sprint 02 section below for why.
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

---

# Release Notes — v0.2.0-auth

## Sprint 02 Summary

Sprint 02 built platform authentication on top of the Sprint 01
foundation: real accounts and login/session handling for the three
internal roles that operate the platform — **Restaurant Owner**,
**Restaurant Staff**, and **Platform Admin**. Customer-facing
authentication and all restaurant/menu/order domain modeling remain
out of scope, deferred to a later sprint, per the approved Sprint 02
plan.

## Authentication Features

- **Self-registration for Restaurant Owners** — `POST /api/auth/register`
  creates a `RESTAURANT_OWNER` account and immediately issues a session
  (no separate login step required after signup).
- **Login / session** — `POST /api/auth/login` verifies credentials and
  issues a short-lived JWT access token plus a long-lived, DB-backed
  refresh token, both as `httpOnly` cookies.
- **Session refresh with rotation** — `POST /api/auth/refresh` exchanges
  a valid refresh token for a new access+refresh pair, revoking the old
  refresh token in the same operation.
- **Logout** — `POST /api/auth/logout` revokes the current refresh token
  and clears both cookies.
- **Current user** — `GET /api/auth/me` returns the authenticated user's
  public profile (`id`, `email`, `name`, `role`).
- **Staff invitation** — `POST /api/auth/staff` lets an authenticated
  `RESTAURANT_OWNER` create a `RESTAURANT_STAFF` account (staff cannot
  self-register).
- **Admin bootstrap** — the single `ADMIN` account is created only via
  `pnpm --filter api exec prisma db seed` (`apps/api/prisma/seed.ts`),
  reading `ADMIN_EMAIL`/`ADMIN_PASSWORD`/`ADMIN_NAME` from the
  environment. There is no HTTP path to create or elevate to `ADMIN`.
- **Minimal `apps/web` UI** — `/login`, `/register`, and a protected
  `/dashboard` placeholder that renders the logged-in user's name/role
  and a logout button, enough to exercise the whole flow in a browser.

## Architecture Decisions

- **JWT access token + DB-backed opaque refresh token (hybrid)** —
  stateless verification for most requests, while keeping server-side
  revocability for logout and breach response.
- **httpOnly cookies over `localStorage`** — appropriate for this
  first-party web app; removes an entire class of XSS token-theft risk.
- **argon2id over bcrypt** for password hashing — stronger
  memory-hardness against modern cracking hardware, current OWASP
  recommendation.
- **Role as a single enum field on `User`**, not a join table — correct
  while each account has exactly one role; revisit if/when multi-role or
  multi-tenant needs appear.
- **Admin bootstrap via seed script, not an API route** — removes the
  platform's most powerful role from the HTTP attack surface entirely.
- **`apps/api/src/modules/auth/` layering** (routes → controller →
  service → validation) — keeps `app.ts` a thin composition root and
  establishes the module pattern future domain features (restaurants,
  menus, orders) will follow.
- **Next.js `next.config.ts` rewrite of `/api/*` to the Express API** —
  makes the browser treat all API calls as same-origin, so auth cookies
  set by the API stay first-party to the Next.js origin and are visible
  to Server Components / `proxy.ts` (Next.js 16's renamed
  `middleware.ts`) without extra cross-origin cookie configuration.
- **Reverted the Prisma client generator to `prisma-client-js`** (from
  the newer `prisma-client` used in Sprint 01). The newer generator's
  output contains `import.meta.url`, which is invalid once TypeScript
  compiles it to CommonJS for our `tsc`-built Express server — the
  generated file's `@ts-nocheck` suppresses the compile-time error, so it
  only surfaced as a runtime crash a few seconds after the compiled
  server started. `prisma-client-js` is fully CJS-safe and avoids this
  class of bug; this was confirmed by killing all stray dev processes
  and re-testing the actual compiled `node dist/src/index.js` binary
  directly (an earlier "successful" test had unknowingly hit a leftover
  `tsx watch` dev process instead of the build under test).

## Security Improvements

- Passwords hashed with **argon2id**, never logged or returned in any
  response.
- Refresh tokens stored as a **SHA-256 hash only** — a database read
  compromise doesn't yield usable tokens — and are individually
  revocable.
- **Refresh token rotation with reuse detection**: every refresh
  invalidates the prior token; presenting an already-used refresh token
  revokes all of that user's active sessions (treated as suspected
  theft).
- **No client-controlled roles**: `/register` hardcodes
  `RESTAURANT_OWNER`, `/staff` hardcodes `RESTAURANT_STAFF` server-side —
  `role` is never accepted from request input, and `ADMIN` has no public
  creation path at all.
- **Rate limiting** on `/login` and `/register` (10 requests/min per IP)
  to blunt brute-force/credential-stuffing.
- **Generic authentication errors** (`Invalid email or password`) to
  avoid user enumeration on login; registration still reports "email
  already in use," a deliberate, noted usability trade-off.
- **Input validation** on every auth request body via `zod`.
- **CORS tightened**: Sprint 01's permissive default `cors()` was
  replaced with an explicit `FRONTEND_URL`-based allowlist plus
  `credentials: true`, required for credentialed (cookie-bearing)
  cross-origin requests to work at all.

## Database Changes

- New enum `Role { ADMIN, RESTAURANT_OWNER, RESTAURANT_STAFF }`.
- `User` model replaced the Sprint 01 placeholder: added `passwordHash`,
  made `name` required, added `role` (no default — every account must be
  created with an explicit role by server logic), and added
  `invitedById` (self-relation) recording which Restaurant Owner created
  a given Staff account — a stand-in for a real restaurant/staff linkage
  until a `Restaurant` model exists.
- New `RefreshToken` model: `userId` (FK → `User`), `tokenHash` (unique,
  SHA-256), `expiresAt`, `revokedAt` (nullable), `createdAt`.
- This is the project's first schema change since Sprint 01's
  placeholder `User` model; it has not yet been applied via
  `prisma migrate dev` against a real database (see Known Limitations).

## Known Limitations

- **No live database in this environment.** As in Sprint 01, there is no
  provisioned Postgres instance available here. `prisma validate` and
  `prisma generate` pass, and the compiled server correctly returns
  `401`/`403` for auth/authorization failures and a clean `500` for
  DB-dependent operations (register, login, staff invite) — but
  `prisma migrate dev`, the seed script's actual DB write, and a true
  end-to-end register→login→refresh→logout round trip have not been
  exercised against a real database.
- **Cross-origin cookies in local dev** are handled via the Next.js
  rewrite (see Architecture Decisions) rather than true cross-origin
  cookie configuration; if the API is ever deployed to a genuinely
  different domain than the frontend, this will need revisiting.
- **`invitedById` stands in for a real Restaurant linkage.** When a
  future sprint introduces a `Restaurant` model, this will need a
  follow-up migration to properly scope staff/owners to a specific
  restaurant.
- **No password reset, email verification, 2FA, or OAuth** — explicitly
  deferred per the approved Sprint 02 scope.
- **No customer-facing authentication** — explicitly deferred per the
  approved Sprint 02 scope.
- **The `v0.2.0-auth` tag could not be pushed to the remote** in this
  session: the git proxy used by this environment returns `HTTP 403` for
  any push to `refs/tags/*` (confirmed reproducible and distinct from
  ordinary branch pushes, which succeed) — this is a session/environment
  policy restriction, not a project defect. The tag exists in the local
  repository at the `main` merge commit; pushing it requires a git
  client with direct, non-proxied push access to the remote.

## Verification Results

- `pnpm install`, `pnpm run lint`, `pnpm run typecheck`, and
  `pnpm run build` all pass cleanly at the repo root after the merge to
  `main`.
- `prisma validate` passes against the updated schema.
- The compiled Express server (`node dist/src/index.js`) was confirmed
  stable under sustained requests (30+ seconds, multiple sequential
  calls) after fixing the `import.meta.url`/CommonJS crash — verified
  against the actual compiled binary, not a dev-mode process.
- Manually verified: `GET /health` → `200`; `GET /api/auth/me` without a
  cookie → `401`; `POST /api/auth/staff` without auth → `401`;
  `POST /api/auth/register` with an invalid body → `400` with per-field
  validation errors; `POST /api/auth/register` with a valid body → clean
  `500` (expected — no live database in this environment, not a crash).
- The Next.js `/api/*` rewrite was verified end-to-end: requests to
  `http://localhost:3000/api/auth/register` correctly proxy to the
  Express API on port 4000 and return the same response as calling the
  API directly.
- `/login`, `/register`, and `/dashboard` all render; unauthenticated
  requests to `/dashboard` correctly redirect (`307`) to `/login` via
  `proxy.ts`.
- Not verified in this environment (requires a live Postgres instance):
  `prisma migrate dev`, the seed script's actual database write, and a
  full register→login→refresh→logout round trip returning real session
  cookies.

---

# Release Notes — v0.3.0-restaurant-menu

## Sprint 03 Summary

Sprint 03 introduced the platform's first business-domain, multi-tenant
data model on top of Sprint 02's authentication: restaurants and their
menus. Restaurant Owners can now set up a restaurant profile, and Owners
and Staff can manage its menu catalog (categories and items) — all
strictly scoped to their own restaurant. This also resolved the Sprint 02
`invitedById` stand-in flagged as a known limitation: staff invited by an
owner now inherit a real `restaurantId`, the platform's actual tenant
boundary.

## Restaurant Module

- `apps/api/src/modules/restaurants/` (routes → controller → service →
  validation, matching the `modules/auth` pattern).
- A `RESTAURANT_OWNER` creates exactly one restaurant (`name`,
  `description`, `address`, `phone`, `isPublished`); a second creation
  attempt is rejected.
- `getOwnRestaurantId(userId)` in `restaurant.service.ts` is the single
  function that maps an authenticated user to "their" restaurant — every
  other restaurant/menu controller resolves tenant scope through it
  rather than deriving it independently.
- `RESTAURANT_STAFF` can read the restaurant profile; only the
  `RESTAURANT_OWNER` can update it.
- `ADMIN` gets a separate, read-only `/api/admin/restaurants` listing
  across all restaurants.

## Menu Module

- `apps/api/src/modules/menu/`: `MenuCategory` (name, `sortOrder`) and
  `MenuItem` (name, description, `priceCents`, `isAvailable`,
  `sortOrder`), each scoped to a restaurant, items additionally scoped to
  a category.
- Full CRUD for both categories and items, usable by both
  `RESTAURANT_OWNER` and `RESTAURANT_STAFF` of that restaurant.
- Prices are stored as integer cents (`priceCents`), never floats, to
  avoid rounding bugs; the frontend converts to/from dollars only at the
  display/input layer.
- Deleting a category deletes its items in the same transaction, avoiding
  a foreign-key violation from orphaned items.

## Tenant Isolation

- **Restaurant is the single tenant boundary.** No owner/staff-facing
  endpoint ever accepts a client-supplied `restaurantId` — it is always
  resolved server-side from the authenticated user via
  `getOwnRestaurantId`.
- Every category/item mutation re-verifies `resource.restaurantId ===
  callerRestaurantId` before writing (`findOwnCategory`/`findOwnItem` in
  `menu.service.ts`).
- **IDOR-hardened**: a category or item belonging to a different
  restaurant returns `404` (not `403`) on update/delete — the caller
  can't distinguish "doesn't exist" from "isn't yours."
- Only `ADMIN`, via the clearly separate `/api/admin/*` namespace,
  crosses tenant boundaries, and only read-only.

## API Endpoints

| Method | Path | Roles | Purpose |
|---|---|---|---|
| POST | `/api/restaurants` | `RESTAURANT_OWNER` | Create the caller's restaurant (409 if one already exists) |
| GET | `/api/restaurants/me` | `RESTAURANT_OWNER`, `RESTAURANT_STAFF` | Read caller's own restaurant |
| PATCH | `/api/restaurants/me` | `RESTAURANT_OWNER` | Update restaurant profile |
| GET | `/api/admin/restaurants` | `ADMIN` | List all restaurants (read-only) |
| GET | `/api/menu/categories` | `RESTAURANT_OWNER`, `RESTAURANT_STAFF` | List caller's restaurant's categories + items |
| POST | `/api/menu/categories` | `RESTAURANT_OWNER`, `RESTAURANT_STAFF` | Create a category |
| PATCH | `/api/menu/categories/:id` | `RESTAURANT_OWNER`, `RESTAURANT_STAFF` | Update a category (404 if not caller's tenant) |
| DELETE | `/api/menu/categories/:id` | `RESTAURANT_OWNER`, `RESTAURANT_STAFF` | Delete a category and its items |
| POST | `/api/menu/items` | `RESTAURANT_OWNER`, `RESTAURANT_STAFF` | Create a menu item |
| PATCH | `/api/menu/items/:id` | `RESTAURANT_OWNER`, `RESTAURANT_STAFF` | Update a menu item (404 if not caller's tenant) |
| DELETE | `/api/menu/items/:id` | `RESTAURANT_OWNER`, `RESTAURANT_STAFF` | Delete a menu item |

## Frontend Pages

- `apps/web/src/app/dashboard/restaurant/page.tsx` — restaurant profile:
  shows a creation form if none exists yet, else an edit form.
- `apps/web/src/app/dashboard/menu/page.tsx` — menu management: add/
  delete categories, add items, toggle item availability, delete items.
- `apps/web/src/components/dashboard-nav.tsx` — shared nav (Home /
  Restaurant / Menu) reused across all three dashboard pages.
- `apps/web/src/lib/server-api.ts` — a `serverFetch` helper (forwards
  cookies, typed result) reused by all three dashboard server components,
  replacing the one-off fetch that used to live inline in the dashboard
  home page.

## Tests Added

- Introduced `vitest` in `apps/api` (no test runner existed before this
  sprint).
- `restaurant.service.test.ts`: `getOwnRestaurantId` resolution;
  `createRestaurant` rejects a second restaurant for the same owner and
  correctly links the new restaurant to the owner's `User` row in the
  same transaction.
- `menu.service.test.ts`: the core tenant-isolation guarantee —
  updating/deleting a category or item that belongs to a different
  restaurant is rejected (`CategoryNotFoundError`/`ItemNotFoundError`)
  without ever calling the underlying `update`/`delete` — plus a
  same-tenant update succeeding as the positive case.
- All tests run against a mocked Prisma client, so they execute without a
  live database (9/9 passing in this environment).

## Security Improvements

- Tenant scoping resolved exclusively server-side, never trusting
  request bodies/params for `restaurantId`.
- IDOR prevention via uniform `404` responses for cross-tenant resource
  access (see Tenant Isolation).
- Restaurant profile edits restricted to `RESTAURANT_OWNER`; menu content
  management open to both `RESTAURANT_OWNER` and `RESTAURANT_STAFF` of
  that restaurant, matching real-world staff duties.
- All new endpoints validate input via `zod` (name length, non-negative
  integer `priceCents`, etc.), consistent with the Sprint 02 pattern.
- No new public/unauthenticated endpoints — every route added this
  sprint requires `requireAuth`.

## Known Limitations

- **No live database in this sandbox** (recurring from Sprints 01–02):
  `prisma migrate dev` and a real end-to-end CRUD round trip (create
  restaurant → add menu → verify persisted data) have not been exercised
  against a live Postgres instance here. The new unit tests cover the
  tenant-isolation logic itself without needing one.
- **One restaurant per owner** — enforced via a unique constraint on
  `Restaurant.ownerId`; multiple restaurants per owner is explicitly
  deferred.
- **No customer-facing browsing/ordering, payments, or order state
  machine** — explicitly out of scope, to be built in a later sprint now
  that restaurants and menus exist as data.
- **No menu item modifiers/variants, image uploads, or drag-and-drop
  reordering** — flat items with a plain numeric `sortOrder`, by design.
- **Pre-existing Sprint 02 staff accounts** (if any existed in a real
  deployment) would need a data backfill of `restaurantId` — not a
  concern in this sandbox since no rows exist without a live database.
- **The `v0.3.0-restaurant-menu` tag could not be pushed** to the remote
  in this session — the git proxy returns `HTTP 403` for any push to
  `refs/tags/*` (confirmed reproducible again this sprint, and distinct
  from ordinary branch pushes, which succeed). This is a session/
  environment policy restriction, not a project defect. The tag exists in
  the local repository at the `main` merge commit.

## Verification Results

- `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and
  `pnpm run build` all pass cleanly at the repo root after the merge to
  `main`.
- `prisma validate` and `prisma generate` succeed against the updated
  schema (using the `prisma-client-js` generator, per the Sprint 02 fix).
- `vitest run` in `apps/api`: 2 test files, 9 tests, all passing.
- The compiled Express server (`node dist/src/index.js`) was confirmed
  as the genuine running binary (not a leftover dev process) and stayed
  stable while being exercised.
- Manually verified: every new restaurant/menu endpoint returns `401`
  when called without authentication (`POST /api/restaurants`,
  `GET /api/admin/restaurants`, `GET /api/menu/categories`,
  `POST /api/menu/categories`), confirming `requireAuth` is applied
  uniformly.
- `pnpm run build` for `apps/web` registers all new routes
  (`/dashboard/restaurant`, `/dashboard/menu`) as expected.
- Not verified in this environment (requires a live Postgres instance):
  an authenticated end-to-end walkthrough (register → create restaurant
  → add category/items → confirm cross-tenant `404` against a second
  seeded owner) and `prisma migrate dev`.
