"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardNav } from "@/components/dashboard-nav";
import { listOwnOrders, type OwnerOrder } from "@/lib/owner-commerce-api";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

const STATUSES = ["", "PENDING_PAYMENT", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED", "REFUNDED"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listOwnOrders(status ? { status } : {})
      .then((result) => {
        if (!cancelled) setOrders(result.orders);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  return (
    <div className="flex w-full flex-1 flex-col items-center gap-6 overflow-x-hidden bg-zinc-50 p-4 sm:p-8 dark:bg-black">
      <div className="flex w-full max-w-4xl flex-col gap-6">
        <DashboardNav />
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">Orders</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
          {STATUSES.map((s) => (
            <button
              key={s || "all"}
              type="button"
              onClick={() => setStatus(s)}
              className={`min-h-9 shrink-0 rounded-full px-3 py-1 text-xs ${
                status === s
                  ? "bg-foreground text-background"
                  : "border border-black/[.08] text-zinc-700 dark:border-white/[.145] dark:text-zinc-300"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        <div className="w-full overflow-hidden rounded-lg border border-black/[.08] bg-white dark:border-white/[.145] dark:bg-zinc-950">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead className="border-b border-black/[.08] text-left text-zinc-600 dark:border-white/[.145] dark:text-zinc-400">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Placed</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-zinc-500">
                      Loading…
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-3 text-center text-zinc-500">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-b border-black/[.08] last:border-0 dark:border-white/[.145]">
                      <td className="p-3">
                        <Link href={`/dashboard/orders/${order.id}`} className="font-medium text-black hover:underline dark:text-zinc-50">
                          #{order.orderNumber}
                        </Link>
                      </td>
                      <td className="p-3">{order.status}</td>
                      <td className="p-3">{order.source}</td>
                      <td className="p-3">${formatPrice(order.totalCents)}</td>
                      <td className="p-3 text-zinc-500">{new Date(order.placedAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
