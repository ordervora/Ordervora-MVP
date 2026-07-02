/**
 * Typed errors for the payments module, mirroring the shape of
 * modules/imports/import.errors.ts and modules/menu/menu.errors.ts —
 * thrown by services, mapped to HTTP status codes by controllers.
 */

export class PaymentProviderNotFoundError extends Error {
  constructor() {
    super("Payment provider not found");
  }
}

export class PaymentProviderNotImplementedError extends Error {
  constructor(providerType: string) {
    super(`Payment provider "${providerType}" is not implemented yet`);
  }
}

export class PaymentMethodNotFoundError extends Error {
  constructor() {
    super("Payment method not found or not enabled");
  }
}

/**
 * Thrown by the orchestrator when the primary provider for a payment
 * method is unavailable and every fallback candidate (or no candidate at
 * all) also fails to authorize — the customer-facing "payment temporarily
 * unavailable" case from Sprint 07 spec §4.
 */
export class NoAvailableProviderError extends Error {
  constructor(detail?: string) {
    super(
      detail
        ? `No available payment provider could authorize this payment: ${detail}`
        : "No available payment provider could authorize this payment",
    );
  }
}

export class PaymentNotFoundError extends Error {
  constructor() {
    super("Payment not found");
  }
}
