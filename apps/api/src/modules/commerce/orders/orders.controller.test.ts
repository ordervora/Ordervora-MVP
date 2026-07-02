import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../restaurants/restaurant.service", () => ({
  getOwnRestaurantId: vi.fn(),
}));

vi.mock("./orders.service", () => ({
  listOrders: vi.fn(),
  getOwnOrder: vi.fn(),
  getOrderEvents: vi.fn(),
  getOrderTimeline: vi.fn(),
  startPreparing: vi.fn(),
  markReady: vi.fn(),
  markOutForDelivery: vi.fn(),
  completeOrder: vi.fn(),
  markPaidCash: vi.fn(),
  cancelOrder: vi.fn(),
  refundOrder: vi.fn(),
}));

vi.mock("../../../lib/prisma", () => ({
  prisma: { order: { findUnique: vi.fn() } },
}));

import type { Request, Response } from "express";
import { prisma } from "../../../lib/prisma";
import { getOwnRestaurantId } from "../../restaurants/restaurant.service";
import {
  cancelHandler,
  completeHandler,
  getOrderHandler,
  publicGetOrderHandler,
  publicGetOrderTimelineHandler,
  refundHandler,
  startPreparingHandler,
} from "./orders.controller";
import { InvalidOrderTransitionError } from "./order-state-machine";
import { OrderNotFoundError } from "./orders.errors";
import { completeOrder, getOrderTimeline, getOwnOrder, refundOrder, startPreparing } from "./orders.service";

function mockRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tenant isolation", () => {
  it("returns 404 (not the order) when the caller has no restaurant of their own", async () => {
    vi.mocked(getOwnRestaurantId).mockResolvedValue(null);

    const req = { user: { id: "u1" }, params: { id: "order-1" } } as unknown as Request;
    const res = mockRes();

    await getOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(getOwnOrder).not.toHaveBeenCalled();
  });

  it("maps OrderNotFoundError (cross-tenant access) to 404", async () => {
    vi.mocked(getOwnRestaurantId).mockResolvedValue("r1");
    vi.mocked(getOwnOrder).mockRejectedValue(new OrderNotFoundError());

    const req = { user: { id: "u1" }, params: { id: "order-1" } } as unknown as Request;
    const res = mockRes();

    await getOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("state-machine transition errors", () => {
  it("maps InvalidOrderTransitionError to 409 on a simple transition handler", async () => {
    vi.mocked(getOwnRestaurantId).mockResolvedValue("r1");
    vi.mocked(startPreparing).mockRejectedValue(
      new InvalidOrderTransitionError("PREPARING", "PREPARING"),
    );

    const req = { user: { id: "u1" }, params: { id: "order-1" } } as unknown as Request;
    const res = mockRes();

    await startPreparingHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("maps InvalidOrderTransitionError to 409 on completeHandler", async () => {
    vi.mocked(getOwnRestaurantId).mockResolvedValue("r1");
    vi.mocked(completeOrder).mockRejectedValue(
      new InvalidOrderTransitionError("CONFIRMED", "COMPLETED"),
    );

    const req = { user: { id: "u1" }, params: { id: "order-1" } } as unknown as Request;
    const res = mockRes();

    await completeHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("maps InvalidOrderTransitionError to 409 on refundHandler", async () => {
    vi.mocked(getOwnRestaurantId).mockResolvedValue("r1");
    vi.mocked(refundOrder).mockRejectedValue(
      new InvalidOrderTransitionError("CANCELLED", "REFUNDED"),
    );

    const req = {
      user: { id: "u1" },
      params: { id: "order-1" },
      body: { amountCents: 500, reason: "CUSTOMER_REQUEST" },
    } as unknown as Request;
    const res = mockRes();

    await refundHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
  });

  it("cancelHandler returns 400 on invalid input", async () => {
    vi.mocked(getOwnRestaurantId).mockResolvedValue("r1");

    const req = { user: { id: "u1" }, params: { id: "order-1" }, body: { reason: 12345 } } as unknown as Request;
    const res = mockRes();

    await cancelHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});

describe("public order tracking", () => {
  it("publicGetOrderHandler returns the order with no auth required", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue({ id: "order-1", items: [] } as never);

    const req = { params: { id: "order-1" } } as unknown as Request;
    const res = mockRes();

    await publicGetOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ order: { id: "order-1", items: [] } });
  });

  it("publicGetOrderHandler returns 404 for an unknown order id", async () => {
    vi.mocked(prisma.order.findUnique).mockResolvedValue(null);

    const req = { params: { id: "nonexistent" } } as unknown as Request;
    const res = mockRes();

    await publicGetOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("publicGetOrderTimelineHandler returns the curated milestone list", async () => {
    vi.mocked(getOrderTimeline).mockResolvedValue([{ id: "t1", milestone: "PREPARING" }] as never);

    const req = { params: { id: "order-1" } } as unknown as Request;
    const res = mockRes();

    await publicGetOrderTimelineHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ timeline: [{ id: "t1", milestone: "PREPARING" }] });
  });

  it("publicGetOrderTimelineHandler returns 404 for an unknown order id", async () => {
    vi.mocked(getOrderTimeline).mockRejectedValue(new OrderNotFoundError());

    const req = { params: { id: "nonexistent" } } as unknown as Request;
    const res = mockRes();

    await publicGetOrderTimelineHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});
