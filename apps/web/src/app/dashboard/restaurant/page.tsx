import { DashboardNav } from "@/components/dashboard-nav";
import type { HoursRowInput, Restaurant } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { HoursEditor } from "./hours-editor";
import { RestaurantForm } from "./restaurant-form";

export default async function RestaurantPage() {
  const result = await serverFetch<{ restaurant: Restaurant }>("/api/restaurants/me");
  const restaurant = result.ok ? result.data.restaurant : null;

  const hoursResult = restaurant ? await serverFetch<{ hours: HoursRowInput[] }>("/api/restaurants/me/hours") : null;
  const initialHours = hoursResult?.ok ? hoursResult.data.hours : [];

  return (
    <div className="flex min-h-screen w-full flex-1 flex-col items-center gap-6 overflow-x-hidden bg-zinc-50 px-4 pb-28 pt-5 dark:bg-black sm:px-6 lg:p-10">
      <div className="flex w-full max-w-lg flex-col gap-4">
        <DashboardNav />
        <RestaurantForm restaurant={restaurant} />
        {restaurant && <HoursEditor initialHours={initialHours} />}
      </div>
    </div>
  );
}
