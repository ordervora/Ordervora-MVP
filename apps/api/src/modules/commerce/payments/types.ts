import type { PaymentProviderType } from "@prisma/client";

export interface AuthorizeInput {
  orderId: string;
  amountCents: number;
  currency: string;
  /** Provider-specific payment method token (e.g. a Stripe PaymentMethod id),
   * never a raw card number — raw card data must never touch our servers. */
  methodToken: string;
}

export interface AuthorizeResult {
  success: boolean;
  providerPaymentIntentId?: string;
  failureCode?: string;
  failureMessage?: string;
}

export interface CaptureResult {
  success: boolean;
  capturedAmountCents?: number;
  failureMessage?: string;
}

export interface VoidResult {
  success: boolean;
  failureMessage?: string;
}

export interface RefundResult {
  success: boolean;
  providerRefundId?: string;
  failureMessage?: string;
}

export type ProviderPaymentStatus = "pending" | "authorized" | "captured" | "failed" | "voided" | "refunded" | "partially_refunded";

export interface NormalizedWebhookEvent {
  externalEventId: string;
  providerPaymentIntentId?: string;
  status: ProviderPaymentStatus;
  raw: unknown;
}

/**
 * The single extensibility seam for payment providers — every provider,
 * present or future, implements this interface. The registry looks
 * adapters up by providerType; nothing else in the request path branches
 * on provider type. `implemented` lets orchestration code reject
 * connection attempts for not-yet-built providers without hardcoding a
 * list of which ones — same pattern as ImportAdapter (Sprint 04/05).
 */
export interface PaymentProviderAdapter {
  readonly providerType: PaymentProviderType;
  readonly implemented: boolean;

  authorize(input: AuthorizeInput, credentials: string): Promise<AuthorizeResult>;
  capture(providerPaymentIntentId: string, amountCents: number | undefined, credentials: string): Promise<CaptureResult>;
  void(providerPaymentIntentId: string, credentials: string): Promise<VoidResult>;
  refund(providerPaymentIntentId: string, amountCents: number, credentials: string): Promise<RefundResult>;
  getStatus(providerPaymentIntentId: string, credentials: string): Promise<ProviderPaymentStatus>;
  verifyWebhookSignature(rawBody: string, signatureHeader: string, webhookSecret: string): boolean;
  parseWebhookEvent(payload: unknown): NormalizedWebhookEvent;
}
