"use client";

import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { completeOrder, listOwnOrders, markOutForDelivery, markReady, startPreparing, type OwnerOrder } from "@/lib/owner-commerce-api";

const QUEUE_STATUSES = ["CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"];

// Mirrors dashboard/orders/[id]/page.tsx's (correct) NEXT_ACTIONS — the
// order state machine (order-state-machine.ts) only allows
// READY -> COMPLETED (never READY -> OUT_FOR_DELIVERY), so a fixed
// per-status action here was a dead end: every order that reached READY
// showed a "Mark out for delivery" button that could never succeed,
// regardless of fulfillment type. PREPARING now offers both real next
// steps (mark-ready for pickup/dine-in, mark-out-for-delivery for
// delivery, matching the state machine's PREPARING -> READY |
// OUT_FOR_DELIVERY), and READY/OUT_FOR_DELIVERY both offer "Complete".
const NEXT_ACTIONS: Record<string, { label: string; action: (id: string) => Promise<unknown> }[]> = {
  CONFIRMED: [{ label: "Start preparing", action: startPreparing }],
  PREPARING: [
    { label: "Mark ready", action: markReady },
    { label: "Mark out for delivery", action: markOutForDelivery },
  ],
  READY: [{ label: "Complete", action: completeOrder }],
  OUT_FOR_DELIVERY: [{ label: "Complete", action: completeOrder }],
};

/** Minimal staff-facing kitchen queue (Sprint 07 §22) — the same order data as /dashboard/orders, filtered to active kitchen work, with one-tap status advances and dine-in table labels. */
export default function KitchenQueuePage() {
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    return Promise.all(QUEUE_STATUSES.map((status) => listOwnOrders({ status })))
      .then((results) => {
        const all = results.flatMap((r) => r.orders);
        all.sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime());
        setOrders(all);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load queue"));
  }

  useEffect(() => {
    let cancelled = false;
    Promise.all(QUEUE_STATUSES.map((status) => listOwnOrders({ status })))
      .then((results) => {
        if (cancelled) return;
        const all = results.flatMap((r) => r.orders);
        all.sort((a, b) => new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime());
        setOrders(all);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load queue");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleAdvance(order: OwnerOrder, action: (id: string) => Promise<unknown>) {
    try {
      await action(order.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <DashboardNav />
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Kitchen queue</h1>
          <button type="button" onClick={refresh} className="text-sm text-zinc-600 dark:text-zinc-400">
            Refresh
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {orders.map((order) => {
            const actions = NEXT_ACTIONS[order.status] ?? [];
            return (
              <div key={order.id} className="flex flex-col gap-2 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-black dark:text-zinc-50">
                    #{order.orderNumber} {order.tableId && <span className="text-xs text-zinc-500">(table)</span>}
                  </span>
                  <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {order.status}
                  </span>
                </div>
                <span className="text-xs text-zinc-500">{order.fulfillmentType} · {order.source}</span>
                <div className="flex flex-wrap gap-2">
                  {actions.map((next) => (
                    <button
                      key={next.label}
                      type="button"
                      onClick={() => handleAdvance(order, next.action)}
                      className="self-start rounded-full bg-foreground px-4 py-2 text-sm text-background"
                    >
                      {next.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {orders.length === 0 && <p className="text-sm text-zinc-500">No active orders.</p>}
        </div>
      </div>
    </div>
  );
}
