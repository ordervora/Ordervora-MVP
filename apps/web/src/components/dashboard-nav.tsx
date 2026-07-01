import Link from "next/link";

export function DashboardNav() {
  return (
    <nav className="flex gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
      <Link href="/dashboard" className="hover:text-black dark:hover:text-zinc-50">
        Home
      </Link>
      <Link href="/dashboard/restaurant" className="hover:text-black dark:hover:text-zinc-50">
        Restaurant
      </Link>
      <Link href="/dashboard/menu" className="hover:text-black dark:hover:text-zinc-50">
        Menu
      </Link>
      <Link href="/dashboard/import" className="hover:text-black dark:hover:text-zinc-50">
        Import
      </Link>
    </nav>
  );
}
