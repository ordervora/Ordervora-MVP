"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  getRevenueByDay,
  getRevenueSummary,
  getTopItems,
  listOwnOrders,
  type OwnerOrder,
  type RevenueByDay,
  type RevenueSummary,
  type TopItem,
} from "@/lib/owner-commerce-api";

const NAV_ITEMS = [
  ["Dashboard", "/dashboard"],
  ["Orders", "/dashboard/orders"],
  ["Menu", "/dashboard/menu"],
  ["Website", "/dashboard/website"],
  ["Customers", "/dashboard/customers"],
  ["Marketing", "/dashboard/marketing"],
  ["Analytics", "/dashboard/analytics"],
  ["Staff", "/dashboard/staff"],
  ["Settings", "/dashboard/restaurant"],
] as const;

const QUICK_ACTIONS = [
  ["Add product", "/dashboard/menu"],
  ["Create coupon", "/dashboard/coupons"],
  ["Import menu", "/dashboard/import"],
  ["Open KDS", "/dashboard/kitchen"],
  ["Publish website", "/dashboard/website"],
] as const;

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function relativeTime(date: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusClass(status: string) {
  const value = status.toUpperCase();
  if (value.includes("READY") || value.includes("COMPLETE")) return "bg-emerald-50 text-emerald-700";
  if (value.includes("PREPAR")) return "bg-amber-50 text-amber-700";
  if (value.includes("CANCEL") || value.includes("DELAY")) return "bg-red-50 text-red-700";
  return "bg-[#F4E6D1] text-[#9A5F17]";
}

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#8A7D6C]">{label}</p>
      <p className="mt-3 text-3xl font-bold tracking-tight text-[#171512]">{value}</p>
      <p className="mt-2 text-sm font-medium text-emerald-700">{note ?? "Live business data"}</p>
    </div>
  );
}

