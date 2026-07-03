# Deploying OrderVora — Supabase + Render + Vercel (no credit card, iPhone-only)

## Why this exact combination

Two things blocked every earlier attempt, confirmed directly (not guessed):

1. **This GitHub repo's actual default branch is `claude/sprint-01-verify-4aop3o`**
   — the very first sprint's initial scaffold, before Docker, Prisma, or any
   commerce feature existed. Any platform that connects to "the repo"
   without an explicit branch override reads that branch — which has no
   `render.yaml` at all. This is why Render reported the file missing even
   after a Blueprint was created.
2. **Render will not finish provisioning any paid resource without a
   payment method on file.** The original `render.yaml` requested a paid
   Postgres database plan and a paid "starter" plan for both services —
   Render's Blueprint apply correctly detected that and stopped to ask for
   billing information. That's Render's account-level policy, not a bug in
   the file, and not something any YAML can code around.

Given both of those, and the constraints (iPhone only, least manual setup,
no card): the fix isn't "try harder on Render alone" — it's to split the
three pieces (database / API / web) across three services that each have a
genuine, permanent free tier with **no credit card required at all**:

| Piece | Platform | Why |
|---|---|---|
| Postgres database | **Supabase** | Free tier is a real, permanently-free hosted Postgres — no card, no trial expiry. |
| API (`apps/api`) | **Render**, free plan | Needs to run continuously (background workers: outbox drain, driver-offer expiry) — can't be serverless. Render's free Docker web service needs no card. Trade-off: spins down after 15 minutes idle, ~30-60s cold start on the next request — real, and worth knowing, but free and reliable. |
| Web app (`apps/web`) | **Vercel** | Purpose-built for Next.js, genuinely free Hobby tier, no card, deploys straight from GitHub with continuous auto-deploy on every push. |

This is also the one combination from your own list (Railway, Render,
Fly.io, Coolify, DigitalOcean, Vercel+API) that avoids a card everywhere:
Railway and Fly.io both require a card once trial credit runs out,
DigitalOcean App Platform has no perpetual free web service tier, and
Coolify is self-hosted (you'd need to rent and manage your own server).

## What's already done for you

- A dedicated Postgres database is live and ready: Supabase project
  **OrderVora-SaaS** (already existed in your account, empty, healthy). I
  created one new, scoped database role for the app to use (not the
  project's own admin role) with exactly the privileges Prisma's
  migrations need — nothing more. If you'd rather I use a different
  Supabase project or undo this, tell me and I will.
- `render.yaml` now requests **only** free-tier resources — no database,
  no paid plan — so the payment-method wall cannot happen again.
- `apps/web/next.config.ts` now skips the Docker-only `standalone` build
  output when building on Vercel (Vercel sets its own `VERCEL` variable
  during builds), which otherwise has a history of build/tracing issues on
  Vercel for monorepos like this one.
- Everything above is committed and pushed to
  `claude/sprint-07-commerce-engine`.

## Step 1 — Deploy the API to Render (~5 minutes)

1. dashboard.render.com → **New** → **Blueprint**.
2. Select this repository, and — this is the step that failed silently
   before — **explicitly pick the branch `claude/sprint-07-commerce-engine`**
   from the branch dropdown. Do not leave it on whatever it shows first.
3. Render reads `render.yaml` and shows one free web service,
   `ordervora-api`. Tap **Apply**. Because everything in the file is free,
   Render should not ask for a payment method this time.
4. Render will prompt for the three values marked `sync: false`:
   `DATABASE_URL`, `FRONTEND_URL`, `COMMERCE_ENCRYPTION_KEY`. These are
   real secrets, so they're deliberately **not written in this file** (it
   lives in a public repo) — use the exact values given to you directly in
   chat when this runbook was written/updated.

   (`FRONTEND_URL` is a forward reference to step 2 below — use exactly
   `https://ordervora-web.vercel.app` if you name the Vercel project
   `ordervora-web` as instructed there. If Vercel ends up assigning a
   different URL, come back and update this one value — Render redeploys
   automatically when you save an env var change.)
5. Wait for the build to finish. Open the service page and note the
   **exact URL** Render assigned (top of the page, looks like
   `https://ordervora-api.onrender.com` — it may differ if that name was
   taken). You'll need this exact value in step 2.
6. Confirm it's healthy: open `<that-url>/health` in Safari — it should
   return a JSON response, not an error.

## Step 2 — Deploy the web app to Vercel (~3 minutes)

1. vercel.com (works fine in Safari) → **Add New** → **Project**.
2. Import this same GitHub repository.
3. Before deploying, tap **Edit** next to Root Directory and set it to
   `apps/web`. Vercel auto-detects Next.js once you do.
4. Under **Environment Variables**, add:
   ```
   API_URL = <the exact URL Render showed you in step 1.5>
   ```
5. Name the project `ordervora-web` (so its URL matches what you already
   pasted into `FRONTEND_URL` in step 1) and tap **Deploy**.
6. When it finishes, open the assigned `https://ordervora-web.vercel.app`
   URL — this is your working app.

If the Vercel URL Vercel actually assigns doesn't match
`ordervora-web.vercel.app` (name already taken by someone else), go back to
Render's `ordervora-api` service → Environment → update `FRONTEND_URL` to
the real URL and save (Render redeploys automatically, no rebuild needed
by hand).

## One-time follow-up (optional, not required to have a working app)

The historical order-volume demo data (`seed:beta:orders`,
`seed:beta:delivery-order`) drives the real checkout API over HTTP, so it
needs the API already live — it can't run during Render's pre-deploy step.
From Render's **Shell** tab on `ordervora-api` (works from Safari):
```sh
BASE_URL=http://localhost:4000 node dist/scripts/seed-beta-orders.js
BASE_URL=http://localhost:4000 node dist/scripts/demo-place-delivery-order.js
```

## Demo accounts

Same as the Sprint 08 guide (`docs/reports/Sprint08/BETA_DEMO_GUIDE.md`) —
all share password `OrdervoraDemo!23` once the structural seed has run
automatically during Render's first deploy.

## Notes / honest trade-offs

- **Render's free plan spins down after 15 minutes of inactivity.** The
  first request after that takes 30-60 seconds while it wakes up. This is
  Render's free-tier trade-off, not a bug. If that's ever a problem,
  upgrading the `ordervora-api` service to a paid plan later is a plan
  change in Render's dashboard — no code or architecture change needed.
- **Object storage (image uploads) is not configured** — falls back to
  local disk, which doesn't persist across Render restarts on the free
  plan. Not required for the app to work; add S3-compatible credentials
  later if you need uploads to survive redeploys.
- **Stripe is bring-your-own-provider** — no global demo key; cash payment
  works immediately with no setup.
