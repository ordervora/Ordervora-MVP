import type { IncomingMessage, ServerResponse } from "node:http";
import { getOptionalEnv } from "../../src/config/env";
import { errorTracker } from "../../src/lib/error-tracker";
import { createLogger } from "../../src/lib/logger";
import { backgroundJobBatchSize, backgroundJobDurationSeconds } from "../../src/lib/metrics";
import { recordWorkerFailure, recordWorkerSuccess } from "../../src/lib/worker-health";
import { expireStaleOffers } from "../../src/modules/commerce/fulfillment/fulfillment.service";

const JOB_NAME = "stale_offer_sweep";
const logger = createLogger("stale-offers-cron");

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/**
 * Vercel Cron replacement for the Docker/Render deployment's in-process
 * `startStaleOfferScheduler()` setInterval (see
 * ../../src/modules/commerce/fulfillment/stale-offer-scheduler.ts, still
 * used by src/index.ts on that path) — same `expireStaleOffers()` sweep,
 * same auth pattern as outbox.ts.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const cronSecret = getOptionalEnv("CRON_SECRET");
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  const endTimer = backgroundJobDurationSeconds.startTimer({ job: JOB_NAME });
  try {
    const { expiredCount } = await expireStaleOffers();
    backgroundJobBatchSize.observe({ job: JOB_NAME }, expiredCount);
    recordWorkerSuccess("staleOfferSweep");
    endTimer();
    sendJson(res, 200, { ok: true, expiredCount });
  } catch (err) {
    logger.error({ err }, "stale-offers-cron: sweep failed");
    errorTracker.captureException(err);
    recordWorkerFailure("staleOfferSweep", err);
    endTimer();
    sendJson(res, 500, { ok: false, error: "stale offer sweep failed" });
  }
}
