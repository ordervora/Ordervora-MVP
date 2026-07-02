import { processOutboxBatch } from "./outbox-worker";

const POLL_INTERVAL_MS = Number(process.env.OUTBOX_POLL_INTERVAL_MS ?? 5_000);

/**
 * Process-local interval poll draining the OutboxEvent table (Sprint 07.7
 * H-11) — mirrors C-11's stale-offer-scheduler.ts pattern. Sufficient for
 * this codebase's current single-process deployment model; see the H-11
 * remediation note on multi-instance claim coordination once horizontal
 * scaling is introduced. Call once at process startup (index.ts); never
 * import this from app.ts, so tests that build the Express app don't also
 * start a background timer.
 */
export function startOutboxWorker(): NodeJS.Timeout {
  return setInterval(() => {
    processOutboxBatch().catch((err) => {
      console.error("outbox-scheduler: poll failed", err);
    });
  }, POLL_INTERVAL_MS);
}
