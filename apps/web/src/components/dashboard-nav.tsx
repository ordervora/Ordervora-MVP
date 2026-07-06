import Link from "next/link";

export function DashboardNav() {
  return (
    <nav className="flex flex-wrap gap-4 text-sm font-medium text-zinc-600 dark:text-zinc-400">
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
      <Link href="/dashboard/website" className="hover:text-black dark:hover:text-zinc-50">
        Website
      </Link>
      <Link href="/dashboard/orders" className="hover:text-black dark:hover:text-zinc-50">
        Orders
      </Link>
      <Link href="/dashboard/payments" className="hover:text-black dark:hover:text-zinc-50">
        Payments
      </Link>
      <Link href="/dashboard/delivery" className="hover:text-black dark:hover:text-zinc-50">
        Delivery
      </Link>
      <Link href="/dashboard/kitchen-capacity" className="hover:text-black dark:hover:text-zinc-50">
        Kitchen capacity
      </Link>
      <Link href="/dashboard/pos" className="hover:text-black dark:hover:text-zinc-50">
        POS
      </Link>
      <Link href="/dashboard/tables" className="hover:text-black dark:hover:text-zinc-50">
        Tables
      </Link>
      <Link href="/dashboard/coupons" className="hover:text-black dark:hover:text-zinc-50">
        Coupons
      </Link>
      <Link href="/dashboard/loyalty" className="hover:text-black dark:hover:text-zinc-50">
        Loyalty
      </Link>
      <Link href="/dashboard/analytics" className="hover:text-black dark:hover:text-zinc-50">
        Analytics
      </Link>
      <Link href="/dashboard/staff" className="hover:text-black dark:hover:text-zinc-50">
        Staff
      </Link>
      <Link href="/dashboard/referrals" className="hover:text-black dark:hover:text-zinc-50">
        Referrals
      </Link>
      <Link href="/dashboard/kitchen" className="hover:text-black dark:hover:text-zinc-50">
        Kitchen queue
      </Link>
      <Link href="/dashboard/driver" className="hover:text-black dark:hover:text-zinc-50">
        Driver
      </Link>
    </nav>
  );
}
