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

---

# Release Notes — v0.4.0-import-engine

## Sprint 04 Summary

Sprint 04 built the **OrderVora Import Engine**: a way to populate a
restaurant's menu from an uploaded file instead of typing every category
and item by hand. Seven import sources are named as the long-term target
(PDF, Images, Website URL, Google Maps, DoorDash, Uber Eats, Grubhub);
per the approved plan, only **PDF and Image import are implemented**
this sprint. The other five ship as real, registered adapters that
report themselves as not-yet-implemented, so turning one on later means
writing one adapter class and registering it — no route, schema, or
job-lifecycle changes.

## Architecture: One Interface, One Registry, One Table

- **`ImportAdapter` interface** (`apps/api/src/modules/imports/types.ts`):
  `{ sourceType, implemented, extract(input) }`. Every source, present or
  future, implements this same contract — the request path never
  branches on which source is being used.
- **`ImportAdapterRegistry`** (`adapters/registry.ts`): a `Map` keyed by
  source type, populated once at startup with all seven adapters. The
  controller resolves the adapter generically and checks its
  `implemented` flag to decide whether to proceed or return `501` —
  there is no hardcoded list of "which sources currently work" anywhere
  in the request path.
- **One `ImportJob` table** for all seven sources (see Database Changes)
  — every source produces the same `ExtractedMenuData` shape once
  extracted, so no new table is needed as sources are added.

## PDF and Image Import (Implemented)

- Both funnel through a shared extraction core,
  `extractMenuFromImages()` (`vision-extractor.ts`), which sends one or
  more page images to Claude's vision API (`@anthropic-ai/sdk`) with a
  structured-output prompt and validates the response with `zod` before
  trusting any of it.
- `PdfImportAdapter` renders each PDF page to a PNG via `pdf-to-img`,
  then treats the result identically to a plain image upload —
  `ImageImportAdapter` passes the uploaded image straight through. This
  is the concrete code-reuse the "extensible" requirement asked for.
- Uploads are handled by `multer` (in-memory, MIME-type allowlist, size
  cap) and never write straight into the live menu: every job lands in
  `AWAITING_REVIEW` with its extracted data, and only an explicit
  `POST /api/imports/:id/approve` commits it — reusing Sprint 03's
  `createCategory`/`createItem` (`modules/menu/menu.service.ts`) so the
  import engine doesn't duplicate the existing tenant-scoping
  guarantees.

## Deferred Sources: Website, Google Maps, DoorDash, Uber Eats, Grubhub

- Each has a real class in `apps/api/src/modules/imports/adapters/`,
  registered in the same registry, correctly typed against the same
  `ImportAdapter` interface, with `implemented: false`.
- Calling `.extract()` on any of them rejects with `NotImplementedError`;
  `POST /api/imports` for any of these five source types returns a
  synchronous `501 Not Implemented` — no job row is even created.
- DoorDash, Uber Eats, and Grubhub adapters carry an explicit code
  comment flagging that a real implementation would likely require
  scraping (no public partner API for this use case exists), which
  risks violating those platforms' Terms of Service — a legal/product
  decision for whoever builds those adapters later, not resolved by this
  sprint's interface design.

## Database Changes

- New enum `ImportSourceType { PDF, IMAGE, WEBSITE, GOOGLE_MAPS,
  DOORDASH, UBER_EATS, GRUBHUB }` — all seven listed now so the column
  never needs a migration when a new source is turned on.
- New enum `ImportStatus { PENDING, PROCESSING, AWAITING_REVIEW,
  APPROVED, REJECTED, FAILED }`.
- New model `ImportJob`: `restaurantId` (FK), `createdById` (FK →
  `User`), `sourceType`, `status` (default `PENDING`), `sourceFilePath`
  (file-based sources), `sourceUrl` (reserved for URL-based sources),
  `extractedData` (`Json?`), `errorMessage`, `reviewedAt`.

## API Endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/imports` | Create a job (`multipart/form-data`: `sourceType` + `file`). `202` for PDF/Image; `501` for the five deferred sources |
| GET | `/api/imports` | List the caller's restaurant's import jobs |
| GET | `/api/imports/:id` | Get one job, including `extractedData` once ready (`404` if not caller's tenant) |
| POST | `/api/imports/:id/approve` | Commit `extractedData` into real `MenuCategory`/`MenuItem` rows; sets `APPROVED` |
| POST | `/api/imports/:id/reject` | Discard the extraction; sets `REJECTED` |

All require `requireAuth` + `requireRole(RESTAURANT_OWNER,
RESTAURANT_STAFF)`, tenant-scoped via the existing `getOwnRestaurantId`.

## Frontend Pages

- `apps/web/src/app/dashboard/import/page.tsx` — upload form (PDF/Image
  enabled; the other five shown disabled with a "coming soon" label,
  reflecting the real backend state) plus a list of past import jobs.
- `apps/web/src/app/dashboard/import/[id]/page.tsx` — review screen:
  extracted categories/items read-only, with Approve/Reject actions.

## Tests Added

- `adapters/registry.test.ts` — all seven sources resolve from the
  registry; PDF/Image report `implemented: true`, the other five report
  `false`; a stub adapter's `.extract()` rejects with
  `NotImplementedError`. (This test caught a real bug: the stub
  adapters' `extract()` methods were missing `async`, so they threw
  synchronously instead of returning a rejected promise — fixed during
  this sprint.)
- `import.service.test.ts` — tenant isolation (approving/rejecting a job
  from a different restaurant returns `404`), rejecting a job that isn't
  `AWAITING_REVIEW`, and the approve flow committing categories/items
  with the correct `restaurantId`.
- `vision-extractor.test.ts` — a malformed AI response is rejected by
  the `zod` schema rather than silently accepted; the happy path parses
  correctly. The Anthropic client is fully mocked — no real API call.
- All 21 tests (5 files) run against mocked Prisma/Anthropic clients, no
  live database or API key required.

## Security Improvements

- Upload validation: MIME-type allowlist and a size cap enforced by
  `multer` before any adapter sees the buffer; oversized/wrong-type
  uploads are rejected before processing.
- Tenant scoping resolved exclusively server-side, exactly like the
  restaurant/menu modules — never accepted from the client; cross-tenant
  job access returns `404`, not `403`.
- AI-extracted content is never trusted implicitly: approval still goes
  through `menu.service.ts`'s existing validation (name length,
  non-negative integer `priceCents`).
- Uploaded files are stored outside any web-servable path and are never
  executed.
- `ANTHROPIC_API_KEY` stays server-side only.
- `POST /api/imports` is rate-limited to bound AI API cost exposure per
  account.

## Known Limitations

- **No live database or Anthropic API key in this sandbox** (recurring
  constraint from every prior sprint): the actual extract → review →
  approve round trip against a real PDF/image has not been exercised
  here. Unit tests cover the tenant-scoping, approval-gating, and
  response-validation logic with mocks in its place.
- **Review is approve/reject only, not inline-editable** — a v1
  limitation; correcting an AI extraction error currently means
  rejecting and re-uploading, not editing in place.
