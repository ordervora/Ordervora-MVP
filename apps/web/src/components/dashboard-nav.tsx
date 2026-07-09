"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const MOBILE_ITEMS = [
  ["Overview", "/dashboard", "⌂"],
  ["Orders", "/dashboard/orders", "▤"],
  ["Menu", "/dashboard/menu", "▦"],
  ["AI", "/dashboard/builder", "✦"],
  ["More", "/dashboard/restaurant", "•••"],
] as const;

const DESKTOP_ITEMS = [
  ["Overview", "/dashboard"],
  ["Launch", "/dashboard/launch"],
  ["Orders", "/dashboard/orders"],
  ["Menu", "/dashboard/menu"],
  ["Import", "/dashboard/import"],
  ["Website", "/dashboard/website"],
  ["Analytics", "/dashboard/analytics"],
  ["Restaurant", "/dashboard/restaurant"],
  ["Profile", "/dashboard/profile"],
] as const;

export function DashboardNav() {
  const pathname = usePathname();
  return (
    <>
      <nav className="hidden items-center gap-2 overflow-x-auto rounded-2xl border border-[#E7DDCF] bg-white/90 p-2 text-sm font-semibold shadow-sm lg:flex">
        {DESKTOP_ITEMS.map(([label, href]) => {
          const active = pathname === href;
          return (
            <Link key={href} href={href} className={`whitespace-nowrap rounded-xl px-3 py-2 transition ${active ? "bg-[#171512] text-white" : "text-[#756B5D] hover:bg-[#F7F0E5] hover:text-[#171512]"}`}>
              {label}
            </Link>
          );
        })}
      </nav>

      <nav className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[#E7DDCF] bg-white/96 px-1 pb-[max(8px,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl lg:hidden">
        {MOBILE_ITEMS.map(([label, href, icon]) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold ${active ? "text-[#A9681F]" : "text-[#756B5D]"}`}>
              <span className="flex h-6 items-center justify-center text-lg leading-none" aria-hidden="true">{icon}</span>
              <span className="truncate">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
