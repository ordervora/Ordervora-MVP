export class CheckoutIneligibleError extends Error {
  constructor(reason: string) {
    super(reason);
  }
}

export class EmptyCartError extends Error {
  constructor() {
    super("Cannot check out an empty cart");
  }
}

export class PriceDriftError extends Error {
  constructor() {
    super("One or more item prices have changed since you added them — please review your cart");
  }
}

export class ItemUnavailableAtCheckoutError extends Error {
  constructor(itemName: string) {
    super(`"${itemName}" is no longer available`);
  }
}

export class PaymentFailedError extends Error {
  constructor(detail?: string) {
    super(detail ? `Payment failed: ${detail}` : "Payment failed");
  }
}

export class CheckoutInProgressError extends Error {
  constructor() {
    super("This checkout request is already being processed");
  }
}

export class GuestInfoRequiredError extends Error {
  constructor() {
    super("Guest checkout requires an email and name");
  }
}