export function DashboardOverview({ userName }: { userName: string }) {
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [byDay, setByDay] = useState<RevenueByDay[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [orders, setOrders] = useState<OwnerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [summaryData, dayData, topData, orderData] = await Promise.all([
          getRevenueSummary(7),
          getRevenueByDay(7),
          getTopItems(7, 5),
          listOwnOrders(),
        ]);
        if (cancelled) return;
        setSummary(summaryData);
        setByDay(dayData.days);
        setTopItems(topData.items);
        setOrders(orderData.orders.slice(0, 5));
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const operations = useMemo(() => {
    const counts = { New: 0, Preparing: 0, Ready: 0, Delayed: 0 };
    for (const order of orders) {
      const status = order.status.toUpperCase();
      if (status.includes("READY")) counts.Ready += 1;
      else if (status.includes("PREPAR")) counts.Preparing += 1;
      else if (status.includes("DELAY")) counts.Delayed += 1;
      else if (!status.includes("COMPLETE") && !status.includes("CANCEL")) counts.New += 1;
    }
    return counts;
  }, [orders]);

  const maxRevenue = Math.max(1, ...byDay.map((item) => item.revenueCents));
  const insight = topItems[0]
    ? `${topItems[0].name} is your leading item this week with ${topItems[0].quantitySold} sold and ${money(topItems[0].revenueCents)} in revenue.`
    : "Your AI business insights will appear here once you have enough order activity.";

  return (
    <div className="min-h-screen bg-[#F7F0E5] text-[#171512] lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden min-h-screen bg-[#171512] px-4 py-7 text-white lg:flex lg:flex-col">
        <div className="px-3 text-2xl font-bold tracking-tight text-[#D8A24E]">OrderVora</div>
        <nav className="mt-12 space-y-2">
          {NAV_ITEMS.map(([label, href], index) => (
            <Link
              key={href}
              href={href}
              className={`block rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                index === 0 ? "bg-[#B97824] text-white" : "text-[#D7D0C6] hover:bg-white/8 hover:text-white"
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-[#D7D0C6]">
          <p className="font-semibold text-white">Business command center</p>
          <p className="mt-1 leading-5">Orders, menu, customers and growth in one place.</p>
        </div>
      </aside>

      <main className="min-w-0 px-4 pb-24 pt-6 sm:px-6 lg:px-10 lg:pb-10 lg:pt-9">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#9A6A2F]">BUSINESS OVERVIEW</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Good morning, {userName}.</h1>
            <p className="mt-2 text-sm text-[#756B5D]">See what is happening now and what deserves your attention next.</p>
          </div>
          <Link href="/dashboard/orders" className="inline-flex w-fit items-center justify-center rounded-2xl bg-[#171512] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10">
            View live orders
          </Link>
        </header>

        {error && <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
        {loading && <div className="mt-6 text-sm font-medium text-[#756B5D]">Loading live business data…</div>}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Revenue · 7 days" value={summary ? money(summary.totalRevenueCents) : "—"} />
          <MetricCard label="Orders · 7 days" value={summary ? String(summary.totalOrders) : "—"} />
          <MetricCard label="Average order" value={summary ? money(summary.averageOrderValueCents) : "—"} />
          <MetricCard label="Top item" value={topItems[0]?.name ?? "—"} note={topItems[0] ? `${topItems[0].quantitySold} sold` : "Waiting for sales data"} />
        </section>

        <section className="mt-5 rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold">Live operations</h2>
              <p className="mt-1 text-sm text-[#756B5D]">Current workload at a glance.</p>
            </div>
            <Link href="/dashboard/kitchen" className="text-sm font-semibold text-[#A9681F]">Open KDS →</Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(operations).map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-[#FBF7F1] p-4">
                <p className="text-sm font-medium text-[#756B5D]">{label}</p>
                <p className={`mt-2 text-3xl font-bold ${label === "Delayed" && value > 0 ? "text-red-700" : "text-[#171512]"}`}>{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-3xl bg-[#171512] p-6 text-white shadow-xl shadow-black/10">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-bold text-[#E1B56F]">AI Business Copilot</h2>
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-[#E9E0D4]">Insight</span>
            </div>
            <p className="mt-5 max-w-xl text-base leading-7 text-[#E9E0D4]">{insight}</p>
            <Link href="/dashboard/analytics" className="mt-6 inline-flex rounded-2xl bg-[#B97824] px-4 py-3 text-sm font-semibold text-white">Explore analytics</Link>
          </div>

          <div className="rounded-3xl border border-[#E7DDCF] bg-white p-6 shadow-[0_12px_36px_rgba(48,39,27,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Revenue overview</h2>
                <p className="mt-1 text-sm text-[#756B5D]">Last 7 days</p>
              </div>
              <Link href="/dashboard/analytics" className="text-sm font-semibold text-[#A9681F]">Full report →</Link>
            </div>
            <div className="mt-6 flex h-40 items-end gap-2">
              {byDay.length === 0 ? (
                <div className="flex h-full w-full items-center justify-center rounded-2xl bg-[#FBF7F1] text-sm text-[#756B5D]">No order revenue yet.</div>
              ) : (
                byDay.map((item, index) => (
                  <div key={`${item.day}-${index}`} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div className="w-full rounded-t-xl bg-[#C98A37]" style={{ height: `${Math.max(8, (item.revenueCents / maxRevenue) * 120)}px` }} title={`${new Date(item.day).toLocaleDateString()}: ${money(item.revenueCents)}`} />
                    <span className="text-[10px] font-medium text-[#8A7D6C]">{new Date(item.day).toLocaleDateString("en-US", { weekday: "short" })}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)]">
          <h2 className="text-lg font-bold">Quick actions</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {QUICK_ACTIONS.map(([label, href], index) => (
              <Link key={href} href={href} className={`rounded-2xl border px-4 py-4 text-sm font-semibold transition hover:-translate-y-0.5 ${index === 0 ? "border-[#B97824] bg-[#B97824] text-white" : "border-[#E7DDCF] bg-[#FBF7F1] text-[#2A251F] hover:bg-white"}`}>
                {label}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-2">
          <div className="rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Top selling items</h2>
              <Link href="/dashboard/analytics" className="text-sm font-semibold text-[#A9681F]">View all</Link>
            </div>
            <div className="mt-4 divide-y divide-[#EEE5D9]">
              {topItems.length === 0 ? <p className="py-6 text-sm text-[#756B5D]">No sales data yet.</p> : topItems.map((item, index) => (
                <div key={item.menuItemId} className="flex items-center justify-between gap-4 py-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F4E6D1] text-sm font-bold text-[#9A5F17]">{index + 1}</span>
                    <div className="min-w-0"><p className="truncate font-semibold">{item.name}</p><p className="text-xs text-[#8A7D6C]">{item.quantitySold} sold</p></div>
                  </div>
                  <span className="font-semibold">{money(item.revenueCents)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)]">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Recent orders</h2>
              <Link href="/dashboard/orders" className="text-sm font-semibold text-[#A9681F]">View all</Link>
            </div>
            <div className="mt-4 divide-y divide-[#EEE5D9]">
              {orders.length === 0 ? <p className="py-6 text-sm text-[#756B5D]">No orders yet.</p> : orders.map((order) => (
                <div key={order.id} className="flex items-center justify-between gap-4 py-3">
                  <div><p className="font-semibold">#{order.orderNumber}</p><p className="text-xs text-[#8A7D6C]">{relativeTime(order.placedAt)}</p></div>
                  <div className="flex items-center gap-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(order.status)}`}>{order.status}</span><span className="font-semibold">{money(order.totalCents)}</span></div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[#E7DDCF] bg-white/95 px-2 py-2 backdrop-blur lg:hidden">
        {[['Home','/dashboard'],['Orders','/dashboard/orders'],['Menu','/dashboard/menu'],['Website','/dashboard/website'],['More','/dashboard/restaurant']].map(([label, href], index)=>(
          <Link key={href} href={href} className={`rounded-xl px-1 py-2 text-center text-xs font-semibold ${index===0?'text-[#A9681F]':'text-[#756B5D]'}`}>{label}</Link>
        ))}
      </nav>
    </div>
  );
}
