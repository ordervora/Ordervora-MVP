# Production Deployment Policy

## Main-only production

`main` is the only branch authorized to represent OrderVora production.

Branches such as `claude/*`, `feature/*`, `fix/*`, and pull-request heads are Preview environments only.

## Required release evidence

Before reporting a change as live, record:

- GitHub merge commit SHA on `main`
- Vercel production deployment ID
- Vercel production deployment commit SHA
- Render backend deployment commit SHA
- migration status
- production smoke-test result

The GitHub SHA and Vercel production SHA must match for frontend changes.

## Release sequence

1. Implement on a non-production branch.
2. Run typecheck, lint, tests, and production build.
3. Open a pull request into `main`.
4. Review changed files and migrations.
5. Merge into `main`.
6. Confirm Vercel deployment target is `production` and source ref is `main`.
7. Confirm production aliases were assigned successfully.
8. Confirm the Render API and production database are compatible.
9. Run the real production smoke test.

## Minimum production smoke test

- Login page loads.
- Owner can sign in.
- `/dashboard` loads.
- `/dashboard/website` loads without runtime exceptions.
- `/api/restaurants/me` reaches the live Render API.
- The public menu endpoint returns the correct restaurant.
- No request is sent to localhost, Supabase, or a Preview API.

## Failure rule

If any check fails, the release remains incomplete even when Vercel shows `READY` or automated tests pass.
