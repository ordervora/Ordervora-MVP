import type { Request, Response } from "express";
import { verifyCustomerAccessToken } from "../customers/customer-jwt";
import { CUSTOMER_ACCESS_TOKEN_COOKIE } from "../customers/customer-cookies";
import { CouponInvalidError, CouponNotFoundError } from "../coupons/coupons.errors";
import { validateCouponForRedemption } from "../coupons/coupons.service";
import {
  CartItemNotFoundError,
  CartNotFoundError,
  CartRestaurantMismatchError,
  InvalidModifierSelectionError,
  ItemNotOrderableError,
} from "./cart.errors";
import {
  addCartItem,
  cartSubtotalCents,
  getCartWithItems,
  getOrCreateActiveCart,
  removeCartItem,
  setCartCoupon,
  setCartFulfillment,
  updateCartItemQuantity,
} from "./cart.service";
import { addCartItemSchema, applyCouponSchema, createCartSchema, setFulfillmentSchema, updateCartItemSchema } from "./cart.validation";
import { resolveGuestSessionId } from "./guest-session";
import type { CartIdentity } from "./cart.service";

/** Soft customer-auth check — a cart is usable by guests, so a missing/invalid customer token just falls back to guest identity. */
function resolveCartIdentity(req: Request, res: Response): CartIdentity {
  const token = req.cookies?.[CUSTOMER_ACCESS_TOKEN_COOKIE];
  if (token) {
    try {
      return { customerId: verifyCustomerAccessToken(token) };
    } catch {
      // fall through to guest identity
    }
  }
  return { guestSessionId: resolveGuestSessionId(req, res) };
}

export async function createCartHandler(req: Request, res: Response): Promise<void> {
  const parsed = createCartSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  const restaurantId = req.params.restaurantId as string;
  const identity = resolveCartIdentity(req, res);
  const cart = await getOrCreateActiveCart(restaurantId, identity, parsed.data.fulfillmentType, parsed.data.tableId);
  res.status(201).json({ cart });
}

export async function getCartHandler(req: Request, res: Response): Promise<void> {
  try {
    const cart = await getCartWithItems(req.params.cartId as string);
    res.status(200).json({ cart, subtotalCents: cartSubtotalCents(cart.items) });
  } catch (err) {
    if (err instanceof CartNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function addCartItemHandler(req: Request, res: Response): Promise<void> {
  const parsed = addCartItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const cart = await getCartWithItems(req.params.cartId as string);
    const item = await addCartItem(cart.restaurantId, cart.id, parsed.data);
    res.status(201).json({ item });
  } catch (err) {
    if (err instanceof CartNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof ItemNotOrderableError || err instanceof CartRestaurantMismatchError) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (err instanceof InvalidModifierSelectionError) {
      res.status(422).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function updateCartItemHandler(req: Request, res: Response): Promise<void> {
  const parsed = updateCartItemSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const item = await updateCartItemQuantity(req.params.cartId as string, req.params.itemId as string, parsed.data.quantity);
    res.status(200).json({ item });
  } catch (err) {
    if (err instanceof CartItemNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function removeCartItemHandler(req: Request, res: Response): Promise<void> {
  try {
    await removeCartItem(req.params.cartId as string, req.params.itemId as string);
    res.status(204).send();
  } catch (err) {
    if (err instanceof CartItemNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function setFulfillmentHandler(req: Request, res: Response): Promise<void> {
  const parsed = setFulfillmentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const cart = await setCartFulfillment(req.params.cartId as string, parsed.data);
    res.status(200).json({ cart });
  } catch (err) {
    if (err instanceof CartNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function applyCouponHandler(req: Request, res: Response): Promise<void> {
  const parsed = applyCouponSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const cart = await getCartWithItems(req.params.cartId as string);
    const identity = resolveCartIdentity(req, res);
    const { discountCents } = await validateCouponForRedemption(
      cart.restaurantId,
      parsed.data.code,
      cartSubtotalCents(cart.items),
      identity.customerId,
    );
    const updated = await setCartCoupon(cart.id, parsed.data.code.toUpperCase());
    res.status(200).json({ cart: updated, discountCents });
  } catch (err) {
    if (err instanceof CartNotFoundError || err instanceof CouponNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    if (err instanceof CouponInvalidError) {
      res.status(422).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function removeCouponHandler(req: Request, res: Response): Promise<void> {
  try {
    const cart = await setCartCoupon(req.params.cartId as string, null);
    res.status(200).json({ cart });
  } catch (err) {
    if (err instanceof CartNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}
