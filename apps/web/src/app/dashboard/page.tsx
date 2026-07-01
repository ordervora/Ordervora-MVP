import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { PublicUser } from "@/lib/api";
import { LogoutButton } from "./logout-button";

const apiUrl = process.env.API_URL ?? "http://localhost:4000";

async function getCurrentUser(): Promise<PublicUser | null> {
  const cookieStore = await cookies();
  const res = await fetch(`${apiUrl}/api/auth/me`, {
    headers: { cookie: cookieStore.toString() },
    cache: "no-store",
  });

  if (!res.ok) {
    return null;
  }

  const { user } = (await res.json()) as { user: PublicUser };
  return user;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-black">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-8 dark:border-white/[.145] dark:bg-zinc-950">
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
