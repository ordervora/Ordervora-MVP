import type { AuditLogEntry, PublicUser, Restaurant } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { DashboardNav } from "@/components/dashboard-nav";
import { LogoutButton } from "./logout-button";
import { AdminPanel } from "./admin-panel";

// Platform Admin has no dedicated dashboard section elsewhere in the app —
// this reuses the existing, already-tested GET /api/admin/restaurants
// endpoint (restaurant.routes.ts), plus Sprint 16's suspend/unsuspend +
// audit log endpoints, to give the ADMIN role a platform-wide management
// surface here rather than a separate route.
async function AdminOverview() {
  const [restaurantsResult, auditLogResult] = await Promise.all([
    serverFetch<{ restaurants: Restaurant[] }>("/api/admin/restaurants"),
    serverFetch<{ entries: AuditLogEntry[] }>("/api/admin/audit-log"),
  ]);
  if (!restaurantsResult.ok) {
    return <p className="text-sm text-red-600 dark:text-red-400">Could not load restaurants.</p>;
  }

  return (
    <AdminPanel
      initialRestaurants={restaurantsResult.data.restaurants}
      initialAuditLog={auditLogResult.ok ? auditLogResult.data.entries : []}
    />
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
