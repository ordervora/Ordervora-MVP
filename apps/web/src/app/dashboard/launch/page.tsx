"use client";

import { useEffect, useState } from "react";
import { getRestaurant, type Restaurant } from "@/lib/api";
import { LaunchCenter } from "./launch-center";

export default function LaunchCenterPage() {
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

  return <LaunchCenter restaurant={restaurant} />;
}
