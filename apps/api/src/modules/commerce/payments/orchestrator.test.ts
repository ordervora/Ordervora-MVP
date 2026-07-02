import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    paymentMethod: { findUnique: vi.fn() },
    paymentProvider: { findMany: vi.fn() },
    paymentAttempt: { create: vi.fn(), findUnique: vi.fn() },
    payment: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    refund: { create: vi.fn() },
    transaction: { create: vi.fn() },
  },
}));

vi.mock("../../../lib/encryption", () => ({
  encryptSecret: vi.fn((s: string) => `enc:${s}`),
  decryptSecret: vi.fn((s: string) => s.replace(/^enc:/, "")),
}));

const mockAuthorize = vi.fn();
const mockRefund = vi.fn();
vi.mock("./registry", () => ({
  paymentProviderRegistry: {
    get: vi.fn(() => ({
      providerType: "STRIPE",
      implemented: true,
      authorize: mockAuthorize,
      refund: mockRefund,
    })),
  },
}));

import { prisma } from "../../../lib/prisma";
import { NoAvailableProviderError, PaymentMethodNotFoundError } from "./payments.errors";
import { authorizeOrderPayment, refundOrderPayment } from "./orchestrator";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

function provider(overrides: Record<string, unknown> = {}) {
  return {
    id: "prov-1",
    providerType: "STRIPE",
    status: "CONNECTED",
    priority: 0,
    isDefault: true,
    credentialsEncrypted: "enc:sk_test_123",
    ...overrides,
  };
}

describe("authorizeOrderPayment", () => {
  it("throws PaymentMethodNotFoundError when the method is disabled or missing", async () => {
    mockPrisma.paymentMethod.findUnique.mockResolvedValue(null as never);

    await expect(
      authorizeOrderPayment({
        orderId: "o1",
        restaurantId: "r1",
        methodType: "VISA",
        methodToken: "pm_123",
        amountCents: 1000,
        currency: "usd",
      }),
    ).rejects.toBeInstanceOf(PaymentMethodNotFoundError);
  });

  it("authorizes against the primary provider when it is connected", async () => {
    mockPrisma.paymentMethod.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: provider(),
    } as never);
    mockAuthorize.mockResolvedValue({ success: true, providerPaymentIntentId: "pi_123" });
    mockPrisma.paymentAttempt.create.mockResolvedValue({ id: "attempt-1" } as never);
    mockPrisma.payment.upsert.mockResolvedValue({ id: "payment-1", status: "AUTHORIZED" } as never);

    const result = await authorizeOrderPayment({
      orderId: "o1",
      restaurantId: "r1",
      methodType: "VISA",
      methodToken: "pm_123",
      amountCents: 1000,
      currency: "usd",
    });

    expect(result.payment.id).toBe("payment-1");
    expect(mockPrisma.paymentProvider.findMany).not.toHaveBeenCalled();
    expect(mockAuthorize).toHaveBeenCalledTimes(1);
  });

  it("falls back to the next-priority connected provider when the primary is disconnected", async () => {
    mockPrisma.paymentMethod.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: provider({ status: "DISCONNECTED" }),
    } as never);
    mockPrisma.paymentProvider.findMany.mockResolvedValue([
      provider({ id: "prov-2", priority: 1 }),
      provider({ id: "prov-3", priority: 2 }),
    ] as never);
    mockAuthorize
      .mockResolvedValueOnce({ success: false, failureMessage: "declined" })
      .mockResolvedValueOnce({ success: true, providerPaymentIntentId: "pi_456" });
    mockPrisma.paymentAttempt.create.mockResolvedValue({ id: "attempt-1" } as never);
    mockPrisma.payment.upsert.mockResolvedValue({ id: "payment-1" } as never);

    const result = await authorizeOrderPayment({
      orderId: "o1",
      restaurantId: "r1",
      methodType: "VISA",
      methodToken: "pm_123",
      amountCents: 1000,
      currency: "usd",
    });

    expect(mockPrisma.paymentProvider.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ restaurantId: "r1", status: "CONNECTED" }) }),
    );
    expect(mockAuthorize).toHaveBeenCalledTimes(2);
    expect(result.payment.id).toBe("payment-1");
  });

  it("throws NoAvailableProviderError when there are no connected candidates", async () => {
    mockPrisma.paymentMethod.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: provider({ status: "DISCONNECTED" }),
    } as never);
    mockPrisma.paymentProvider.findMany.mockResolvedValue([] as never);

    await expect(
      authorizeOrderPayment({
        orderId: "o1",
        restaurantId: "r1",
        methodType: "VISA",
        methodToken: "pm_123",
        amountCents: 1000,
        currency: "usd",
      }),
    ).rejects.toBeInstanceOf(NoAvailableProviderError);
  });

  it("throws NoAvailableProviderError when every candidate fails to authorize", async () => {
    mockPrisma.paymentMethod.findUnique.mockResolvedValue({
      isEnabled: true,
      provider: provider(),
    } as never);
    mockAuthorize.mockResolvedValue({ success: false, failureMessage: "card declined" });
    mockPrisma.paymentAttempt.create.mockResolvedValue({ id: "attempt-1" } as never);

    await expect(
      authorizeOrderPayment({
        orderId: "o1",
        restaurantId: "r1",
        methodType: "VISA",
        methodToken: "pm_123",
        amountCents: 1000,
        currency: "usd",
      }),
    ).rejects.toBeInstanceOf(NoAvailableProviderError);
  });
});

describe("refundOrderPayment", () => {
  it("throws when the payment has no successful provider charge on record", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "pay-1",
      provider: provider(),
      successfulAttemptId: null,
    } as never);

    await expect(
      refundOrderPayment({
        paymentId: "pay-1",
        amountCents: 500,
        reason: "CUSTOMER_REQUEST",
        restaurantId: "r1",
      }),
    ).rejects.toThrow();
  });

  it("creates a Refund row and a negative Transaction on success", async () => {
    mockPrisma.payment.findUnique.mockResolvedValue({
      id: "pay-1",
      orderId: "o1",
      provider: provider(),
      successfulAttemptId: "attempt-1",
      refundedAmountCents: 0,
      capturedAmountCents: 1000,
    } as never);
    mockPrisma.paymentAttempt.findUnique.mockResolvedValue({ providerPaymentIntentId: "pi_123" } as never);
    mockRefund.mockResolvedValue({ success: true, providerRefundId: "re_123" });
    mockPrisma.refund.create.mockResolvedValue({ id: "refund-1", status: "COMPLETED" } as never);

    const refund = await refundOrderPayment({
      paymentId: "pay-1",
      amountCents: 500,
      reason: "CUSTOMER_REQUEST",
      restaurantId: "r1",
    });

    expect(refund.id).toBe("refund-1");
    expect(mockPrisma.transaction.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ amountCents: -500, type: "REFUND" }) }),
    );
    expect(mockPrisma.payment.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PARTIALLY_REFUNDED" }) }),
    );
  });
});
