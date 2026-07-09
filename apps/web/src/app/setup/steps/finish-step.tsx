"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The wizard's DONE state. Sprint 18 Part 3 (Launch Center) will replace
 * this destination with a dedicated /dashboard/launch page; until then,
 * finishing setup goes straight to the normal dashboard.
 */
export function FinishStep() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">ALL SET</p>
      <h1 className="text-2xl font-bold tracking-tight">Your business is ready!</h1>
      <p className="text-sm text-[#756B5D]">Taking you to your dashboard…</p>
    </div>
  );
}
