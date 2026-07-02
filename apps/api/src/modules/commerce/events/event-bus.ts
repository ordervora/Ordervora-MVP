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
      void Promise.resolve(handler(event)).catch((err: unknown) => {
        console.error(`[commerce-events] handler for "${type}" failed`, err);
      });
    });
  }

  emit(event: CommerceEvent): void {
    this.emitter.emit(event.type, event);
    this.emitter.emit(WILDCARD, event);
  }
}

export const commerceEventBus = new CommerceEventBus();
