"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  getCart,
  getCheckoutQuote,
  placeOrder,
  type Cart,
  type CheckoutQuote,
  type PaymentMethodType,
} from "@/lib/commerce-api";
import { clearIdempotencyKey, clearStoredCartId, getOrCreateIdempotencyKey, getStoredCartId } from "@/lib/cart-storage";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

const PAYMENT_METHODS: { value: PaymentMethodType; label: string }[] = [
  { value: "CASH_ON_DELIVERY", label: "Cash on delivery" },
  { value: "CASH_AT_PICKUP", label: "Cash at pickup" },
  { value: "VISA", label: "Card (Visa/Mastercard/Amex/Discover)" },
];

export default function CheckoutPage() {
  const params = useParams<{ restaurantId: string }>();
  const restaurantId = params.restaurantId;
  const router = useRouter();

  const [cartId] = useState<string | null>(() => getStoredCartId(restaurantId));
  const [cart, setCart] = useState<Cart | null>(null);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [tipCents, setTipCents] = useState(0);
  const [methodType, setMethodType] = useState<PaymentMethodType>("CASH_ON_DELIVERY");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!cartId) {
      router.replace(`/order/${restaurantId}`);
    }
  }, [cartId, restaurantId, router]);

  useEffect(() => {
    if (!cartId) return;
    let cancelled = false;
    async function load() {
      try {
        const { cart: loadedCart } = await getCart(cartId!);
        if (cancelled) return;
        setCart(loadedCart);
        const { quote: loadedQuote } = await getCheckoutQuote(cartId!, tipCents);
        if (cancelled) return;
        setQuote(loadedQuote);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load checkout");
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [cartId, tipCents]);

  async function handlePlaceOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!cartId) return;
    setSubmitting(true);
    setError(null);
    try {
      const idempotencyKey = getOrCreateIdempotencyKey();
      const { order } = await placeOrder(
        cartId,
        {
          tipCents,
          methodType,
          guestEmail: guestEmail || undefined,
          guestName: guestName || undefined,
          guestPhone: guestPhone || undefined,
        },
        idempotencyKey,
      );
      clearIdempotencyKey();
      clearStoredCartId(restaurantId);
      router.push(`/order/confirmation/${order.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  }

  if (!cart || !quote) {
    return <p className="p-8 text-sm text-zinc-600 dark:text-zinc-400">{error ?? "Loading checkout…"}</p>;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-6 dark:bg-black">
      <form onSubmit={handlePlaceOrder} className="flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Checkout</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!quote.eligible && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {quote.reason ?? "This order is not currently eligible for checkout."}
          </p>
        )}

        <div className="flex flex-col gap-2 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Guest details</span>
          <input
            type="text"
            placeholder="Full name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
          />
          <input
            type="email"
            placeholder="Email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
          />
          <input
            type="tel"
            placeholder="Phone"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
          />
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Payment method</span>
          {PAYMENT_METHODS.map((method) => (
            <label key={method.value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="methodType"
                checked={methodType === method.value}
                onChange={() => setMethodType(method.value)}
              />
              {method.label}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-2 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Tip</span>
          <div className="flex gap-2">
            {[0, 200, 400, 600].map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => setTipCents(amount)}
                className={`rounded-full px-4 py-2 text-sm ${
                  tipCents === amount
                    ? "bg-foreground text-background"
                    : "border border-black/[.08] text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
                }`}
              >
                {amount === 0 ? "No tip" : `$${formatPrice(amount)}`}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-black/[.08] bg-white p-4 text-sm dark:border-white/[.145] dark:bg-zinc-950">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>${formatPrice(quote.subtotalCents)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax</span>
            <span>${formatPrice(quote.taxCents)}</span>
          </div>
          {quote.deliveryFeeCents > 0 && (
            <div className="flex justify-between">
              <span>Delivery fee</span>
              <span>${formatPrice(quote.deliveryFeeCents)}</span>
            </div>
          )}
          {quote.serviceFeeCents > 0 && (
            <div className="flex justify-between">
              <span>Service fee</span>
              <span>${formatPrice(quote.serviceFeeCents)}</span>
            </div>
          )}
          {quote.discountCents > 0 && (
            <div className="flex justify-between text-green-700 dark:text-green-400">
              <span>Discount</span>
              <span>-${formatPrice(quote.discountCents)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Tip</span>
            <span>${formatPrice(quote.tipCents)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-black/[.08] pt-2 text-base font-semibold dark:border-white/[.145]">
            <span>Total</span>
            <span>${formatPrice(quote.totalCents)}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting || !quote.eligible}
          className="rounded-full bg-foreground px-5 py-3 text-sm text-background disabled:opacity-40"
        >
          {submitting ? "Placing order…" : `Place order — $${formatPrice(quote.totalCents)}`}
        </button>
      </form>
    </div>
  );
}
