import { redirect } from "next/navigation";
import type { PublicUser } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { DashboardNav } from "@/components/dashboard-nav";
import { LogoutButton } from "./logout-button";

export default async function DashboardPage() {
  const result = await serverFetch<{ user: PublicUser }>("/api/auth/me");

  if (!result.ok) {
    redirect("/login");
  }

  const { user } = result.data;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
        <DashboardNav />
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Welcome, {user.name}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Role: <span className="font-mono">{user.role}</span>
        </p>
        <LogoutButton />
      </div>
    </div>
  );
}
