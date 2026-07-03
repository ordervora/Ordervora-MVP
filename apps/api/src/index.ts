import "dotenv/config";
import { assertStartupEnv, getEnv, getSafeEnvSummary } from "./config/env";
import { createApp } from "./app";
import { prisma } from "./lib/prisma";
import { redis } from "./lib/redis";
import { startOutboxWorker } from "./modules/commerce/events/outbox-scheduler";
import { startStaleOfferScheduler } from "./modules/commerce/fulfillment/stale-offer-scheduler";

// Strict startup validation (Production Hardening Phase 3) — fails fast
// with a single aggregated error listing every missing/invalid
// environment variable at once, before app.listen() ever accepts a
// connection. (Note: since this compiles to CommonJS, the static imports
// above are hoisted ahead of this call regardless of source order — some
// of them, e.g. lib/prisma.ts, already validate core config as an import-
// time side effect. This explicit call is the authoritative, well-labeled
// check either way: getEnv() memoizes, so whichever path validates first
// produces the same result.)
assertStartupEnv();

// Safe to log: getSafeEnvSummary() reports only which keys are present,
// never their values — "no secret values can appear in logs" (Phase 3).
console.log("Environment configuration loaded:", getSafeEnvSummary());

const { PORT: port, NODE_ENV: environment } = getEnv();
const app = createApp();

const server = app.listen(port, () => {
  console.log(`API server listening on port ${port} (environment: ${environment})`);
});

const staleOfferTimer = startStaleOfferScheduler();
const outboxTimer = startOutboxWorker();

// Graceful shutdown (Production Hardening Phase 4) — required for a
// zero-downtime rolling deploy: when an orchestrator sends SIGTERM to an
// outgoing instance, stop taking new background-job work immediately, let
// server.close() drain any in-flight HTTP requests to completion (it
// stops accepting new connections but does not cut off existing ones),
// then release the database pool before exiting. A hard exit here (or no
// handler at all, Node's default for SIGTERM) would drop in-flight
// requests and leave connections in the Prisma pool dangling.
let shuttingDown = false;

function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down gracefully`);

  clearInterval(staleOfferTimer);
  clearInterval(outboxTimer);

  server.close((err) => {
    if (err) {
      console.error("Error while closing HTTP server", err);
    }
    Promise.allSettled([
      prisma.$disconnect().catch((disconnectErr) => {
        console.error("Error while disconnecting Prisma", disconnectErr);
      }),
      // Best-effort — Redis is an optional accelerator (Production
      // Hardening Phase 5), never a shutdown blocker. `redis` is `null`
      // when REDIS_URL isn't configured; `.quit()` itself can still
      // reject (e.g. already disconnected), which must not stop the rest
      // of shutdown either.
      redis?.quit().catch((quitErr) => {
        console.error("Error while disconnecting Redis", quitErr);
      }),
    ]).finally(() => {
      process.exit(err ? 1 : 0);
    });
  });

  // Belt-and-suspenders: if a slow/leaked connection prevents
  // server.close()'s callback from ever firing, force-exit rather than
  // hanging forever and blocking the orchestrator's rollout.
  setTimeout(() => {
    console.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
