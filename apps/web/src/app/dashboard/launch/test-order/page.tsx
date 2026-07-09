"use client";

import { useEffect, useState } from "react";
import { getRestaurant, type Restaurant } from "@/lib/api";
import { TestOrderFlow } from "../test-order-flow";

export default function TestOrderPage() {
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getRestaurant()
      .then(({ restaurant: loaded }) => {
        if (!cancelled) setRestaurant(loaded);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !restaurant) {
    return (
      <main className="flex min-h-screen w-full items-center justify-center bg-[#F7F0E5] text-sm text-[#756B5D]">
        Loading…
      </main>
    );
  }

  return <TestOrderFlow restaurant={restaurant} />;
}
