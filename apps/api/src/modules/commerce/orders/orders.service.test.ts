import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    order: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    orderEvent: { findMany: vi.fn(), create: vi.fn() },
    orderTimeline: { findMany: vi.fn(), create: vi.fn() },
    transaction: { create: vi.fn() },
    customer: { findUnique: vi.fn() },
    guestCustomer: { findUnique: vi.fn() },
  },
}));

vi.mock("../events/record-order-event", () => ({
  emitOrderEvent: vi.fn(),
  writeOrderEvent: vi.fn(),
}));

const mockRefundOrderPayment = vi.fn();
vi.mock("../payments/orchestrator", () => ({
  refundOrderPayment: (...args: unknown[]) => mockRefundOrderPayment(...args),
}));

vi.mock("../notifications/notifications.service", () => ({
  sendOrderReadyNotification: vi.fn(),
  sendOrderOutForDeliveryNotification: vi.fn(),
  sendOrderDeliveredNotification: vi.fn(),
  sendRefundIssuedNotification: vi.fn(),
}));

import { prisma } from "../../../lib/prisma";
import { InvalidOrderTransitionError } from "./order-state-machine";
import { OrderNotFoundError } from "./orders.errors";
import { cancelOrder, completeOrder, getOwnOrder, markPaidCash, refundOrder, startPreparing } from "./orders.service";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

function order(overrides: Record<string, unknown> = {}) {
  return {
    id: "order-1",
    restaurantId: "r1",
    orderNumber: 1,
    status: "CONFIRMED",
    paymentStatus: "PAID",
    totalCents: 1000,
    customerId: null,
    guestCustomerId: null,
    payment: { id: "pay-1" },
    ...overrides,
  } as never;
}

describe("tenant isolation", () => {
  it("rejects fetching an order belonging to another restaurant", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order({ restaurantId: "other" }));
    await expect(getOwnOrder("my-restaurant", "order-1")).rejects.toBeInstanceOf(OrderNotFoundError);
  });
});

describe("state transitions", () => {
  it("startPreparing transitions CONFIRMED -> PREPARING", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order({ status: "CONFIRMED" }));
    mockPrisma.order.update.mockResolvedValue(order({ status: "PREPARING" }));

    const result = await startPreparing("r1", "order-1");

    expect(result.status).toBe("PREPARING");
    expect(mockPrisma.orderTimeline.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ milestone: "PREPARING" }) }),
    );
  });

  it("rejects an illegal transition (e.g. completing a CONFIRMED order directly)", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order({ status: "CONFIRMED" }));
    await expect(completeOrder("r1", "order-1")).rejects.toBeInstanceOf(InvalidOrderTransitionError);
    expect(mockPrisma.order.update).not.toHaveBeenCalled();
  });

  it("cancelOrder does not touch Payment/Transaction — cancellation never auto-refunds", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order({ status: "CONFIRMED" }));
    mockPrisma.order.update.mockResolvedValue(order({ status: "CANCELLED" }));

    await cancelOrder("r1", "order-1", { reason: "customer changed mind" });

    expect(mockRefundOrderPayment).not.toHaveBeenCalled();
    expect(mockPrisma.transaction.create).not.toHaveBeenCalled();
  });
});

describe("markPaidCash", () => {
  it("marks paymentStatus PAID and writes a CHARGE Transaction with no provider involved", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order({ paymentStatus: "UNPAID", totalCents: 1500 }));
    mockPrisma.order.update.mockResolvedValue(order({ paymentStatus: "PAID" }));

    await markPaidCash("r1", "order-1");

    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ type: "CHARGE", amountCents: 1500 }) }),
    );
    expect(mockRefundOrderPayment).not.toHaveBeenCalled();
  });
});

describe("refundOrder", () => {
  it("throws when the order has no captured payment", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order({ payment: null }));
    await expect(
      refundOrder("r1", "order-1", { amountCents: 500, reason: "CUSTOMER_REQUEST" }),
    ).rejects.toThrow();
  });

  it("transitions the order to REFUNDED on a full refund", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order({ status: "CONFIRMED", totalCents: 1000 }));
    mockRefundOrderPayment.mockResolvedValue({ id: "refund-1" });
    mockPrisma.order.update.mockResolvedValue(order({ status: "REFUNDED" }));

    const result = await refundOrder("r1", "order-1", { amountCents: 1000, reason: "CUSTOMER_REQUEST" });

    expect(mockRefundOrderPayment).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay-1", amountCents: 1000 }),
    );
    expect(result.status).toBe("REFUNDED");
  });

  it("keeps the order's status unchanged on a partial refund, only updating paymentStatus", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(order({ status: "CONFIRMED", totalCents: 1000 }));
    mockRefundOrderPayment.mockResolvedValue({ id: "refund-1" });
    mockPrisma.order.update.mockResolvedValue(order({ status: "CONFIRMED", paymentStatus: "PARTIALLY_REFUNDED" }));

    const result = await refundOrder("r1", "order-1", { amountCents: 300, reason: "ITEM_UNAVAILABLE" });

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ paymentStatus: "PARTIALLY_REFUNDED" }) }),
    );
    expect(result.status).toBe("CONFIRMED");
  });
});
