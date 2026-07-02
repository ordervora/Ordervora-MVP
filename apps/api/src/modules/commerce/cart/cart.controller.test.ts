import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../customers/customer-jwt", () => ({
  verifyCustomerAccessToken: vi.fn(),
}));

vi.mock("./guest-session", () => ({
  resolveGuestSessionId: vi.fn(),
}));

vi.mock("../coupons/coupons.service", () => ({
  validateCouponForRedemption: vi.fn(),
}));

vi.mock("./cart.service", () => ({
  addCartItem: vi.fn(),
  cartSubtotalCents: vi.fn(() => 0),
  getCartWithItems: vi.fn(),
  getOrCreateActiveCart: vi.fn(),
  removeCartItem: vi.fn(),
  setCartCoupon: vi.fn(),
  setCartFulfillment: vi.fn(),
  updateCartItemQuantity: vi.fn(),
}));

import type { Request, Response } from "express";
import { validateCouponForRedemption } from "../coupons/coupons.service";
import { CouponInvalidError } from "../coupons/coupons.errors";
import { verifyCustomerAccessToken } from "../customers/customer-jwt";
import {
  addCartItemHandler,
  applyCouponHandler,
  createCartHandler,
  getCartHandler,
} from "./cart.controller";
import { CartNotFoundError, InvalidModifierSelectionError, ItemNotOrderableError } from "./cart.errors";
import { addCartItem, getCartWithItems, getOrCreateActiveCart, setCartCoupon } from "./cart.service";
import { resolveGuestSessionId } from "./guest-session";

function mockRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), cookie: vi.fn() };
  return res as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveCartIdentity (via createCartHandler)", () => {
  it("uses the customer identity when a valid access token cookie is present", async () => {
    vi.mocked(verifyCustomerAccessToken).mockReturnValue("customer-1");
    vi.mocked(getOrCreateActiveCart).mockResolvedValue({ id: "cart-1" } as never);

    const req = {
      params: { restaurantId: "r1" },
      body: {},
      cookies: { customer_access_token: "valid-token" },
    } as unknown as Request;
    const res = mockRes();

    await createCartHandler(req, res);

    expect(getOrCreateActiveCart).toHaveBeenCalledWith("r1", { customerId: "customer-1" }, "PICKUP", undefined);
    expect(resolveGuestSessionId).not.toHaveBeenCalled();
  });

  it("falls back to guest identity when the access token cookie is invalid/expired", async () => {
    vi.mocked(verifyCustomerAccessToken).mockImplementation(() => {
      throw new Error("jwt expired");
    });
    vi.mocked(resolveGuestSessionId).mockReturnValue("guest-1");
    vi.mocked(getOrCreateActiveCart).mockResolvedValue({ id: "cart-1" } as never);

    const req = {
      params: { restaurantId: "r1" },
      body: {},
      cookies: { customer_access_token: "stale-token" },
    } as unknown as Request;
    const res = mockRes();

    await createCartHandler(req, res);

    expect(getOrCreateActiveCart).toHaveBeenCalledWith("r1", { guestSessionId: "guest-1" }, "PICKUP", undefined);
  });

  it("resolves guest identity directly when there is no access token cookie at all", async () => {
    vi.mocked(resolveGuestSessionId).mockReturnValue("guest-2");
    vi.mocked(getOrCreateActiveCart).mockResolvedValue({ id: "cart-1" } as never);

    const req = { params: { restaurantId: "r1" }, body: {}, cookies: {} } as unknown as Request;
    const res = mockRes();

    await createCartHandler(req, res);

    expect(verifyCustomerAccessToken).not.toHaveBeenCalled();
    expect(getOrCreateActiveCart).toHaveBeenCalledWith("r1", { guestSessionId: "guest-2" }, "PICKUP", undefined);
  });
});

describe("getCartHandler", () => {
  it("returns 404 when the cart doesn't exist", async () => {
    vi.mocked(getCartWithItems).mockRejectedValue(new CartNotFoundError());

    const req = { params: { cartId: "nonexistent" } } as unknown as Request;
    const res = mockRes();

    await getCartHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe("addCartItemHandler error mapping", () => {
  it("maps ItemNotOrderableError to 400", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1" } as never);
    vi.mocked(addCartItem).mockRejectedValue(new ItemNotOrderableError());

    const req = {
      params: { cartId: "cart-1" },
      body: { menuItemId: "11111111-1111-4111-8111-111111111111" },
    } as unknown as Request;
    const res = mockRes();

    await addCartItemHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it("maps InvalidModifierSelectionError to 422", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1" } as never);
    vi.mocked(addCartItem).mockRejectedValue(new InvalidModifierSelectionError("missing required group"));

    const req = {
      params: { cartId: "cart-1" },
      body: { menuItemId: "11111111-1111-4111-8111-111111111111" },
    } as unknown as Request;
    const res = mockRes();

    await addCartItemHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it("returns 400 on invalid input (not a uuid)", async () => {
    const req = { params: { cartId: "cart-1" }, body: { menuItemId: "not-a-uuid" } } as unknown as Request;
    const res = mockRes();

    await addCartItemHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(getCartWithItems).not.toHaveBeenCalled();
  });
});

describe("applyCouponHandler", () => {
  it("maps CouponInvalidError to 422 and does not persist the coupon on the cart", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1", items: [] } as never);
    vi.mocked(resolveGuestSessionId).mockReturnValue("guest-1");
    vi.mocked(validateCouponForRedemption).mockRejectedValue(new CouponInvalidError("expired"));

    const req = { params: { cartId: "cart-1" }, body: { code: "SAVE10" }, cookies: {} } as unknown as Request;
    const res = mockRes();

    await applyCouponHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(setCartCoupon).not.toHaveBeenCalled();
  });

  it("normalizes the coupon code to uppercase when persisting", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue({ id: "cart-1", restaurantId: "r1", items: [] } as never);
    vi.mocked(resolveGuestSessionId).mockReturnValue("guest-1");
    vi.mocked(validateCouponForRedemption).mockResolvedValue({ coupon: { id: "c1" }, discountCents: 200 } as never);
    vi.mocked(setCartCoupon).mockResolvedValue({ id: "cart-1", couponCode: "SAVE10" } as never);

    const req = { params: { cartId: "cart-1" }, body: { code: "save10" }, cookies: {} } as unknown as Request;
    const res = mockRes();

    await applyCouponHandler(req, res);

    expect(setCartCoupon).toHaveBeenCalledWith("cart-1", "SAVE10");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
