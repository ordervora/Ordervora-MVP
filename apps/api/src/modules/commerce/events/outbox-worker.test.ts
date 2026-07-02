import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    outboxEvent: { findMany: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("./event-bus", () => ({
  commerceEventBus: { emit: vi.fn() },
}));

import { prisma } from "../../../lib/prisma";
import { commerceEventBus } from "./event-bus";
import { processOutboxBatch } from "./outbox-worker";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: "outbox-1",
    type: "ORDER_CREATED",
    restaurantId: "r1",
    orderId: "o1",
    payload: null,
    createdAt: new Date(),
    processedAt: null,
    ...overrides,
  } as never;
}

describe("processOutboxBatch (Sprint 07.7 H-11)", () => {
  it("dispatches unprocessed rows to commerceEventBus.emit and marks them processedAt", async () => {
    mockPrisma.outboxEvent.findMany.mockResolvedValue([row()]);

    const result = await processOutboxBatch();

    expect(commerceEventBus.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: "ORDER_CREATED", restaurantId: "r1", orderId: "o1" }),
    );
    expect(mockPrisma.outboxEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "outbox-1" }, data: expect.objectContaining({ processedAt: expect.any(Date) }) }),
    );
    expect(result.processedCount).toBe(1);
  });

  it("only selects rows where processedAt is null, ordered oldest first", async () => {
    mockPrisma.outboxEvent.findMany.mockResolvedValue([]);

    await processOutboxBatch();

    expect(mockPrisma.outboxEvent.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { processedAt: null }, orderBy: { createdAt: "asc" } }),
    );
  });

  it("processes multiple rows in the order returned by the query", async () => {
    mockPrisma.outboxEvent.findMany.mockResolvedValue([row({ id: "outbox-1" }), row({ id: "outbox-2" })]);

    await processOutboxBatch();

    expect(mockPrisma.outboxEvent.update).toHaveBeenNthCalledWith(1, expect.objectContaining({ where: { id: "outbox-1" } }));
    expect(mockPrisma.outboxEvent.update).toHaveBeenNthCalledWith(2, expect.objectContaining({ where: { id: "outbox-2" } }));
  });

  it("leaves a row unprocessed for retry when dispatch throws, rather than marking it processed", async () => {
    mockPrisma.outboxEvent.findMany.mockResolvedValue([row()]);
    vi.mocked(commerceEventBus.emit).mockImplementationOnce(() => {
      throw new Error("subscriber exploded");
    });

    const result = await processOutboxBatch();

    expect(mockPrisma.outboxEvent.update).not.toHaveBeenCalled();
    expect(result.processedCount).toBe(0);
  });

  it("does not reprocess rows already marked processed (never fetched, since the query excludes them)", async () => {
    mockPrisma.outboxEvent.findMany.mockResolvedValue([]);

    const result = await processOutboxBatch();

    expect(commerceEventBus.emit).not.toHaveBeenCalled();
    expect(result.processedCount).toBe(0);
  });
});
