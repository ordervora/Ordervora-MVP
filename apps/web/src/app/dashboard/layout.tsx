import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { serverFetch } from "@/lib/server-api";

/**
 * Every /dashboard/* page assumes an authenticated session, but before
 * this layout existed that assumption was only enforced ad hoc — e.g.
 * /dashboard/menu treated a 401 from GET /api/menu/categories the same
 * as "no restaurant yet" and showed "Set up your restaurant first"
 * instead of sending an expired/missing session back to /login. A
 * layout wraps every nested route automatically, so checking once here
 * closes that gap platform-wide instead of per-page.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const result = await serverFetch<{ user: unknown }>("/api/auth/me");
  if (!result.ok) {
    redirect("/login");
  }
  return <>{children}</>;
}
