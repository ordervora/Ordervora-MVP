import { EventEmitter } from "node:events";
import type { OrderEventType } from "@prisma/client";
import type { CommerceEvent } from "./event-types";

export type CommerceEventHandler = (event: CommerceEvent) => void | Promise<void>;

const WILDCARD = "*";

/**
 * Lightweight in-process event emitter — deliberately not a message broker
 * (Redis/SQS remains a Sprint 09 scaling item). Services emit only after
 * their originating DB transaction commits; subscribers (notification
 * dispatch, timeline projection, fraud evaluation) run as fire-and-forget
 * async handlers, mirroring the exact pattern already proven by
 * revalidatePublishedSite in Sprint 06.
 *
 * IMPORTANT (Sprint 07.7 H-10): as of this writing, this bus has exactly
 * one production subscriber — the debug-log listener registered at the
 * bottom of this file, purely for observability. Every emitOrderEvent()
 * call throughout checkout.service.ts/orders.service.ts is otherwise
 * emitted into a bus with no real listeners: in-process only, no
 * durability, lost on process restart. Do not add a real subscriber here
 * (notifications, timeline projection, fraud, POS sync, loyalty, etc.)
 * without first resolving H-11 (giving emissions outbox-backed
 * durability) or making an explicit, documented decision to accept
 * single-instance/at-most-once semantics for that specific subscriber.
 */
class CommerceEventBus {
  private readonly emitter = new EventEmitter();

  constructor() {
    // Many independent subscribers (notifications, timeline, fraud, POS
    // sync, loyalty) will all listen on "*" — raise the default cap so a
    // full subscriber roster doesn't trigger Node's MaxListeners warning.
    this.emitter.setMaxListeners(50);
  }

  on(type: OrderEventType | typeof WILDCARD, handler: CommerceEventHandler): void {
    this.emitter.on(type, (event: CommerceEvent) => {
      try {
        void Promise.resolve(handler(event)).catch((err: unknown) => {
          console.error(`[commerce-events] handler for "${type}" failed`, err);
        });
      } catch (err) {
        // A handler that throws synchronously (rather than returning a
        // rejected promise) must not escape emit() and break sibling
        // handlers — caught here, not just via the Promise.resolve wrap
        // above, which only catches async rejections.
        console.error(`[commerce-events] handler for "${type}" failed`, err);
      }
    });
  }

  emit(event: CommerceEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit(WILDCARD, event);
  }
}

export const commerceEventBus = new CommerceEventBus();

/**
 * The bus's one real (if trivial) production subscriber — a debug-level
 * log line on every emitted event, so a running environment can confirm
 * the bus is actually receiving what its callers believe it is (Sprint
 * 07.7 H-10). Registered once at module load; not a stand-in for a real
 * subscriber.
 */
commerceEventBus.on(WILDCARD, (event) => {
  console.debug(`[commerce-events] ${event.type}`, { orderId: event.orderId, restaurantId: event.restaurantId });
});
