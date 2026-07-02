import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    $transaction: vi.fn(),
    menuItem: { findUnique: vi.fn(), findMany: vi.fn() },
    menuItemInventory: { findUnique: vi.fn() },
    menuItemVariant: { findUnique: vi.fn() },
    restaurant: { findUnique: vi.fn() },
    user: { findFirst: vi.fn() },
    customer: { findUnique: vi.fn() },
    order: { findUniqueOrThrow: vi.fn(), update: vi.fn() },
    orderItem: { findMany: vi.fn(), update: vi.fn() },
    orderTimeline: { create: vi.fn() },
    transaction: { createMany: vi.fn() },
    guestCustomer: { create: vi.fn() },
    couponRedemption: { create: vi.fn() },
    cart: { update: vi.fn() },
  },
}));

vi.mock("../cart/cart.service", () => ({
  getCartWithItems: vi.fn(),
  cartSubtotalCents: vi.fn(() => 1000),
}));

vi.mock("../menu-commerce/inventory.service", () => ({
  isItemOrderable: vi.fn(() => true),
}));

const mockAuthorize = vi.fn();
const mockCapture = vi.fn();
vi.mock("../payments/orchestrator", () => ({
  authorizeOrderPayment: (...args: unknown[]) => mockAuthorize(...args),
  captureOrderPayment: (...args: unknown[]) => mockCapture(...args),
}));

vi.mock("../coupons/coupons.service", () => ({
  validateCouponForRedemption: vi.fn(),
}));

vi.mock("../events/record-order-event", () => ({
  emitOrderEvent: vi.fn(),
  writeOrderEvent: vi.fn(),
}));

vi.mock("../orders/order-number", () => ({
  nextOrderNumber: vi.fn(async () => 1),
}));

vi.mock("../notifications/notifications.service", () => ({
  sendNewOrderStaffAlert: vi.fn(),
  sendOrderConfirmation: vi.fn(),
  sendPaymentFailedNotification: vi.fn(),
}));

vi.mock("./quote.service", () => ({
  computeCheckoutQuote: vi.fn(),
}));

import { prisma } from "../../../lib/prisma";
import { getCartWithItems } from "../cart/cart.service";
import { NoAvailableProviderError } from "../payments/payments.errors";
import { computeCheckoutQuote } from "./quote.service";
import {
  CheckoutIneligibleError,
  EmptyCartError,
  GuestInfoRequiredError,
  PaymentFailedError,
  PriceDriftError,
} from "./checkout.errors";
import { placeOrder } from "./checkout.service";

const mockPrisma = vi.mocked(prisma, { deep: true });

function eligibleQuote(overrides: Record<string, unknown> = {}) {
  return {
    eligible: true,
    resolvedFulfillmentMethod: "PICKUP",
    subtotalCents: 1000,
    taxCents: 90,
    tipCents: 0,
    deliveryFeeCents: 0,
    serviceFeeCents: 0,
    discountCents: 0,
    totalCents: 1090,
    ...overrides,
  };
}

function baseCart(overrides: Record<string, unknown> = {}) {
  return {
    id: "cart-1",
    restaurantId: "r1",
    customerId: "cust-1",
    guestSessionId: null,
    couponCode: null,
    fulfillmentType: "PICKUP",
    tableId: null,
    scheduledFor: null,
    deliveryAddressId: null,
    items: [
      {
        id: "ci-1",
        cartId: "cart-1",
        menuItemId: "item-1",
        variantId: null,
        quantity: 1,
        unitPriceCents: 1000,
        modifiersSnapshot: { modifiers: [] },
      },
    ],
    ...overrides,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (cb: unknown) => (cb as (tx: unknown) => unknown)(mockPrisma));
  mockPrisma.menuItem.findUnique.mockResolvedValue({ id: "item-1", name: "Burger", restaurantId: "r1", priceCents: 1000, isAvailable: true } as never);
  mockPrisma.menuItem.findMany.mockResolvedValue([{ id: "item-1", name: "Burger" }] as never);
  mockPrisma.menuItemInventory.findUnique.mockResolvedValue(null as never);
  mockPrisma.restaurant.findUnique.mockResolvedValue({ id: "r1", ownerId: "owner-1" } as never);
  mockPrisma.user.findFirst.mockResolvedValue({ email: "owner@restaurant.com" } as never);
  mockPrisma.customer.findUnique.mockResolvedValue({ email: "customer@example.com" } as never);
  mockPrisma.orderItem.findMany.mockResolvedValue([{ id: "oi-1", menuItemId: "item-1" }] as never);
  mockPrisma.order.findUniqueOrThrow.mockResolvedValue({
    id: "order-1",
    orderNumber: 1,
    status: "PENDING_PAYMENT",
    totalCents: 1090,
  } as never);
  vi.mocked(computeCheckoutQuote).mockResolvedValue(eligibleQuote() as never);
});

