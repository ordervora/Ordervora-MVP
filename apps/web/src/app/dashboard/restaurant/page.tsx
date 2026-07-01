import { DashboardNav } from "@/components/dashboard-nav";
import type { Restaurant } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { RestaurantForm } from "./restaurant-form";

export default async function RestaurantPage() {
  const result = await serverFetch<{ restaurant: Restaurant }>("/api/restaurants/me");
  const restaurant = result.ok ? result.data.restaurant : null;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <DashboardNav />
        <RestaurantForm restaurant={restaurant} />
      </div>
    </div>
  );
}
