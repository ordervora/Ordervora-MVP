import type { Payment, PaymentAttempt, PaymentMethodType, RefundReason } from "@prisma/client";
import { ProviderConnectionStatus } from "@prisma/client";
import { decryptSecret } from "../../../lib/encryption";
import { prisma } from "../../../lib/prisma";
import { NoAvailableProviderError, PaymentMethodNotFoundError } from "./payments.errors";
import { paymentProviderRegistry } from "./registry";

export interface AuthorizeOrderPaymentInput {
  orderId: string;
  restaurantId: string;
  methodType: PaymentMethodType;
  methodToken: string;
  amountCents: number;
  currency: string;
}

export interface AuthorizeOrderPaymentResult {
  payment: Payment;
  attempt: PaymentAttempt;
}

/**
 * The core payment-orchestration entry point (Sprint 07 spec §4). Looks up
 * the enabled PaymentMethod's primary provider; if it isn't CONNECTED,
 * builds a fallback candidate list of every other CONNECTED provider for
 * the restaurant, ordered by priority (ascending, ties broken by
 * isDefault desc), and tries each in turn. One PaymentAttempt row is
 * written per try — attemptNumber counts across ALL providers tried, not
 * per-provider, per the schema's documented semantics. Never chooses a
 * provider for the customer to see; provider routing/failover is entirely
 * transparent (spec Decision #8).
 */
export async function authorizeOrderPayment(input: AuthorizeOrderPaymentInput): Promise<AuthorizeOrderPaymentResult> {
  const method = await prisma.paymentMethod.findUnique({
    where: { restaurantId_methodType: { restaurantId: input.restaurantId, methodType: input.methodType } },
    include: { provider: true },
  });
  if (!method || !method.isEnabled) {
    throw new PaymentMethodNotFoundError();
  }

  const candidates =
    method.provider.status === ProviderConnectionStatus.CONNECTED
      ? [method.provider]
      : await prisma.paymentProvider.findMany({
          where: { restaurantId: input.restaurantId, status: ProviderConnectionStatus.CONNECTED },
          orderBy: [{ priority: "asc" }, { isDefault: "desc" }],
        });

  let attemptNumber = 0;
  let lastFailure: { failureCode?: string; failureMessage?: string } | undefined;

  for (const candidate of candidates) {
    const adapter = paymentProviderRegistry.get(candidate.providerType);
    if (!adapter?.implemented || !candidate.credentialsEncrypted) {
      continue;
    }

    attemptNumber += 1;
    const credentials = decryptSecret(candidate.credentialsEncrypted);
    const result = await adapter.authorize(
      {
        orderId: input.orderId,
        amountCents: input.amountCents,
        currency: input.currency,
        methodToken: input.methodToken,
      },
      credentials,
    );

    const attempt = await prisma.paymentAttempt.create({
      data: {
        orderId: input.orderId,
        providerId: candidate.id,
        methodType: input.methodType,
        attemptNumber,
        status: result.success ? "AUTHORIZED" : "FAILED",
        providerPaymentIntentId: result.providerPaymentIntentId,
        failureCode: result.failureCode,
        failureMessage: result.failureMessage,
        amountCents: input.amountCents,
      },
    });

    if (result.success) {
      const payment = await prisma.payment.upsert({
        where: { orderId: input.orderId },
        create: {
          orderId: input.orderId,
          providerId: candidate.id,
          successfulAttemptId: attempt.id,
          status: "AUTHORIZED",
          authorizedAmountCents: input.amountCents,
        },
        update: {
          providerId: candidate.id,
          successfulAttemptId: attempt.id,
          status: "AUTHORIZED",
          authorizedAmountCents: input.amountCents,
        },
      });
      return { payment, attempt };
    }

    lastFailure = { failureCode: result.failureCode, failureMessage: result.failureMessage };
  }

  if (attemptNumber === 0) {
    throw new NoAvailableProviderError();
  }
  throw new NoAvailableProviderError(lastFailure?.failureMessage);
}

/** Called right after a successful authorize for the immediate-order (auth+capture together) path. */
export async function captureOrderPayment(paymentId: string, restaurantId: string): Promise<Payment> {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId }, include: { provider: true } });
  if (!payment) {
    throw new Error("Payment not found");
  }

  const adapter = paymentProviderRegistry.get(payment.provider.providerType);
  if (!adapter || !payment.provider.credentialsEncrypted || !payment.successfulAttemptId) {
    throw new Error("Payment has no successful authorization to capture");
  }
  const attempt = await prisma.paymentAttempt.findUnique({ where: { id: payment.successfulAttemptId } });
  if (!attempt?.providerPaymentIntentId) {
    throw new Error("Payment attempt is missing a provider intent id");
  }

  const credentials = decryptSecret(payment.provider.credentialsEncrypted);
  const result = await adapter.capture(attempt.providerPaymentIntentId, undefined, credentials);
  if (!result.success) {
    throw new Error(result.failureMessage ?? "Capture failed");
  }

  const capturedAmountCents = result.capturedAmountCents ?? payment.authorizedAmountCents;
  const updated = await prisma.payment.update({
    where: { id: paymentId },
    data: { status: "CAPTURED", capturedAmountCents, capturedAt: new Date() },
  });

  await prisma.transaction.create({
    data: { orderId: payment.orderId, restaurantId, type: "CHARGE", amountCents: capturedAmountCents },
  });

  return updated;
}

export interface RefundOrderPaymentInput {
  paymentId: string;
  amountCents: number;
  reason: RefundReason;
  initiatedById?: string;
  restaurantId: string;
}

export async function refundOrderPayment(input: RefundOrderPaymentInput) {
  const payment = await prisma.payment.findUnique({ where: { id: input.paymentId }, include: { provider: true } });
  if (!payment) {
    throw new Error("Payment not found");
  }
  const adapter = paymentProviderRegistry.get(payment.provider.providerType);
  const attempt = payment.successfulAttemptId
    ? await prisma.paymentAttempt.findUnique({ where: { id: payment.successfulAttemptId } })
    : null;
  if (!adapter || !payment.provider.credentialsEncrypted || !attempt?.providerPaymentIntentId) {
    throw new Error("Payment cannot be refunded — no successful provider charge on record");
  }

  const credentials = decryptSecret(payment.provider.credentialsEncrypted);
  const result = await adapter.refund(attempt.providerPaymentIntentId, input.amountCents, credentials);

  const refund = await prisma.refund.create({
    data: {
      paymentId: payment.id,
      orderId: payment.orderId,
      amountCents: input.amountCents,
      reason: input.reason,
      status: result.success ? "COMPLETED" : "FAILED",
      providerRefundId: result.providerRefundId,
      initiatedById: input.initiatedById,
    },
  });

  if (result.success) {
    const newRefundedTotal = payment.refundedAmountCents + input.amountCents;
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmountCents: newRefundedTotal,
        status: newRefundedTotal >= payment.capturedAmountCents ? "REFUNDED" : "PARTIALLY_REFUNDED",
      },
    });
    await prisma.transaction.create({
      data: {
        orderId: payment.orderId,
        restaurantId: input.restaurantId,
        type: "REFUND",
        amountCents: -input.amountCents,
      },
    });
  }

  return refund;
}
