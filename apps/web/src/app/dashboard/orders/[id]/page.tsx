"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import {
  cancelOrder,
  completeOrder,
  getOwnOrder,
  markOutForDelivery,
  markPaidCash,
  markReady,
  refundOrder,
  startPreparing,
  type OwnerOrderDetail,
} from "@/lib/owner-commerce-api";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

const NEXT_ACTIONS: Record<string, { label: string; action: (id: string) => Promise<{ order: OwnerOrderDetail }> }[]> = {
  CONFIRMED: [{ label: "Start preparing", action: startPreparing }],
  PREPARING: [
    { label: "Mark ready", action: markReady },
    { label: "Mark out for delivery", action: markOutForDelivery },
  ],
  READY: [{ label: "Complete", action: completeOrder }],
  OUT_FOR_DELIVERY: [{ label: "Complete", action: completeOrder }],
};

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<OwnerOrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refundAmount, setRefundAmount] = useState("");

  const refresh = useCallback(() => {
    return getOwnOrder(orderId)
      .then((result) => setOrder(result.order))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load order"));
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    getOwnOrder(orderId)
      .then((result) => {
        if (!cancelled) setOrder(result.order);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load order");
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  async function handleAction(action: (id: string) => Promise<{ order: OwnerOrderDetail }>) {
    try {
      await action(orderId);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  async function handleCancel() {
    try {
      await cancelOrder(orderId, "Cancelled by staff");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cancel failed");
    }
  }

  async function handleMarkPaid() {
    try {
      await markPaidCash(orderId);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark paid");
    }
  }

  async function handleRefund() {
    const amountCents = Math.round(Number(refundAmount) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) return;
    try {
      await refundOrder(orderId, amountCents, "CUSTOMER_REQUEST");
      setRefundAmount("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
    }
  }

  if (!order) {
    return <p className="p-8 text-sm text-zinc-600 dark:text-zinc-400">{error ?? "Loading…"}</p>;
  }

  const nextActions = NEXT_ACTIONS[order.status] ?? [];

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <DashboardNav />

        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Order #{order.orderNumber}</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="rounded-lg border border-black/[.08] bg-white p-4 text-sm dark:border-white/[.145] dark:bg-zinc-950">
          <p>Status: {order.status}</p>
          <p>Payment: {order.paymentStatus}</p>
          <p>Fulfillment: {order.fulfillmentType}</p>
          <p>Total: ${formatPrice(order.totalCents)}</p>
        </div>

        <ul className="flex flex-col divide-y divide-black/[.08] rounded-lg border border-black/[.08] bg-white dark:divide-white/[.145] dark:border-white/[.145] dark:bg-zinc-950">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between p-3 text-sm">
              <span>
                {item.quantity}× {item.menuItemNameSnapshot}
              </span>
              <span>${formatPrice(item.unitPriceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <div className="flex flex-wrap gap-2">
          {nextActions.map((next) => (
            <button
              key={next.label}
              type="button"
              onClick={() => handleAction(next.action)}
              className="rounded-full bg-foreground px-4 py-2 text-sm text-background"
            >
              {next.label}
            </button>
          ))}
          {order.paymentStatus === "UNPAID" && (
            <button type="button" onClick={handleMarkPaid} className="rounded-full border border-black/[.08] px-4 py-2 text-sm dark:border-white/[.145]">
              Mark paid (cash)
            </button>
          )}
          {order.status !== "CANCELLED" && order.status !== "COMPLETED" && order.status !== "REFUNDED" && (
            <button type="button" onClick={handleCancel} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-600">
              Cancel order
            </button>
          )}
        </div>

        {order.payment && (
          <div className="flex items-end gap-2 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
            <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
              Refund amount ($)
              <input
                type="number"
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="rounded border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-black"
              />
            </label>
            <button type="button" onClick={handleRefund} className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-600">
              Issue refund
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