- **No real background job queue** — the MVP `ImportJobRunner` runs
  in-process; the interface is the seam for swapping in a real queue
  (BullMQ/SQS) later without touching the controller.
- **No import job retention/cleanup policy** — uploaded files and job
  rows accumulate with no expiry, by design deferred.
- **Website/Google Maps/DoorDash/Uber Eats/Grubhub have no real
  extraction logic** — interfaces and stubs only, as scoped.

## Verification Results

- `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and
  `pnpm run build` all pass cleanly at the repo root after the merge to
  `main`.
- `prisma validate` and `prisma generate` succeed against the updated
  schema.
- `vitest run` in `apps/api`: 5 test files, 21 tests, all passing.
- The compiled Express server (`node dist/src/index.js`) was confirmed
  as the genuine running binary and stayed stable while being
  exercised.
- Manually verified: every new import endpoint (`POST /api/imports`,
  `GET /api/imports`, `GET /api/imports/:id`,
  `POST /api/imports/:id/approve`) returns `401` when called without
  authentication.
- `pnpm run build` for `apps/web` registers the new routes
  (`/dashboard/import`, `/dashboard/import/[id]`) as expected.
- Not verified in this environment (requires a live Postgres instance
  and a real `ANTHROPIC_API_KEY`): an actual PDF/image upload completing
  extraction, the `501` response for a deferred source end-to-end, and a
  real approve-into-menu round trip.

---

# Release Notes — Sprint 05: Website Import + Google Maps Import

## Sprint 05 Summary

Sprint 05 turned two of Sprint 04's five stub import sources into real,
working adapters — **Website** and **Google Maps** — proving out the
"adding a source is one adapter file" extensibility claim the Import
Engine was designed around. DoorDash, Uber Eats, and Grubhub remain
untouched stubs. No `ImportJob` schema migration was needed for either
new source, confirming the Sprint 04 design: `sourceUrl` already existed
unused, and `extractedData` is already a JSON column.

## Website Import

`WebsiteImportAdapter` fetches a restaurant's menu page once and extracts
from **both** its text content and any candidate menu images embedded in
it — not one or the other:

- `cheerio` parses the fetched HTML to produce readable text (stripping
  `<script>`/`<style>`/nav/footer noise) and to collect every on-page
  `<img>` as a candidate (`apps/api/src/modules/imports/adapters/website/parse-page.ts`).
  Heading association is computed by walking the document in order, so
  an image several containers deep under a "Menu" heading is still
  correctly associated with it.
- Page text goes through a new `extractMenuFromText`; the top-ranked
  candidate images (see Image Ranking Heuristic below) go through
  Sprint 04's existing `extractMenuFromImages` unchanged — the concrete
  reuse point between the two extraction paths.
- Both results are combined into one `ExtractedMenuData` via a new
  `mergeExtractedMenuData` helper.
- A single bad image (fetch failure, disallowed host, unsupported
  content) or a failed text extraction doesn't fail the whole import —
  each extraction attempt is caught independently, and whatever
  succeeds is still merged and sent to review.
- Number of images processed per page is capped by
  `IMPORT_WEBSITE_MAX_IMAGES` (default 5).

## Google Maps Import

`GoogleMapsImportAdapter` accepts either a raw Google Place ID or a Maps
URL (including `maps.app.goo.gl` short links, resolved via redirect):

- `resolve-place-id.ts` handles the common URL shapes (direct Place ID,
  `place_id`/`query_place_id` query params, a `ChIJ`-style ID embedded
  anywhere in the URL, short-link redirect resolution) but is explicitly
  isolated in one function since Google's URL formats aren't a stable
  public contract — see Known Limitations.
- `places-client.ts` calls the Google Places API (New) directly via
  plain `fetch` — Place Details for profile fields (name/address/phone)
  and photo references, and Photo Media to fetch actual photo bytes. No
  Google SDK dependency was added for two endpoints.
- Google's Places API has **no itemized-menu endpoint** — any menu
  content comes from running up to 3 listing photos through the
  existing `extractMenuFromImages`, exactly like the Website adapter's
  image path. Results across profile + all photos are combined via the
  same `mergeExtractedMenuData` helper used by the Website adapter.
- A single unavailable/failed photo doesn't fail the whole import.

## businessProfile Changes

`ExtractedMenuData` gained an optional `businessProfile`
(`name?`/`address?`/`phone?`) — named generically rather than
"restaurant profile" per explicit direction, so the import engine's data
shape isn't tied to one business type as more sources are added later.
Approving a job whose `extractedData.businessProfile` is present now
also updates the restaurant's profile fields (via a new
`updateRestaurantById` in `restaurant.service.ts`), in addition to
creating any extracted menu categories/items — reusing Sprint 03's
existing validation (`updateRestaurantSchema`) rather than duplicating
it. The review page previews these fields before approval so the
reviewer knows what will change.

## SSRF Protection

Both new sources fetch a server-side URL the caller influences (directly
for Website, indirectly via short-link resolution for Google Maps), so a
shared guard, `safeFetch` (`apps/api/src/lib/safe-fetch.ts`), was added
and is mandatory for every such outbound call — including the Website
adapter's embedded-image fetches, which go through it exactly like the
page fetch itself rather than being treated as "already trusted" just
because the URL came from a page already fetched. `safeFetch`:

- Rejects non-http(s) URL schemes.
- Resolves DNS and rejects private/loopback/link-local/CGNAT/reserved
  ranges, including the `169.254.169.254` cloud metadata endpoint.
- Re-validates the target of every redirect hop (not just the original
  URL), capped at 3 redirects.
- Enforces a request timeout and a maximum response size, both via a
  streamed read with a byte-count cap (not relying solely on
  `Content-Length`, which a server could omit or misreport).
- **Known residual risk**: this checks the resolved address at lookup
  time but doesn't pin the connection to that exact address, so a
  DNS-rebinding attack (the hostname resolving differently between the
  check and the actual request) isn't defended against — noted directly
  in the code and called out here rather than overclaiming full
  protection.
- The Google Places API calls themselves use plain `fetch` (not
  `safeFetch`), since their host (`places.googleapis.com`) is fixed and
  trusted, not derived from caller input — `safeFetch` is reserved for
  genuinely attacker-influenced URLs.

## Image Ranking Heuristic

`rank-menu-images.ts` scores candidate on-page images using alt text,
the nearest preceding heading's text, the filename, and declared
width/height for menu-related signals (`menu`, `food`, `dish`, category
names, etc.) versus non-menu signals (`logo`, `icon`, `favicon`,
`banner`, etc.), plus a size heuristic favoring larger images over
icon-sized ones. Per explicit direction, this **ranks rather than
filters**: even when nothing scores well, the top-ranked candidates up
to the configured cap are still processed, so a page with no
obviously-labeled menu image doesn't silently yield zero image
candidates — the heuristic influences priority, not inclusion.

## API/Frontend Changes

- No new routes. `POST /api/imports` now also accepts
  `sourceType: WEBSITE | GOOGLE_MAPS` with a `sourceUrl` form field
  instead of a file — the same multipart body, since `multer` parses
  text fields whether or not a file is attached.
- `ImportAdapter` gained `readonly inputKind: "file" | "url"` so
  `import.controller.ts` decides whether to require a file upload or a
  `sourceUrl` by reading the registered adapter's declared input kind —
  never a hardcoded per-source-type list, the same extensibility pattern
  Sprint 04 used for the `implemented` flag.
- `apps/web`'s upload form: Website and Google Maps moved from disabled
  to enabled, with a URL text input replacing the file input for these
  two sources; DoorDash/Uber Eats/Grubhub remain visibly present but
  disabled.
- The import review page shows a restaurant-profile preview section
  whenever `extractedData.businessProfile` is present.

## Tests Added

All new tests run against mocked Prisma/Anthropic/Places-API/`safeFetch`
— no live network, database, or API keys required, consistent with
every prior sprint:

- `safe-fetch.test.ts` — rejects non-http(s) schemes, private/loopback/
  link-local IPs, and the cloud metadata endpoint; rejects a redirect
  chain that points at a disallowed address partway through; enforces
  both the `Content-Length`-declared and the streamed byte caps.
- `rank-menu-images.test.ts` — proves ranking rather than filtering,
  including the case where no candidate has any positive signal.
- `merge-extracted-data.test.ts` — concatenates categories across
  results in order; fills `businessProfile` fields from the first
  result that has each one; handles empty-categories results.
- `vision-extractor.test.ts` — extended with `extractMenuFromText`
  coverage (valid response including `businessProfile`, malformed
  response rejected).
- `website.adapter.test.ts` — text-only pages, text+image merging, the
  `IMPORT_WEBSITE_MAX_IMAGES` cap, and a failed image not sinking the
  whole import.
- `resolve-place-id.test.ts`, `places-client.test.ts`,
  `google-maps.adapter.test.ts` — Place ID resolution (direct ID, query
  param, embedded `ChIJ` pattern, short-link redirect), Places API
  response mapping, and the photo-count cap / partial-failure handling.
- `registry.test.ts` and `import.service.test.ts` updated: Website and
  Google Maps now assert `implemented: true`/`inputKind`; a new
  `approveJob` case confirms `businessProfile` is applied via
  `updateRestaurantById` when present, and left untouched when absent.
- Total: 64 tests across 12 files in `apps/api` (up from 21 across 5 in
  Sprint 04).

## Known Limitations

- **No live database, network egress, Anthropic key, or Google Maps API
  key in this sandbox** (recurring constraint): the actual fetch →
  extract → review → approve round trip for either source, and the
  live SSRF-rejection/`501` behaviors, can't be exercised end-to-end
  here — covered by unit tests with mocks instead.
- **Google Maps URL parsing is inherently fragile** — Google doesn't
  publish a stable contract for share-link formats; `resolvePlaceId`
  will need maintenance as those formats drift, and a URL that doesn't
  match one of the handled shapes requires passing the Place ID
  directly instead.
- **DNS-rebinding is not defended against** by `safeFetch` (see SSRF
  Protection above) — a known, documented residual risk, not silently
  assumed away.
- **Website import is static-HTML-only** — no headless browser
  rendering, so JS-rendered single-page-app menus yield a thin or empty
  extraction (not a crash; the human review step catches it).
- **Google Maps menu-photo extraction is best-effort by design** — most
  listings don't have an actual menu photo, so many Google Maps imports
  will yield a `businessProfile` with zero categories/items. Expected
  behavior, not a bug.
- **Review remains approve/reject only**, not inline-editable — carried
  over from Sprint 04, unchanged this sprint.
- **DoorDash, Uber Eats, and Grubhub are unaffected** — still stubs,
  still `501`, untouched this sprint.

## Verification Results

- `pnpm run lint`, `pnpm run typecheck`, `pnpm run test`, and
  `pnpm run build` all pass cleanly at the repo root after the merge to
  `main`.
- `prisma validate` passes — schema is unchanged this sprint, confirming
  no migration was needed.
- `vitest run` in `apps/api`: 12 test files, 64 tests, all passing.
- The compiled Express server (`node dist/src/index.js`) was confirmed
  as the genuine running binary and stayed stable while being
  exercised.
- Manually verified: `POST /api/imports` (Website and DoorDash source
  types) returns `401` when called without authentication, confirming
  `requireAuth` is applied uniformly ahead of the source-type/`501`
  check.
- `pnpm run build` for `apps/web` continues to register the import
  routes with the updated upload form.
- Not verified in this environment (requires a live Postgres instance,
  network egress, an `ANTHROPIC_API_KEY`, and a `GOOGLE_MAPS_API_KEY`):
  a real website fetch and extraction, a real Google Places API call, a
  live SSRF rejection against an actual private address, and a real
  approve-into-menu round trip for either source.

# Release Notes — Sprint 06: AI Website Builder

## Sprint 06 Summary

Sprint 06 gives a restaurant owner a one-click path from an imported menu
to a published, real, rendered restaurant website. It implements the full
approved Sprint 06 specification: a Theme Engine with a curated catalog
across three style families, deterministic AI-driven theme matching, an
AI Generator pipeline that produces three complete design variations per
generation batch, a five-dimension AI Website Score with ranked one-click
fixes, a constrained draft editor, and — added in a review follow-up once
the approved spec's own build order was checked line-by-line — the Layout
Engine and public component library that actually renders `SiteDefinition`
JSON into real HTML, plus static site generation at publish, a live
preview system, and Host-based public serving.

This sprint shipped in two passes on the same branch:

1. **First pass**: Theme Engine, AI Generator (Brand Analysis, content
   generation, theme matching), AI Website Score, constrained editor,
   publish/rollback/domain/contact-form data-layer workflow.
2. **Review follow-up**: the reviewer asked whether "no public site
   renderer" was an approved boundary of the spec or a gap. Re-reading the
   spec's own "Suggested build order within the sprint" showed the Layout
   Engine + component library listed as step 2 of *this* sprint's build
   order, not deferred to a later one — so it was implemented before this
   sprint was approved for merge.

## Theme Engine

- 8 curated themes across three style families — **Luxury** (`fine-dining`,
  `elegant-dark`), **Modern** (`modern-bistro`, `street-food`, `coastal`),
  **Minimal** (`cafe`, `casual-family`, `rustic-minimal`) — each carrying
  design tokens (color seed, typography pairing, radius, motion, type-scale
  ratio), component variants (hero style, menu layout), an allowed home-page
  section order, a personality vector, cuisine affinities, and hard
  constraints (e.g. a minimum photo count for photo-dependent themes).
- Theme selection is **deterministic, not LLM-based**: Brand Analysis (LLM)
  produces a personality vector once; a pure cosine-similarity scoring
  function over bipolar-centered axes (so opposite ends of a spectrum are
  genuinely dissimilar, not just "less similar") picks the best-fit theme
  per style family. Golden tests pin the exact expected theme for fixture
  profiles (upscale sushi, casual taqueria, French patisserie) and confirm
  the same inputs always produce the same theme.
- Every style family always returns a theme, even when every candidate in
  that family is hard-excluded by a photo-count constraint — a documented
  fallback picks the family's least photo-dependent theme rather than
  leaving the Variation Picker with a missing option.
- Palette derivation (`lib/color.ts`) expands one seed color into a 10-step
  OKLCH scale per token (primary/secondary/accent/surface/text/success/
  error), and **guarantees** — not just hopes — that the CTA-button pairing
  (white text on primary-600) and the body-text pairing (text-900 on
  surface-50) pass WCAG AA, auto-adjusting lightness if the raw seed would
  fail. Verified against adversarial seed colors in tests, not just typical
  ones.

## AI Website Generator

- Pipeline: ingest live restaurant/menu data → Brand Analysis (LLM,
  structured Brand Profile with per-field confidence) → AI theme selection
  (×3, deterministic) → shared content core (LLM, generated once) →
  per-variation tone adaptation (LLM, ×3 only — the expensive stages run
  once, keeping the 3-variation cost well under 3× a single generation) →
  assembly into three `SiteDefinition` documents → AI Website Score (×3) →
  finalize as three `SiteVersion` rows sharing one `generationBatchId`.
- **Every AI-backed stage has a non-throwing safe-default fallback** —
  brand analysis falls back to a neutral profile (confidence 0), content
  generation falls back to templated copy, the brand-consistency judge
  falls back to a neutral score. The pipeline cannot "fully fail" from an
  LLM outage; it only fails a batch on a genuine infrastructure error,
  which by definition would also prevent any fallback from persisting.
- Low-confidence Brand Profile fields are overridden with safe defaults
  before theme matching runs, rather than trusting a weak guess.
- A profanity/claims filter strips unverifiable superlative claims
  ("best in the world", "award-winning", fabricated health claims) from
  every LLM-generated copy field before it's stored.
- Facts (address, phone, hours, whether online ordering/reservations
  exist) are **never** LLM-generated — they're copied verbatim from
  structured data into every variation, byte-identical across all three,
  verified by test.
- CTA copy (`cta.ts`) is computed by a small deterministic function, not
  the LLM: online ordering wins if it exists, then reservations, then a
  plain "View Menu" — with family-appropriate wording (formal for Luxury,
  energetic for Modern, terse for Minimal).
- Regeneration replaces only the unselected `VARIATION` rows for a site;
  an already-selected `DRAFT` is left untouched.

## AI Website Score

- Five dimensions, equally weighted into one overall score: **SEO**
  (rule-based: title/meta length, cuisine keyword presence, alt-text
  coverage), **Performance** (a documented heuristic proxy — see Known
  Limitations), **Accessibility** (rule-based: hero-over-photo contrast,
  alt-text coverage; body-text/button contrast is a structural guarantee
  from the Theme Engine, not scored here since it can't actually fail),
  **Brand Consistency** (hybrid: deterministic font/palette-adherence
  checks plus an LLM judge comparing copy tone against the stored Brand
  Profile), **Conversion** (rule-based: primary CTA above the fold,
  hours/location on the home page, a click-to-call phone number).
- Every failed check produces a ranked `Suggestion` object
  (`{dimension, issue, impact, suggestion, autoFixKind?}`); suggestions
  are pooled across dimensions and sorted high-impact first.
- **Three working one-click auto-fixes**: `missingAltText` (asset layer —
  generates deterministic alt text per asset kind + restaurant name),
  `heroContrast` (definition layer — boosts a hero's scrim opacity until
  white text clears WCAG AA against the image's measured or assumed
  luminance), `missingMetaDescription` (definition layer — regenerates an
  empty meta description from the tagline/cuisine/city). Each fix is
  tested to actually resolve the specific check that flagged it.
- Publish re-scores the draft and **warns** (never blocks) if the new
  score is lower than the currently-live version's score.

## Public Website Renderer (Layout Engine + Component Library)

- **Layout Engine** (`renderer/layout-engine.ts` + `registry.ts`): a
  section-type → component registry. Unregistered or future/deprecated
  block types are skipped with a logged warning rather than crashing a
  page. `testimonials` is deliberately left unregistered — there is no
  testimonial data source in this data model, and §2's guardrail against
  fabricating one means the correct behavior for that block type is to
  never render, which the graceful-degradation path already provides for
  free.
- **Public component library** (`renderer/components/`): Hero (3 variants,
  auto-contrast scrim over a photo when one exists), SignatureDishes,
  AboutTeaser/AboutStory (with an optional photo band), HoursLocation (with
  a Google Maps search-query link needing no API key), MenuSection,
  Gallery (with a lightweight lightbox), CtaBanner, ContactInfo/ContactForm
  (honeypot-protected, posts to the existing public contact endpoint),
  SiteHeader/Nav, SiteFooter, MobileActionBar (Call/Directions/primary
  CTA, hidden at desktop widths). Every interpolated string is
  HTML-escaped — owner-editable and LLM-generated text is never trusted as
  markup.
- **One shared renderer**: `renderPage()` (pure) and `renderAllPages()`
  (resolves live data, then delegates to `renderPage()`) are the *only*
  rendering code path — used identically by the on-demand preview route
  and by static generation at publish, so the two can never drift apart.
- **The Menu section queries live data at render time** — `MenuCategory`/
  `MenuItem` rows, not a snapshot baked into the stored `SiteDefinition` —
  matching the spec's "single source of truth" requirement for the menu
  page.
- SEO/OG/JSON-LD (`renderer/seo-head.ts`, `json-ld.ts`): title, meta
  description, canonical URL, Open Graph + Twitter Card tags, a generated
  1200×630 SVG share image (a template-based card, not a headless-browser
  screenshot), and JSON-LD (`Restaurant` with live `hasMenu`/
  `MenuSection`/`MenuItem`, plus `BreadcrumbList`) on every page.
- `sitemap.xml` and `robots.txt` are generated per release
  (`renderer/sitemap.ts`).

## Publish Workflow

- `publishSite` renders every page of the draft via the shared renderer
  and writes each to a new `releaseStorage` (local-disk object-storage
  substitute, same swappable-interface pattern as the existing
  `fileStorage`/`safeFetch` libs), along with `sitemap.xml`, `robots.txt`,
  and the OG share image for that release.
- Pre-publish checks: the stored definition must parse against
  `siteDefinitionSchema` (schema-valid gate), and any photo assets that
  exist must have finished processing. Contrast and required-field checks
  are *not* re-checked here since they're already hard guarantees earlier
  in the pipeline — repeating them would be dead code.
- Publish re-scores and warns (never blocks) on a score drop versus the
  live version; the most recent 10 releases are retained, older ones
  auto-archived.
- **Rollback** re-materializes the target release's static pages with
  *current* live menu/profile data (not whatever was live when that
  release first published), so a one-click rollback never resurrects
  stale prices.
- **Menu/profile revalidation**: menu item/category mutations and
  restaurant-profile updates each trigger a fire-and-forget
  `revalidatePublishedSite()` call that re-renders and overwrites the
  currently-published release's static pages — a price change appears on
  the live site without a republish.
- **Public serving**: a Host-header-based middleware resolves an incoming
  request to a `Site` (via the `{slug}.{platform-domain}` pattern or a
  verified custom `Domain`), serves its pre-rendered static pages, a 503
  holding page when `UNPUBLISHED`, and `sitemap.xml`/`robots.txt`/the OG
  image — the closest substitute available in this sandbox for real edge/
  CDN routing.
- **Preview**: a signed, expiring, site-scoped JWT (`GET
  /api/sites/:id/preview-token`) plus a `GET /preview/:token` route that
  renders on demand from the latest draft (or a specific `?variation=`),
  always with `noindex`/no-store headers — never a stale static file. The
  dashboard's variation-preview page embeds this behind a real mobile/
  tablet/desktop device-toggle iframe, proxied through `next.config.ts`.

## Database Changes

9 new Prisma models, all tenant-scoped through `Site.restaurantId`:

| Model | Purpose |
|---|---|
| `Site` | One website per restaurant — slug, status, active theme, published-version pointer, persisted Brand Profile, settings |
| `SiteVersion` | Every generated/edited/published cut of a site — `SiteDefinition` JSON, status (VARIATION/DRAFT/PUBLISHED/ARCHIVED), style family, generation batch id |
| `Theme` | The curated theme catalog — tokens, variants, layouts, personality vector, cuisine affinities, constraints |
| `SiteScore` | One AI Website Score snapshot per `SiteVersion` |
| `Domain` | Custom/platform domains — verification + TLS status, primary flag |
| `SiteAsset` | Uploaded images (hero/gallery/logo/OG) — storage key, renditions, alt text |
| `GenerationJob` | One row per generation batch — stage/status/error tracking |
| `ContactMessage` | Public contact-form submissions — hashed IP only |

Plus 9 new enums (`SiteStatus`, `SiteVersionStatus`, `StyleFamily`,
`ScoreSource`, `DomainType`, `DomainVerificationStatus`, `DomainTlsStatus`,
`AssetKind`, `GenerationStage`, `GenerationStatus`). No live migration was
run (no live Postgres in this sandbox, same constraint as every prior
sprint); `prisma validate` passes against the schema as merged.

## API Endpoints

31 endpoints under `/api/sites` (authenticated, tenant-scoped): site core
(`GET /me`, `POST /`, `PATCH /:id`, `GET /:id/preview-token`), generation
and variations, versions and draft editing, scoring and suggestion
auto-fixes, assets, publish/rollback/unpublish and domain management,
and the contact-message inbox. Public/unauthenticated:
`POST /public/sites/:id/contact` (rate-limited, honeypot-protected). New
non-API routes added in the renderer follow-up: `GET /preview/:token` and
a Host-header site-resolution middleware mounted ahead of `/api`.

## Frontend Pages

Seven pages under `/dashboard/website`: the Website Hub, the Variation
Picker (with a full per-variation preview page — now a real device-toggle
iframe, not only a structured data view), a constrained draft Editor, the
Score Panel (with re-score and one-click auto-fix), Publish & Domains
(releases list, rollback, a DNS verification wizard), and the contact-form
Messages inbox.

## Tests Added

**366 tests across 58 files** (up from 64/12 after Sprint 05) — golden
theme-matching tests against fixture brand profiles, color/contrast math
including adversarial seed colors, `SiteDefinition`/Brand Profile schema
validation, the full generator orchestrator (mocked LLM, verified
non-throwing on failure), all five scorers against known-defect fixtures,
auto-fix-resolves-its-own-triggering-check tests, the entire renderer
module (HTML-escaping/XSS, Layout Engine graceful degradation, JSON-LD
validity, sitemap/robots content, static-file writes on publish,
preview-token validation, live-menu-data rendering vs. a stale snapshot,
custom-domain Host-header routing, the menu/profile revalidation hooks),
and tenant-isolation checks throughout.

## Known Limitations

- **No live LLM, database, or network egress in this sandbox** — every AI
  call, DNS lookup, and rendering path is unit-tested via mocks or direct
  fixture invocation, not exercised against live infrastructure end-to-end.
  A full generate → publish → serve round trip against a real domain has
  not been run.
- **Performance score is a documented heuristic proxy, not real
  Lighthouse** — there's no live hosting in this sandbox to audit against.
  `performance-score.ts` states this explicitly; swapping in a real
  Lighthouse runner later requires no change to its callers.
- **No real image processing** — no WebP/AVIF renditions, no LQIP
  placeholders, no EXIF/GPS stripping. Site assets are stored through the
  existing local-disk `fileStorage`, sharing a directory with Import
  Engine uploads rather than a dedicated site-asset path.
- **No real ACME/TLS issuance** — custom-domain DNS ownership verification
  is real (an actual CNAME lookup against the expected edge target) and
  tested; TLS status remains `PENDING` indefinitely since there's no ACME
  account or edge server here to issue a certificate.
- **The OG share image is a generated SVG template**, not a
  headless-browser screenshot — valid as an `og:image` on most platforms
  that render link previews, but not pixel-identical to what a real page
  screenshot would produce.
- **No live email delivery** for contact-form notifications — submissions
  are fully persisted and visible in the dashboard inbox; emailing the
  owner would need a configured email provider this environment doesn't
  have.
- **Social links are not rendered** — the `Restaurant` model has no
  social-profile fields yet; `SiteFooter` omits that section entirely
  rather than rendering empty links.
- **No structured hours model** — `SiteFacts.hours` exists in the schema
  but nothing currently populates it, so an "open now" indicator (from the
  original spec's Contact page description) isn't shown.
- **DoorDash, Uber Eats, and Grubhub import sources are unaffected** —
  still stubs, still `501`, untouched this sprint (carried over from
  Sprint 04/05).

## Verification Results

- `pnpm install`, `pnpm --filter api exec prisma generate`, and
  `pnpm --filter api exec prisma validate` all pass on `main` after the
  merge.
- `pnpm run lint` and `pnpm run typecheck` pass cleanly at the repo root.
- `pnpm run test` — **366/366 tests passing** across 58 files in
  `apps/api`.
- `pnpm run build` — both `apps/api` (`tsc`) and `apps/web` (`next build`,
  Turbopack) compile successfully, including every new
  `/dashboard/website/*` route.
- Manually rendered a fixture `SiteDefinition` through the real
  `renderPage()` pipeline (not mocks) and confirmed genuine output: correct
  SEO tags, valid JSON-LD reflecting live menu data, a complete OKLCH
  color-token stylesheet, and working navigation/hero/footer/mobile-
  action-bar markup with real `tel:`/Google Maps links.
- Not verified in this environment (requires live Postgres, a real
  `ANTHROPIC_API_KEY`, a resolvable custom domain, and live hosting): an
  end-to-end generate → select → publish → serve round trip against a
  real browser, a real Lighthouse audit, and real ACME certificate
  issuance.

## Sprint 07 Summary

Sprint 07 is what makes `SiteFacts.hasOnlineOrdering` true and the "Order
Now" CTA real: a full Commerce & Fulfillment Engine, implemented exactly
against the approved (Revision 2) `SPRINT_07_MASTER_SPECIFICATION.md`.
It adds guest/customer cart and checkout, multi-provider BYOP payment
orchestration with transparent failover, BYO-delivery fulfillment with
driver tracking, a rule-based Smart Delivery Routing engine, kitchen
capacity management, coupons, QR dine-in ordering, a stub-only POS
adapter architecture, schema-only loyalty/gift-cards, and customer-,
owner-, and staff-facing frontends for the whole flow.

`apps/api/src/modules/commerce/` follows the existing per-module layering
(`routes → controller → service`, `validation.ts`/`errors.ts` per module,
`getOwnRestaurantId` + explicit row-level ownership re-check for tenant
isolation, cross-tenant access always 404 never 403) and reuses the
adapter/registry pattern proven in Sprint 04's import engine for four
separate provider families: payments, fulfillment, POS, and notifications.

## Commerce Engine Architecture

- 14 sub-modules under `commerce/`: `cart`, `checkout`, `orders`,
  `payments`, `fulfillment`, `delivery-rules`, `menu-commerce`, `coupons`,
  `customers`, `pos`, `qr-ordering`, `loyalty` (schema-only), `events`,
  `notifications` — dependency direction is strictly one-way and acyclic:
  `checkout` depends on `cart`/`menu-commerce`/`delivery-rules`/`payments`;
  `orders` depends only on `checkout`'s output; `fulfillment` depends on
  `orders`/`delivery-rules`; `pos` and `qr-ordering` are alternate
  order-source entry points that funnel into the same `checkout`/`orders`
  core rather than duplicating it; `events`/`notifications`/`loyalty` are
  pure subscribers nothing in the core flow imports back.
- **In-process event bus** (`commerce/events/`), typed on the Prisma
  `OrderEventType` enum itself, with wildcard `"*"` subscription support.
  A real bug was found and fixed here during testing: the bus only caught
  *asynchronous* handler rejections, not synchronous throws, which would
  have broken `emit()` for every sibling handler — fixed with an explicit
  synchronous `try/catch` alongside the async one.
- **`writeOrderEvent`/`emitOrderEvent` are deliberately separate calls**:
  the DB write happens inside a `$transaction`, the event-bus emission
  happens only after that transaction commits — an event is never emitted
  for a write that could still roll back.
- **Envelope encryption** (`lib/encryption.ts`, AES-256-GCM) protects
  every stored payment/fulfillment/POS provider credential and webhook
  secret; plaintext never touches the database.
- **Postgres-backed idempotency** (`lib/idempotency.ts`): every mutating
  endpoint that can plausibly be double-submitted (place-order, refund,
  coupon-redeem) requires an `Idempotency-Key` header, reserved via a
  `create()`-then-catch-P2002 race against a dedicated table — deliberately
  not an in-memory check-then-write, which would double-charge a customer
  under multiple server instances.

## Full Multi-Provider BYOP Payments

- A restaurant can hold several simultaneously-`CONNECTED`
  `PaymentProvider` rows (e.g. Stripe **and** Square **and** Clover at
  once) — never a platform-wide payment account. Stripe ships as a real
  adapter (`capture_method: "manual"`, separate authorize/capture/void/
  refund); Clover, Square, Authorize.net, Adyen, and Fiserv are registered
  stub adapters (`implemented: false`), visible but unavailable in the
  dashboard, exactly like Sprint 04/05's DoorDash/Uber Eats/Grubhub import
  stubs.
- **Orchestrator failover**: `authorizeOrderPayment` builds a
  priority-ordered candidate list of `CONNECTED` providers, tries each via
  the adapter interface, writes one `PaymentAttempt` per try, and returns
  on first success — the customer never sees which provider was used, and
  a disconnected/erroring primary transparently fails over to the next.
- **Webhook handling** is signature-verified per-connected-provider
  (BYOP means each restaurant's webhook secret differs, so the specific
  `PaymentProvider` row is identified via `?providerId=`), writes a
  `WebhookEvent` row first to dedupe retried deliveries (P2002 →
  `{status: "duplicate"}`), and requires `express.json({ verify })` in
  `app.ts` to preserve the raw request bytes the signature was computed
  over.
- Cash payment methods (`CASH_ON_DELIVERY`/`CASH_AT_PICKUP`) bypass the
  provider entirely but still produce a `Transaction` row when marked
  paid, so the accounting trail is uniform regardless of payment rail.

## Checkout, Cart & Order Lifecycle

- **Price-drift protection**: `CartItem.unitPriceCents` freezes the price
  (base + variant delta + selected modifier deltas) at add-time;
  `placeOrder` re-validates against the current `MenuItem.priceCents` +
  `MenuItemVariant.priceDeltaCents` before charging — a documented known
  limitation is that modifier-*option*-level drift isn't re-checked, only
  base-price drift.
- **Checkout quotes are computed fresh on every call, never cached** — a
  deliberate simplification over a "quote lock with expiry" scheme: there
  is no stale quote to accidentally honor, since `placeOrder` recomputes
  the identical function immediately before charging.
- **Order creation happens in one atomic transaction before any payment
  provider network call** (Order/OrderItem/Fulfillment/CouponRedemption
  rows, since `PaymentAttempt.orderId` is a real FK requiring the Order to
  exist first), but the transaction boundary stops there — the external
  payment call happens outside it.
- **Centralized state machine** (`orders/order-state-machine.ts`): one
  `TRANSITIONS` table is the only place in the codebase permitted to
  decide whether an `Order.status` change is legal. There is no separate
  manual "confirm" staff action — `placeOrder` already transitions
  `PENDING_PAYMENT → CONFIRMED` automatically at payment success (or
  immediately for cash); staff's first manual action is `startPreparing`.
- **Cancellation never auto-refunds** — a captured payment stays captured
  until staff explicitly issues a refund; refunding transitions the order
  to `REFUNDED` only on a full refund, a partial refund only updates
  `paymentStatus`.
- **Guest checkout** uses an anonymous `guestSessionId` in an httpOnly
  cookie, entirely separate from both staff and customer auth cookies;
  `GuestCustomer` rows are created only at order-placement time, never at
  cart-creation time.
- **Customer auth** is a fully separate identity from staff `User`/`Role`
  — JWT-based with `kind: "customer"`/`"customer-refresh"` discriminators
  reusing `JWT_ACCESS_SECRET`, since the approved schema has no
  `CustomerRefreshToken` table (a documented, deliberate divergence from
  staff auth's opaque-hashed-token-in-DB pattern).

## Delivery Rules & Smart Routing Engine

- `commerce/delivery-rules/` adds radius/max-distance/min-order
  configuration, delivery-fee and service-fee rules (flat/per-mile/
  percentage), delivery zones (radius or polygon) with fallback chains,
  and kitchen capacity (manual pause + auto-pause at a configured
  concurrent-order threshold).
- **`evaluateRouting()`** (`smart-routing.ts`) is a pure, deterministic,
  rule-based function — no DB access, no AI — implementing the spec's
  exact check order: restaurant closed → kitchen unavailable →
  fulfillment-type branch → for delivery: max-distance ceiling → min-order
  → radius-mode-or-zone/rule-mode resolution with busy-driver fallback
  chains. A design bug was caught and fixed before shipping: the function
  originally tried to compute a delivery fee itself (always resolving to
  0, silently wrong) — fee computation was removed entirely and is now
  exclusively the caller's (`quote.service.ts`'s) responsibility, keeping
  eligibility and pricing as separate concerns.

## Fulfillment & Driver Tracking

- `FulfillmentProviderAdapter` interface + registry, same BYO pattern as
  payments: Uber Direct, DoorDash Drive, and Local Courier are registered
  stub adapters; pickup and restaurant-driver fulfillment need no external
  provider connection at all.
- `DriverAssignment`/`DriverLocationPing` track a driver's current
  position (denormalized "latest" fields plus an append-only ping
  history) via a driver-facing location-ping endpoint, authorization-
  checked so a staff member can only post pings for their own assigned
  delivery (a 403, not a 404 — the fulfillment visibly exists to other
  staff, it just isn't this staffer's delivery).
- A driver's own delivery queue (`GET .../fulfillment/my-assignments`)
  and accept/decline action (`POST .../assignments/:id/respond`) were
  added during frontend integration — `respondToAssignment` already
  existed in the service layer from the original build but had no
  controller/route exposing it; this closed that gap rather than leaving
  the driver frontend without a way to list or answer its own offers.

## QR Dine-In Ordering & POS

- `commerce/qr-ordering/`: `Table` rows carry a high-entropy, regenerable
  `qrToken` — the sole authorization for "which restaurant and table this
  order is attributed to," resolved server-side from a scanned token,
  never trusted from a client-supplied table id. A scanned QR bootstraps a
  `DINE_IN` cart pre-associated with the table before the diner ever sees
  the menu.
- `commerce/pos/`: `POSProviderAdapter` interface + registry for Square,
  Clover, Toast, Lightspeed, and a generic adapter — all stubs this
  sprint, shown as "coming soon" in the dashboard exactly like the
  payment/fulfillment stub providers.

## Customer-, Owner-, and Staff-Facing Frontend

- **Customer-facing** (`apps/web/src/app/order/*`, `/account/*`): menu
  browsing with variant/modifier selection, a cart with fulfillment-type
  and coupon controls, a checkout page surfacing tax/delivery-fee/
  service-fee/discount/tip as separate line items, order confirmation,
  order tracking (curated milestone timeline), customer registration/
  login, and an account page for addresses and favorites. A QR landing
  page (`/order/qr/[qrToken]`) resolves a scanned table token and
  bootstraps the dine-in cart before redirecting to the menu.
- **Owner-facing** (`apps/web/src/app/dashboard/*`, extended): orders
  inbox and detail with state-machine-aware action buttons and refund
  issuance, multi-provider payment connection/priority management,
  delivery/fee/minimum-order configuration, kitchen capacity pause/resume,
  a POS "coming soon" list, table/QR management with per-table scan
  links, and coupon CRUD.
- **Staff-facing**: a kitchen queue view (active orders across
  confirmed/preparing/ready/out-for-delivery, one-tap status advances) and
  a driver view (assigned deliveries, accept/decline, mark picked up/
  delivered, and a periodic browser-geolocation-based location ping while
  a delivery is en route).
- A public menu-browsing endpoint (`GET /api/public/restaurants/:id/menu`)
  was added during frontend integration — the approved API design listed
  every cart/checkout/order endpoint the customer frontend needs but not
  a way to actually browse a restaurant's live orderable menu (with
  variants, modifier groups, and inventory-derived availability) before
  adding to a cart; this was a genuine gap in the endpoint list, not a
  scope addition.

## Known Limitations

- **Modifier-option-level price drift isn't re-validated at checkout** —
  only base menu-item price drift is; documented in `checkout.service.ts`.
- **`GET /api/public/checkout/:cartId/fulfillment-options`**, listed in
  the approved API design as a convenience endpoint, was not built — its
  functionality is subsumed by the quote endpoint's `eligible`/`reason`
  fields, which already communicate fulfillment ineligibility with a
  specific reason.
- **No live payment credentials, delivery-provider API keys, or POS
  credentials in this environment** — Stripe's real adapter, and every
  stub provider, is exercised only against mocks in the test suite; a
  live authorize → capture → webhook round trip has not been run.
- **The customer-facing ordering frontend is a separate Next.js surface
  from the AI-generated static marketing site** (Sprint 06's renderer),
  not embedded into the statically-rendered Menu page — the static
  renderer produces SEO-optimized HTML, not an interactive ordering SPA;
  wiring the generated site's "Order Now" CTA to link out to
  `/order/:restaurantId` was not done in this sprint.
- **Owner-facing controller test coverage is uneven by design** — the
  highest-stakes sequential modules (cart, checkout, orders) all have both
  service- and controller-level tests; most remaining commerce controllers
  are thin `requireOwnRestaurantId → service call → instanceof error
  mapping` wrappers whose correctness is already proven by five other
  controller test files exercising the identical pattern, so dedicated
  controller tests were not duplicated for every module.
- **Loyalty and gift cards are schema-only**, exactly as specified —
  `GiftCard`/`GiftCardTransaction`/`LoyaltyProgram`/`LoyaltyAccount`/
  `LoyaltyTransaction` exist and pass migration/validation, with zero UI
  surfaces or checkout steps referencing them.
- **DoorDash, Uber Eats, and Grubhub import sources are unaffected** —
  still stubs, still `501`, untouched this sprint.

## Verification Results

- `pnpm install`, `pnpm --filter api exec prisma generate`, and
  `pnpm --filter api exec prisma validate` all pass.
- `pnpm run lint` and `pnpm run typecheck` pass cleanly at the repo root
  across both `apps/api` and `apps/web`.
- `pnpm run test` — **663/663 tests passing** across 108 files in
  `apps/api` (payments orchestration/failover, webhook signature
  verification and dedup, Smart Routing Engine across all documented
  branches, delivery/service fee resolution across flat/per-mile/
  percentage types, kitchen capacity pause thresholds, cart/checkout/
  order-lifecycle tenant isolation and state-machine enforcement, refund
  full/partial handling, QR token resolution, POS/payment/fulfillment
  adapter-registry conformance).
- `pnpm run build` — both `apps/api` (`tsc`) and `apps/web` (`next build`,
  Turbopack, 28 routes) compile successfully.
- Not verified in this environment (requires live Postgres, real payment/
  delivery/POS provider credentials, and a browser): an end-to-end guest
  checkout → payment capture → kitchen → driver → delivery round trip
  against a running server.

# Release Notes — Sprint 10: Universal Import Engine

## Sprint 10 Summary

Sprint 10 broadens the Import Engine built in Sprints 04–05 (PDF, Image,
Website, Google Maps) into a genuinely universal restaurant-migration
tool, while deliberately keeping DoorDash/Uber Eats/Grubhub as stubs —
scraping those platforms' consumer sites carries real Terms-of-Service
risk with no official partner API, and that trade-off wasn't reopened
this sprint. Everything added here is either the owner's own first-party
data (CSV/spreadsheet upload) or an extension of sources that already had
explicit permission to be fetched (Website, Google Maps).

## Features Completed

- **CSV/spreadsheet import** (`CSV` source, real, `apps/api/src/modules/
  imports/adapters/csv.adapter.ts`): parses a `.csv`/`.xlsx` file (via
  `xlsx`) with a header-alias column mapper
  (`adapters/spreadsheet/column-mapper.ts`) that recognizes plain
  spreadsheet exports as well as common Square/Toast/Clover menu-export
  header conventions — no manual "which POS" selection, no AI call, no
  network access. A row with a missing/unparseable price is still
  imported (priced at 0) but flagged with a low confidence score rather
  than silently dropped.
- **Per-item confidence scores**: `ExtractedMenuData` items now carry an
  optional `confidence` (0–1); the CSV adapter sets it deterministically,
  and the review screen renders a green/yellow/red badge per item.
- **Website menu-link crawl + social-link discovery**
  (`adapters/website/find-menu-link.ts`,
  `adapters/website/find-social-links.ts`): the Website adapter now
  follows exactly one bounded extra hop to a discovered "Menu" nav link
  (not general recursive crawling) and surfaces any on-page social-media
  links into `businessProfile.socialLinks` — free to compute since the
  page's HTML is already fetched and parsed for menu extraction. The
  adapter's core is now exported as `extractWebsiteData()`, reused
  directly by the Google Maps adapter (see below).
- **Richer Google Maps import**: the Places API field mask now requests
  `websiteUri`/`regularOpeningHours`; the listing's first photo is
  persisted (via the existing `fileStorage`/`assetUrl` pattern) as a
  `businessProfile.logoUrl` instead of being run through menu extraction;
  and when the listing has a website, the adapter automatically calls
  `extractWebsiteData()` on it and merges the result — surfacing menu
  items, additional social links, and richer profile data from the same
  single Google Maps URL a user pastes in.
- **Import job rerun**: `POST /api/imports/:id/rerun` re-reads a job's
  already-stored file (or reuses its `sourceUrl`) and re-enqueues
  extraction — lets an owner retry a `FAILED` job, or simply refresh a
  Website/Google Maps import against a source that's changed, without
  re-uploading or re-pasting anything. Requires a new `sourceMimeType`
  column on `ImportJob` (persisted at creation time) so a re-read file
  buffer still carries the MIME type adapters like `ImageImportAdapter`
  validate against.
- **Bulk-edit review screen** (`apps/web/.../import/[id]/review-editor.tsx`):
  reviewers can now inline-edit an item's name/price, multi-select items
  via checkboxes, bulk-move the selection to a different category, and
  bulk-delete bad rows — all client-side, persisted via a new
  `PATCH /api/imports/:id` endpoint before Approve commits the edited
  data into the live menu. The businessProfile preview (name/address/
  phone/website/hours/logo/social links) is now shown above the
  categories so a reviewer sees everything a single Approve click will
  apply, not just the menu items.
- **Import history rerun button**: the import list page can now rerun a
  `FAILED`, `APPROVED`, or `REJECTED` job directly from the history list.

## Architecture Decisions

- **One shared CSV/XLSX adapter, not one per POS.** A single alias-based
  column mapper recognizes multiple POS export conventions automatically;
  adding a new POS's header spelling is a one-line addition to an alias
  list, not a new adapter file — matching the registry's "adding a source
  is one file" design without multiplying near-duplicate adapters.
- **Menu-link crawl is capped at exactly one extra hop**, not general
  crawling — the same cost/complexity trade-off Sprint 05 made explicit
  for image processing, now applied to page-following.
- **Social-link discovery has zero extra network cost** — it reads the
  same fetched HTML the adapter already parses for text/image extraction.
- **`extractWebsiteData()` is the single reuse point** between the
  Website and Google Maps adapters, so a discovered listing website gets
  identical treatment (text/image extraction, menu-link crawl, social
  links) to a directly-submitted Website import — one code path, two
  callers, per the merge-function precedent set in Sprint 05.
- **Bulk edits persist through the existing `extractedData` column** via
  a new `PATCH`, re-validated with the same `extractedMenuDataSchema`
  Approve already uses — no parallel "draft" storage was introduced.

## Known Limitations

- **DoorDash, Uber Eats, and Grubhub remain untouched stubs** — still
  `501`, by deliberate scope decision this sprint (ToS risk, no partner
  API), not an oversight.
- **CSV price parsing assumes a dollar-amount cell** (`"12.99"`,
  `"$12.99"`) — a spreadsheet that stores prices as raw cents would be
  misparsed; documented in `column-mapper.ts`, not auto-detected.
- **Google Maps' "logo" is a best-effort stand-in** — Places API has no
  dedicated logo field; the listing's first photo is used, which may be
  a food photo or storefront shot rather than an actual logo.
- **The website menu-link crawl only looks for one link candidate on the
  original page** — a menu buried two clicks deep, or linked only from a
  page the crawl didn't follow, still won't be found.
- **No live Anthropic/Google Maps API key exercised in this environment**
  for the AI-dependent sources (Website text/image extraction, Google
  Maps) — the CSV adapter has no such dependency and was verified fully
  end-to-end (upload → parse → review → bulk-edit → approve → live menu)
  against a real local Postgres instance in this sandbox.

## Verification Results

- `pnpm run lint`, `pnpm run typecheck`, and `pnpm run build` all pass at
  the repo root across `apps/api` and `apps/web`.
- `pnpm run test` — all suites pass except one pre-existing, unrelated
  flake (`app.test.ts`'s X-Request-Id integration test, which times out
  only under full-suite parallel load and passes cleanly in isolation;
  confirmed not a regression from this sprint's changes).
- `pnpm --filter api exec prisma validate` passes; the new migration
  (`sprint10_import_csv_source`) was applied against a real local
  Postgres instance started in this sandbox.
- **Full live smoke test against a running API + Postgres + web dev
  server**: registered an owner, created a restaurant, uploaded a real
  CSV file end-to-end through `POST /api/imports`, confirmed the
  extracted categories/items/confidence scores, edited the data via
  `PATCH`, approved it and confirmed the edited (not original) items
  landed in the live menu via `GET /api/menu/categories`, and exercised
  `POST /api/imports/:id/rerun` to confirm it re-extracts from the
  original stored file. The rendered `/dashboard/import` and
  `/dashboard/import/:id` pages were fetched with an authenticated
  session and inspected directly, confirming the CSV source option, the
  confidence badges, and the bulk-edit controls all render as designed.
