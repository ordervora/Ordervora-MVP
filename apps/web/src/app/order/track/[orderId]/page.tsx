"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { getPublicOrder, getPublicOrderTimeline, type Order, type OrderTimelineEntry } from "@/lib/commerce-api";

const MILESTONE_LABELS: Record<string, string> = {
  PLACED: "Order placed",
  PREPARING: "Kitchen is preparing your order",
  READY: "Order is ready",
  OUT_FOR_DELIVERY: "Out for delivery",
  COMPLETED: "Delivered / picked up",
  CANCELLED: "Cancelled",
};

export default function OrderTrackingPage() {
  const params = useParams<{ orderId: string }>();
  const orderId = params.orderId;

  const [order, setOrder] = useState<Order | null>(null);
  const [timeline, setTimeline] = useState<OrderTimelineEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ order: loadedOrder }, { timeline: loadedTimeline }] = await Promise.all([
        getPublicOrder(orderId),
        getPublicOrderTimeline(orderId),
      ]);
      setOrder(loadedOrder);
      setTimeline(loadedTimeline);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found");
    }
  }, [orderId]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getPublicOrder(orderId), getPublicOrderTimeline(orderId)])
      .then(([{ order: loadedOrder }, { timeline: loadedTimeline }]) => {
        if (cancelled) return;
        setOrder(loadedOrder);
        setTimeline(loadedTimeline);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Order not found");
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  if (error) {
    return <p className="p-8 text-sm text-red-600">{error}</p>;
  }

  if (!order) {
    return <p className="p-8 text-sm text-zinc-600 dark:text-zinc-400">Loading…</p>;
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-6 dark:bg-black">
      <div className="flex w-full max-w-md flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Order #{order.orderNumber}</h1>
          <button type="button" onClick={load} className="text-sm text-zinc-600 dark:text-zinc-400">
            Refresh
          </button>
        </div>

        <p className="text-sm text-zinc-600 dark:text-zinc-400">Current status: {order.status}</p>

        <ol className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-4 dark:border-white/[.145] dark:bg-zinc-950">
          {timeline.length === 0 && (
            <li className="text-sm text-zinc-600 dark:text-zinc-400">No updates yet.</li>
          )}
          {timeline.map((entry) => (
            <li key={entry.id} className="flex justify-between text-sm">
              <span>{MILESTONE_LABELS[entry.milestone] ?? entry.milestone}</span>
              <span className="text-zinc-500">{new Date(entry.occurredAt).toLocaleTimeString()}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
