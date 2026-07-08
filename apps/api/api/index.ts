import { assertStartupEnv } from "../src/config/env";
import { createApp } from "../src/app";

/**
 * Vercel serverless entrypoint — the one file this deployment target
 * needs beyond the existing Docker/Render path. Every request Vercel
 * doesn't route to /api/cron/* (see ../vercel.json's rewrite) lands here
 * and is handed, unmodified, to the exact same Express app app.ts already
 * builds for Docker. No route, middleware, or business logic is
 * duplicated or reimplemented — Express apps are already valid
 * `(req, res) => void` handlers, which is exactly what Vercel's Node.js
 * runtime expects.
 *
 * Deliberately does NOT import src/index.ts: that file also calls
 * app.listen() and starts the two setInterval-based background workers,
 * neither of which make sense inside a single serverless invocation (see
 * api/cron/outbox.ts and api/cron/stale-offers.ts for where that work
 * moved instead).
 */
assertStartupEnv();

const app = createApp();

// Vercel terminates TLS and forwards the original client address through
// proxy headers. Trust exactly one proxy hop so Express and
// express-rate-limit derive stable client IPs without accepting arbitrary
// multi-hop forwarded chains from callers.
app.set("trust proxy", 1);

// Keep the exported handler explicit: Vercel expects a function/server from
// this serverless entrypoint, while the shared Express app remains reusable
// by the Docker and Render deployment paths.
export default app;
