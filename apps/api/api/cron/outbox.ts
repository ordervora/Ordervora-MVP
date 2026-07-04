import type { IncomingMessage, ServerResponse } from "node:http";
import { getOptionalEnv } from "../../src/config/env";
import { errorTracker } from "../../src/lib/error-tracker";
import { createLogger } from "../../src/lib/logger";
import { backgroundJobBatchSize, backgroundJobDurationSeconds } from "../../src/lib/metrics";
import { recordWorkerFailure, recordWorkerSuccess } from "../../src/lib/worker-health";
import { processOutboxBatch } from "../../src/modules/commerce/events/outbox-worker";

const JOB_NAME = "outbox_worker";
const logger = createLogger("outbox-cron");

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

/**
 * Vercel Cron replacement for the Docker/Render deployment's in-process
 * `startOutboxWorker()` setInterval (see
 * ../../src/modules/commerce/events/outbox-scheduler.ts, still used by
 * src/index.ts on that path). Runs exactly one pass of the same
 * `processOutboxBatch()` the interval version calls — no draining logic
 * is duplicated, only the "what calls this on a schedule" mechanism
 * differs between the two deployment targets.
 *
 * Authenticated the way Vercel's own Cron Jobs are documented to be
 * secured: a bearer token compared against `CRON_SECRET`, which Vercel
 * automatically attaches for its own scheduled invocations once that env
 * var is set on the project. Requires the secret to be configured at all
 * — an unset CRON_SECRET fails closed, consistent with this codebase's
 * existing "no placeholder/missing production secrets" discipline.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const cronSecret = getOptionalEnv("CRON_SECRET");
  if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
    sendJson(res, 401, { error: "Unauthorized" });
    return;
  }

  const endTimer = backgroundJobDurationSeconds.startTimer({ job: JOB_NAME });
  try {
    const { processedCount } = await processOutboxBatch();
    backgroundJobBatchSize.observe({ job: JOB_NAME }, processedCount);
    recordWorkerSuccess("outboxWorker");
    endTimer();
    sendJson(res, 200, { ok: true, processedCount });
  } catch (err) {
    logger.error({ err }, "outbox-cron: poll failed");
    errorTracker.captureException(err);
    recordWorkerFailure("outboxWorker", err);
    endTimer();
    sendJson(res, 500, { ok: false, error: "outbox poll failed" });
  }
}
