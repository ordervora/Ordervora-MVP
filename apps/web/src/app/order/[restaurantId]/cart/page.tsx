"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  applyCoupon,
  getCart,
  removeCartItem,
  removeCoupon,
  setCartFulfillment,
  updateCartItemQuantity,
  type Cart,
  type FulfillmentType,
} from "@/lib/commerce-api";
import { getStoredCartId } from "@/lib/cart-storage";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

export default function CartPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;
  const router = useRouter();

  const [cart, setCart] = useState<Cart | null>(null);
  const [subtotalCents, setSubtotalCents] = useState(0);
  const [couponCode, setCouponCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cartId] = useState<string | null>(() => getStoredCartId(restaurantId));

  useEffect(() => {
    if (!cartId) {
      router.replace(`/order/${restaurantId}`);
    }
  }, [cartId, restaurantId, router]);

  function refresh(id: string) {
    return getCart(id)
      .then((result) => {
        setCart(result.cart);
        setSubtotalCents(result.subtotalCents);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load cart");
      });
  }

  useEffect(() => {
    if (!cartId) return;
    let cancelled = false;
    getCart(cartId)
      .then((result) => {
        if (cancelled) return;
        setCart(result.cart);
        setSubtotalCents(result.subtotalCents);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load cart");
      });
    return () => {
      cancelled = true;
    };
  }, [cartId]);

  async function handleQuantityChange(itemId: string, quantity: number) {
    if (!cartId) return;
    if (quantity < 1) {
      await removeCartItem(cartId, itemId);
    } else {
      await updateCartItemQuantity(cartId, itemId, quantity);
    }
    refresh(cartId);
  }

  async function handleFulfillmentChange(fulfillmentType: FulfillmentType) {
    if (!cartId) return;
    await setCartFulfillment(cartId, { fulfillmentType });
    refresh(cartId);
  }

  async function handleApplyCoupon() {
    if (!cartId || !couponCode) return;
    try {
      await applyCoupon(cartId, couponCode);
      setError(null);
      refresh(cartId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid coupon");
    }
  }

  async function handleRemoveCoupon() {
    if (!cartId) return;
    await removeCoupon(cartId);
    refresh(cartId);
  }

  if (!cart) {
    return <p className="p-8 text-sm text-zinc-600 dark:text-zinc-400">{error ?? "Loading cart…"}</p>;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-6 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Your cart</h1>
          <Link href={`/order/${restaurantId}`} className="text-sm text-zinc-600 dark:text-zinc-400">
            ← Back to menu
          </Link>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {cart.items.length === 0 && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">Your cart is empty.</p>
        )}

        <ul className="flex flex-col divide-y divide-black/[.08] rounded-lg border border-black/[.08] bg-white dark:divide-white/[.145] dark:border-white/[.145] dark:bg-zinc-950">
          {cart.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-4 p-4">
              <div className="flex flex-col gap-1">
                <span className="font-medium text-black dark:text-zinc-50">
                  {item.modifiersSnapshot?.variantName ?? "Item"}
                </span>
                <span className="text-sm text-zinc-600 dark:text-zinc-400">${formatPrice(item.unitPriceCents)} each</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                  className="rounded-full border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
                >
                  −
                </button>
                <span className="w-6 text-center text-sm">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                  className="rounded-full border border-black/[.08] px-2 py-1 text-sm dark:border-white/[.145]"
                >
                  +
                </button>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Fulfillment</span>
          <div className="flex gap-2">
            {(["PICKUP", "DELIVERY", "DINE_IN"] as FulfillmentType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleFulfillmentChange(type)}
                className={`rounded-full px-4 py-2 text-sm ${
                  cart.fulfillmentType === type
                    ? "bg-foreground text-background"
                    : "border border-black/[.08] text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
                }`}
              >
                {type === "DINE_IN" ? "Dine in" : type.charAt(0) + type.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Coupon</span>
          {cart.couponCode ? (
            <div className="flex items-center justify-between">
              <span className="text-sm">{cart.couponCode}</span>
              <button type="button" onClick={handleRemoveCoupon} className="text-sm text-red-600">
                Remove
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                placeholder="Promo code"
                className="flex-1 rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Subtotal</span>
          <span className="text-lg font-semibold text-black dark:text-zinc-50">${formatPrice(subtotalCents)}</span>
        </div>

        <Link
          href={`/order/${restaurantId}/checkout`}
          className={`rounded-full bg-foreground px-5 py-3 text-center text-sm text-background ${
            cart.items.length === 0 ? "pointer-events-none opacity-40" : ""
          }`}
        >
          Proceed to checkout
        </Link>
      </div>
    </div>
  );
}
