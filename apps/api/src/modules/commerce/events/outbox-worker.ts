import type { OutboxEvent } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { commerceEventBus } from "./event-bus";

const BATCH_SIZE = 50;

/**
 * Drains a batch of unprocessed OutboxEvent rows, dispatching each to the
 * in-process commerceEventBus and marking it processedAt on success (Sprint
 * 07.7 H-11). This is the durable path in front of the bus's own
 * process-local EventEmitter — it changes how reliably an event reaches the
 * bus, not the bus's own public interface.
 *
 * Delivery is at-least-once, not exactly-once: a crash between dispatch and
 * marking processedAt would redeliver on the next poll. Any real subscriber
 * built on top of this must be idempotent, consistent with this codebase's
 * existing idempotency-key discipline elsewhere. This is also a
 * single-instance-only design — no multi-instance claim coordination (e.g.
 * SELECT ... FOR UPDATE SKIP LOCKED) — matching the current single-process
 * deployment model; revisit before horizontal scaling.
 */
export async function processOutboxBatch(): Promise<{ processedCount: number }> {
  const rows = await prisma.outboxEvent.findMany({
    where: { processedAt: null },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
  });

  let processedCount = 0;
  for (const row of rows) {
    if (await dispatchOne(row)) {
      processedCount++;
    }
  }
  return { processedCount };
}

async function dispatchOne(row: OutboxEvent): Promise<boolean> {
  try {
    commerceEventBus.emit({
      type: row.type,
      restaurantId: row.restaurantId,
      orderId: row.orderId ?? undefined,
      payload: row.payload as Record<string, unknown> | undefined,
    });
    await prisma.outboxEvent.update({ where: { id: row.id }, data: { processedAt: new Date() } });
    return true;
  } catch (err) {
    // Left unprocessed — picked up again on the next poll (at-least-once).
    console.error("outbox-worker: failed to dispatch event", row.id, err);
    return false;
  }
}
