import type { Request, Response } from "express";
import { completeIdempotencyKey, failIdempotencyKey, reserveIdempotencyKey } from "../../../lib/idempotency";
import { CartNotFoundError } from "../cart/cart.errors";
import {
  CheckoutIneligibleError,
  EmptyCartError,
  GuestInfoRequiredError,
  ItemUnavailableAtCheckoutError,
  PaymentFailedError,
  PriceDriftError,
} from "./checkout.errors";
import { placeOrder } from "./checkout.service";
import { placeOrderSchema, quoteRequestSchema } from "./checkout.validation";
import { computeCheckoutQuote } from "./quote.service";
import { getCartWithItems } from "../cart/cart.service";

export async function getQuoteHandler(req: Request, res: Response): Promise<void> {
  const parsed = quoteRequestSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const cart = await getCartWithItems(req.params.cartId as string);
    const quote = await computeCheckoutQuote(cart, parsed.data.tipCents);
    res.status(200).json({ quote });
  } catch (err) {
    if (err instanceof CartNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function placeOrderHandler(req: Request, res: Response): Promise<void> {
  const parsed = placeOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const idempotencyKey = req.idempotencyKey!;
  const cartId = req.params.cartId as string;

  const reservation = await reserveIdempotencyKey<{ order: unknown }>(idempotencyKey, "checkout.placeOrder");
  if (reservation.status === "completed") {
    res.status(201).json(reservation.response);
    return;
  }
  if (reservation.status === "in_progress") {
    res.status(409).json({ error: "This checkout request is already being processed" });
    return;
  }

  try {
    const cart = await getCartWithItems(cartId);
    const result = await placeOrder(cartId, cart.restaurantId, parsed.data);
    const response = { order: result.order };
    await completeIdempotencyKey(idempotencyKey, response);
    res.status(201).json(response);
  } catch (err) {
    await failIdempotencyKey(idempotencyKey);
    if (err instanceof CartNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof EmptyCartError || err instanceof GuestInfoRequiredError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (
      err instanceof CheckoutIneligibleError ||
      err instanceof ItemUnavailableAtCheckoutError ||
      err instanceof PriceDriftError
    ) {
      res.status(422).json({ error: err.message });
      return;
    }
    if (err instanceof PaymentFailedError) {
      res.status(402).json({ error: err.message });
      return;
    }
    throw err;
  }
}
