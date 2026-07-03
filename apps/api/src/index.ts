import "dotenv/config";
import { assertStartupEnv, getEnv, getSafeEnvSummary } from "./config/env";
import { createApp } from "./app";
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

app.listen(port, () => {
  console.log(`API server listening on port ${port} (environment: ${environment})`);
});

startStaleOfferScheduler();
startOutboxWorker();
