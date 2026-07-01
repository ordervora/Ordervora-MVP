import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import type { SiteVersion, WebsiteSite } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";

function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * A structured, data-driven preview — not a rendered public site. Sprint 06
 * built the AI Generator + SiteDefinition data pipeline; the themed public
 * component library / Layout Engine that would actually render this JSON
 * as styled HTML (§15, §25) is out of scope this sprint (see Known
 * Limitations). This view lets an owner review exactly what was generated.
 */
export default async function VariationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const siteResult = await serverFetch<{ site: WebsiteSite }>("/api/sites/me");
  if (!siteResult.ok) notFound();
  const { site } = siteResult.data;

  const versionResult = await serverFetch<{ version: SiteVersion }>(`/api/sites/${site.id}/versions/${id}`);
  if (!versionResult.ok) notFound();
  const { version } = versionResult.data;
  const definition = version.definition;

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <DashboardNav />
        <div className="flex flex-col gap-6 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <div>
            <h1 className="text-lg font-semibold text-black dark:text-zinc-50">{definition.restaurantName}</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {version.styleFamily} · {definition.cuisine} · {definition.businessType}
            </p>
            <p className="mt-2 text-sm italic text-zinc-600 dark:text-zinc-400">&ldquo;{definition.tagline}&rdquo;</p>
          </div>

          <div className="flex gap-2 text-xs text-zinc-500 dark:text-zinc-500">
            <span
              className="h-5 w-5 rounded-full border border-black/[.08] dark:border-white/[.145]"
              style={{ backgroundColor: definition.colorSeed }}
            />
            <span>
              {definition.typography.display} / {definition.typography.body}
            </span>
          </div>

          {definition.pages.map((page) => (
            <div key={page.slug} className="flex flex-col gap-2 border-t border-black/[.08] pt-4 dark:border-white/[.145]">
              <h2 className="text-sm font-semibold text-black dark:text-zinc-50">{page.title}</h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-500">{page.metaDescription}</p>
              <ul className="flex flex-col gap-2 pl-4 text-sm text-zinc-700 dark:text-zinc-300">
                {page.sections.map((section, i) => (
                  <li key={`${section.type}-${i}`}>
                    <span className="font-mono text-xs uppercase text-zinc-500">{section.type}</span>
                    {typeof section.props.headline === "string" && <span> — {section.props.headline}</span>}
                    {typeof section.props.story === "string" && <span> — {section.props.story}</span>}
                    {Array.isArray(section.props.categories) && (
                      <ul className="pl-4">
                        {(section.props.categories as { name: string; items: { name: string; priceCents: number }[] }[]).map((category) => (
                          <li key={category.name}>
                            {category.name}:{" "}
                            {category.items.map((item) => `${item.name} ($${formatPrice(item.priceCents)})`).join(", ")}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
