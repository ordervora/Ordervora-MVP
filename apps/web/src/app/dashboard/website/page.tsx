import { PageShell } from "@/components/ui";
import type { Restaurant, SiteVersion, WebsiteSite } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { AiBrandConcepts } from "./studio/ai-brand-concepts";
import { AiSuggestions } from "./studio/ai-suggestions";
import { CurrentWebsiteCard } from "./studio/current-website-card";
import { PublishingHistory } from "./studio/publishing-history";
import { QuickActions } from "./studio/quick-actions";
import { slugify } from "./studio/slugify";
import { WebsiteAnalytics } from "./studio/website-analytics";
import { WebsiteHealthCard } from "./studio/website-health-card";
import { WebsiteStatusCard } from "./studio/website-status-card";

export default async function WebsiteHubPage() {
  const restaurantResult = await serverFetch<{ restaurant: Restaurant }>("/api/restaurants/me");
  const restaurantName = restaurantResult.ok ? restaurantResult.data.restaurant.name : "your business";

  const siteResult = await serverFetch<{ site: WebsiteSite; url: string }>("/api/sites/me");
  const site = siteResult.ok ? siteResult.data.site : null;
  const domain = siteResult.ok ? siteResult.data.url : `https://${slugify(restaurantName)}.ordervora.app`;

  const releases = site
    ? await serverFetch<{ releases: SiteVersion[] }>(`/api/sites/${site.id}/releases`).then((r) => (r.ok ? r.data.releases : []))
    : [];

  return (
    <PageShell maxWidth="5xl">
      <div className="flex flex-col gap-5">
        <WebsiteStatusCard restaurantName={restaurantName} status={site?.status ?? null} />
        <CurrentWebsiteCard domain={domain} status={site?.status ?? null} />
        <WebsiteHealthCard />
        <AiBrandConcepts />
        <QuickActions domain={domain} siteId={site?.id ?? null} alreadyPublished={site?.status === "PUBLISHED"} />
        <PublishingHistory releases={releases} currentVersionId={site?.publishedVersionId ?? null} />
        <AiSuggestions />
        <WebsiteAnalytics />
      </div>
    </PageShell>
  );
}