function mockCreatedOrder(overrides: Record<string, unknown> = {}) {
  mockPrisma.order.create = vi.fn().mockResolvedValue({
    id: "order-1",
    orderNumber: 1,
    restaurantId: "r1",
    status: "PENDING_PAYMENT",
    totalCents: 1090,
    ...overrides,
  } as never) as never;
  mockPrisma.orderItem.createMany = vi.fn().mockResolvedValue({ count: 1 } as never) as never;
  mockPrisma.fulfillment = { create: vi.fn().mockResolvedValue({}) } as never;
}

describe("placeOrder — pre-flight validation", () => {
  it("rejects a cart that does not belong to the given restaurant", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart({ restaurantId: "other" }));

    await expect(
      placeOrder("cart-1", "r1", { tipCents: 0, methodType: "CASH_AT_PICKUP" } as never),
    ).rejects.toBeInstanceOf(CheckoutIneligibleError);
  });

  it("rejects an empty cart", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart({ items: [] }));

    await expect(
      placeOrder("cart-1", "r1", { tipCents: 0, methodType: "CASH_AT_PICKUP" } as never),
    ).rejects.toBeInstanceOf(EmptyCartError);
  });

  it("rejects a guest checkout with no guest email", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart({ customerId: null }));

    await expect(
      placeOrder("cart-1", "r1", { tipCents: 0, methodType: "CASH_AT_PICKUP" } as never),
    ).rejects.toBeInstanceOf(GuestInfoRequiredError);
  });

  it("rejects when the base item price has drifted since it was added to the cart", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart());
    mockPrisma.menuItem.findUnique.mockResolvedValue({ id: "item-1", name: "Burger", restaurantId: "r1", priceCents: 1500, isAvailable: true } as never);

    await expect(
      placeOrder("cart-1", "r1", { tipCents: 0, methodType: "CASH_AT_PICKUP" } as never),
    ).rejects.toBeInstanceOf(PriceDriftError);
  });

  it("rejects when the routing engine reports the order ineligible", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart());
    vi.mocked(computeCheckoutQuote).mockResolvedValue({ eligible: false, reason: "Restaurant is closed" } as never);

    await expect(
      placeOrder("cart-1", "r1", { tipCents: 0, methodType: "CASH_AT_PICKUP" } as never),
    ).rejects.toBeInstanceOf(CheckoutIneligibleError);
  });
});

describe("placeOrder — cash methods bypass the payment provider", () => {
  it("creates and confirms the order without calling authorizeOrderPayment", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart());
    mockCreatedOrder();

    await placeOrder("cart-1", "r1", { tipCents: 0, methodType: "CASH_AT_PICKUP" } as never);

    expect(mockAuthorize).not.toHaveBeenCalled();
    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CONFIRMED" }) }),
    );
  });
});

describe("placeOrder — card payment success", () => {
  it("authorizes, captures, confirms the order, and writes sub-ledger transactions", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart());
    mockCreatedOrder();
    mockAuthorize.mockResolvedValue({ payment: { id: "pay-1" }, attempt: { id: "attempt-1" } });
    mockCapture.mockResolvedValue({ id: "pay-1", status: "CAPTURED" });
    vi.mocked(computeCheckoutQuote).mockResolvedValue(eligibleQuote({ tipCents: 200, serviceFeeCents: 100, totalCents: 1390 }) as never);

    const result = await placeOrder("cart-1", "r1", { tipCents: 200, methodType: "VISA", methodToken: "pm_123" } as never);

    expect(mockAuthorize).toHaveBeenCalledWith(expect.objectContaining({ orderId: "order-1", amountCents: 1390 }));
    expect(mockCapture).toHaveBeenCalledWith("pay-1", "r1");
    expect(mockPrisma.transaction.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ type: "TIP", amountCents: 200 }),
          expect.objectContaining({ type: "SERVICE_FEE", amountCents: 100 }),
        ]),
      }),
    );
    expect(result.order.id).toBe("order-1");
  });

  it("rejects a card method with no methodToken before ever creating a payment attempt", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart());
    mockCreatedOrder();

    await expect(
      placeOrder("cart-1", "r1", { tipCents: 0, methodType: "VISA" } as never),
    ).rejects.toBeInstanceOf(PaymentFailedError);
    expect(mockAuthorize).not.toHaveBeenCalled();
  });
});

describe("placeOrder — card payment failure", () => {
  it("transitions the order to FAILED, notifies the customer, and throws PaymentFailedError", async () => {
    vi.mocked(getCartWithItems).mockResolvedValue(baseCart());
    mockCreatedOrder();
    mockAuthorize.mockRejectedValue(new NoAvailableProviderError("all providers declined"));

    await expect(
      placeOrder("cart-1", "r1", { tipCents: 0, methodType: "VISA", methodToken: "pm_123" } as never),
    ).rejects.toBeInstanceOf(PaymentFailedError);

    expect(mockPrisma.order.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "FAILED" }) }),
    );
    expect(mockCapture).not.toHaveBeenCalled();
  });
});
