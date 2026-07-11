import { PageShell } from "@/components/ui";
import type { Restaurant } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { AiBrandConcepts } from "./studio/ai-brand-concepts";
import { AiSuggestions } from "./studio/ai-suggestions";
import { CurrentWebsiteCard } from "./studio/current-website-card";
import { QuickActions } from "./studio/quick-actions";
import { slugify } from "./studio/slugify";
import { WebsiteAnalytics } from "./studio/website-analytics";
import { WebsiteHealthCard } from "./studio/website-health-card";
import { WebsiteStatusCard } from "./studio/website-status-card";

export default async function WebsiteHubPage() {
  const restaurantResult = await serverFetch<{ restaurant: Restaurant }>("/api/restaurants/me");
  const restaurantName = restaurantResult.ok ? restaurantResult.data.restaurant.name : "your business";
  const domain = `https://${slugify(restaurantName)}.ordervora.app`;

  return (
    <PageShell maxWidth="5xl">
      <div className="flex flex-col gap-5">
        <WebsiteStatusCard restaurantName={restaurantName} />
        <CurrentWebsiteCard domain={domain} />
        <WebsiteHealthCard />
        <AiBrandConcepts />
        <QuickActions domain={domain} />
        <AiSuggestions />
        <WebsiteAnalytics />
      </div>
    </PageShell>
  );
}
