import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/idempotency", () => ({
  reserveIdempotencyKey: vi.fn(),
  completeIdempotencyKey: vi.fn(),
  failIdempotencyKey: vi.fn(),
}));

vi.mock("./checkout.service", () => ({
  placeOrder: vi.fn(),
}));

vi.mock("./quote.service", () => ({
  computeCheckoutQuote: vi.fn(),
}));

vi.mock("../cart/cart.service", () => ({
  getCartWithItems: vi.fn(),
}));

import type { Request, Response } from "express";
import { completeIdempotencyKey, failIdempotencyKey, reserveIdempotencyKey } from "../../../lib/idempotency";
import { getCartWithItems } from "../cart/cart.service";
import { CartNotFoundError } from "../cart/cart.errors";
import { getQuoteHandler, placeOrderHandler } from "./checkout.controller";
import { CheckoutIneligibleError, EmptyCartError, PaymentFailedError, PriceDriftError } from "./checkout.errors";
import { placeOrder } from "./checkout.service";
import { computeCheckoutQuote } from "./quote.service";

function mockRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getQuoteHandler", () => {
  it("returns 404 when the cart doesn't exist", async () => {
    vi.mocked(getCartWithItems).mockRejectedValue(new CartNotFoundError());

    const req = { params: { cartId: "cart-1" }, body: {} } as unknown as Request;
    const res = mockRes();

    await getQuoteHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it("returns 200 with the computed quote", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1" } as never);
    vi.mocked(computeCheckoutQuote).mockResolvedValue({ totalCents: 1500 } as never);

    const req = { params: { cartId: "cart-1" }, body: {} } as unknown as Request;
    const res = mockRes();

    await getQuoteHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ quote: { totalCents: 1500 } });
  });
});

describe("placeOrderHandler idempotency", () => {
  it("short-circuits with the stored response when the key is already completed", async () => {
    vi.mocked(reserveIdempotencyKey).mockResolvedValue({ status: "completed", response: { order: { id: "o1" } } });

    const req = {
      params: { cartId: "cart-1" },
      body: { methodType: "CASH_ON_DELIVERY" },
      idempotencyKey: "key-1",
    } as unknown as Request;
    const res = mockRes();

    await placeOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ order: { id: "o1" } });
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("returns 409 when an identical request is already in progress", async () => {
    vi.mocked(reserveIdempotencyKey).mockResolvedValue({ status: "in_progress" });

    const req = {
      params: { cartId: "cart-1" },
      body: { methodType: "CASH_ON_DELIVERY" },
      idempotencyKey: "key-1",
    } as unknown as Request;
    const res = mockRes();

    await placeOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(placeOrder).not.toHaveBeenCalled();
  });

  it("places the order and marks the key completed on success", async () => {
    vi.mocked(reserveIdempotencyKey).mockResolvedValue({ status: "fresh" });
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1" } as never);
    vi.mocked(placeOrder).mockResolvedValue({ order: { id: "o1" } } as never);

    const req = {
      params: { cartId: "cart-1" },
      body: { methodType: "CASH_ON_DELIVERY" },
      idempotencyKey: "key-1",
    } as unknown as Request;
    const res = mockRes();

    await placeOrderHandler(req, res);

    expect(completeIdempotencyKey).toHaveBeenCalledWith("key-1", { order: { id: "o1" } });
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("marks the key failed and maps PaymentFailedError to 402", async () => {
    vi.mocked(reserveIdempotencyKey).mockResolvedValue({ status: "fresh" });
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1" } as never);
    vi.mocked(placeOrder).mockRejectedValue(new PaymentFailedError("card declined"));

    const req = {
      params: { cartId: "cart-1" },
      body: { methodType: "CASH_ON_DELIVERY" },
      idempotencyKey: "key-1",
    } as unknown as Request;
    const res = mockRes();

    await placeOrderHandler(req, res);

    expect(failIdempotencyKey).toHaveBeenCalledWith("key-1");
    expect(res.status).toHaveBeenCalledWith(402);
  });

  it("maps EmptyCartError to 400", async () => {
    vi.mocked(reserveIdempotencyKey).mockResolvedValue({ status: "fresh" });
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1" } as never);
    vi.mocked(placeOrder).mockRejectedValue(new EmptyCartError());

    const req = {
      params: { cartId: "cart-1" },
      body: { methodType: "CASH_ON_DELIVERY" },
      idempotencyKey: "key-1",
    } as unknown as Request;
    const res = mockRes();

    await placeOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("maps PriceDriftError and CheckoutIneligibleError to 422", async () => {
    vi.mocked(reserveIdempotencyKey).mockResolvedValue({ status: "fresh" });
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1" } as never);
    vi.mocked(placeOrder).mockRejectedValue(new PriceDriftError());

    const req = {
      params: { cartId: "cart-1" },
      body: { methodType: "CASH_ON_DELIVERY" },
      idempotencyKey: "key-1",
    } as unknown as Request;
    const res = mockRes();

    await placeOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("maps CheckoutIneligibleError to 422", async () => {
    vi.mocked(reserveIdempotencyKey).mockResolvedValue({ status: "fresh" });
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1" } as never);
    vi.mocked(placeOrder).mockRejectedValue(new CheckoutIneligibleError("kitchen closed"));

    const req = {
      params: { cartId: "cart-1" },
      body: { methodType: "CASH_ON_DELIVERY" },
      idempotencyKey: "key-1",
    } as unknown as Request;
    const res = mockRes();

    await placeOrderHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
  });
});
