import { expireStaleOffers } from "./fulfillment.service";

const SWEEP_INTERVAL_MS = Number(process.env.DRIVER_OFFER_SWEEP_INTERVAL_MS ?? 60_000);

/**
 * Process-local interval sweep for stale driver offers (Sprint 07.6 C-11).
 * Sufficient for this codebase's current single-process deployment model —
 * see the C-11 remediation note on revisiting this alongside the event
 * bus's own single-instance limitation if horizontal scaling is introduced.
 * Call once at process startup (index.ts); never import this from app.ts,
 * so tests that build the Express app don't also start a background timer.
 */
export function startStaleOfferScheduler(): NodeJS.Timeout {
  return setInterval(() => {
    expireStaleOffers().catch((err) => {
      console.error("stale-offer-scheduler: sweep failed", err);
    });
  }, SWEEP_INTERVAL_MS);
}
