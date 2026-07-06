import type { PublicUser, Restaurant } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { DashboardNav } from "@/components/dashboard-nav";
import { LogoutButton } from "./logout-button";

// Platform Admin has no dedicated dashboard section elsewhere in the app —
// this reuses the existing, already-tested GET /api/admin/restaurants
// endpoint (restaurant.routes.ts) to give the ADMIN role a platform-wide
// overview here. No new backend endpoint or business logic.
async function AdminOverview() {
  const result = await serverFetch<{ restaurants: Restaurant[] }>("/api/admin/restaurants");
  if (!result.ok) {
    return <p className="text-sm text-red-600 dark:text-red-400">Could not load restaurants.</p>;
  }
  const { restaurants } = result.data;

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-black dark:text-zinc-50">
        Platform overview — {restaurants.length} restaurant{restaurants.length === 1 ? "" : "s"}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-black/[.08] text-zinc-500 dark:border-white/[.145] dark:text-zinc-400">
              <th className="py-1.5 pr-4 font-medium">Restaurant</th>
              <th className="py-1.5 pr-4 font-medium">Address</th>
              <th className="py-1.5 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {restaurants.map((restaurant) => (
              <tr key={restaurant.id} className="border-b border-black/[.04] dark:border-white/[.08]">
                <td className="py-1.5 pr-4 text-black dark:text-zinc-50">{restaurant.name}</td>
                <td className="py-1.5 pr-4 text-zinc-600 dark:text-zinc-400">{restaurant.address ?? "—"}</td>
                <td className="py-1.5">
                  {restaurant.isPublished ? (
                    <span className="text-green-600 dark:text-green-400">Published</span>
                  ) : (
                    <span className="text-zinc-500 dark:text-zinc-400">Unpublished</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  // layout.tsx already redirects to /login on an unauthenticated session,
  // so a failure here would only ever be a genuine transient error.
  const result = await serverFetch<{ user: PublicUser }>("/api/auth/me");
  if (!result.ok) {
    return <p className="text-sm text-red-600 dark:text-red-400">Could not load your account. Please refresh.</p>;
  }

  const { user } = result.data;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <DashboardNav />
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Welcome, {user.name}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Role: <span className="font-mono">{user.role}</span>
        </p>
        {user.role === "ADMIN" && <AdminOverview />}
        <LogoutButton />
      </div>
    </div>
  );
}
