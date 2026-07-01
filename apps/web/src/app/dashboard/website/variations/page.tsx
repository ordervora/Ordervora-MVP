import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import type { GenerationJob, SiteVersion, WebsiteSite } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { GenerationProgress } from "./generation-progress";
import { SelectButton } from "./select-button";

const FAMILY_LABEL: Record<string, string> = { LUXURY: "Luxury", MODERN: "Modern", MINIMAL: "Minimal" };

export default async function VariationsPage() {
  const siteResult = await serverFetch<{ site: WebsiteSite }>("/api/sites/me");
  if (!siteResult.ok) {
    notFound();
  }
  const { site } = siteResult.data;

  const jobResult = await serverFetch<{ job: GenerationJob | null }>(`/api/sites/${site.id}/generation`);
  const job = jobResult.ok ? jobResult.data.job : null;

  const variationsResult = await serverFetch<{ variations: SiteVersion[] }>(`/api/sites/${site.id}/variations`);
  const variations = variationsResult.ok ? variationsResult.data.variations : [];

  const bestScore = Math.max(0, ...variations.map((v) => v.scores?.[0]?.overall ?? 0));

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-5xl flex-col gap-6">
        <DashboardNav />
        <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Choose your website</h1>

        {job && (job.status === "PENDING" || job.status === "RUNNING" || job.status === "FAILED") && (
          <GenerationProgress siteId={site.id} initialJob={job} />
        )}

        {variations.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {variations.map((variation) => {
              const score = variation.scores?.[0];
              const isBest = score !== undefined && score.overall === bestScore && bestScore > 0;
              const definition = variation.definition;
              return (
                <div
                  key={variation.id}
                  className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-5 dark:border-white/[.145] dark:bg-zinc-950"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-black dark:text-zinc-50">
                      {FAMILY_LABEL[variation.styleFamily ?? ""] ?? variation.styleFamily}
                    </h2>
                    {isBest && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                        Best match
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-zinc-600 dark:text-zinc-400">&ldquo;{definition.tagline}&rdquo;</p>

                  {score && (
                    <div className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
                      <p className="text-sm font-medium text-black dark:text-zinc-50">Score: {score.overall}/100</p>
                      <p>
                        SEO {score.seo} · Perf {score.performance} · A11y {score.accessibility} · Brand {score.brandConsistency} · Conv{" "}
                        {score.conversion}
                      </p>
                    </div>
                  )}

                  {definition.designRationale && definition.designRationale.length > 0 && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-500">
                      Why this design: {definition.designRationale.join("; ")}
                    </p>
                  )}

                  <div className="mt-auto flex flex-col gap-2">
                    <Link
                      href={`/dashboard/website/variations/${variation.id}`}
                      className="rounded-full border border-black/[.08] px-4 py-2 text-center text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
                    >
                      Open full preview
                    </Link>
                    <SelectButton siteId={site.id} versionId={variation.id} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {variations.length === 0 && !job && (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">No variations yet — generate a website from the Website hub.</p>
        )}
      </div>
    </div>
  );
}
