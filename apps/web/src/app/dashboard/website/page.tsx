import Link from "next/link";
import { DashboardNav } from "@/components/dashboard-nav";
import type { GenerationJob, SiteVersion, WebsiteScore, WebsiteSite } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { GenerateButton } from "./generate-button";

export default async function WebsiteHubPage() {
  const siteResult = await serverFetch<{ site: WebsiteSite }>("/api/sites/me");

  if (!siteResult.ok) {
    return (
      <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <DashboardNav />
          <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
            <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Website</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              You haven&apos;t generated a website yet. One click builds three complete design variations from your
              menu and restaurant profile — pick the one you like, then publish it.
            </p>
            <GenerateButton mode="create" />
          </div>
        </div>
      </div>
    );
  }

  const { site } = siteResult.data;
  const [jobResult, versionsResult] = await Promise.all([
    serverFetch<{ job: GenerationJob | null }>(`/api/sites/${site.id}/generation`),
    serverFetch<{ versions: SiteVersion[] }>(`/api/sites/${site.id}/versions`),
  ]);

  const job = jobResult.ok ? jobResult.data.job : null;
  const versions = versionsResult.ok ? versionsResult.data.versions : [];
  const draft = versions.find((v) => v.status === "DRAFT");
  const published = versions.find((v) => v.id === site.publishedVersionId);
  const scoreTarget = draft ?? published;
  const scoreResult = scoreTarget
    ? await serverFetch<{ score: WebsiteScore | null }>(`/api/sites/${site.id}/versions/${scoreTarget.id}/score`)
    : null;
  const latestScore = scoreResult?.ok ? scoreResult.data.score : null;

  const isGenerating = job && (job.status === "PENDING" || job.status === "RUNNING");

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <DashboardNav />

        <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Website</h1>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {site.status}
            </span>
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Slug: <span className="font-mono">{site.slug}</span>
            {site.status === "PUBLISHED" && (
              <>
                {" · "}
                <span className="font-mono">{site.slug}.sites.ordervora.example</span>
              </>
            )}
          </p>

          {latestScore && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Website Score: <span className="font-semibold text-black dark:text-zinc-50">{latestScore.overall}</span>/100
            </p>
          )}

          {isGenerating && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Generating your three design variations ({job.stage.toLowerCase().replace(/_/g, " ")})…
            </p>
          )}

          {job?.status === "FAILED" && (
            <p className="text-sm text-red-600">Last generation failed: {job.error}</p>
          )}

          <div className="flex flex-wrap gap-3">
            <GenerateButton siteId={site.id} mode={versions.length > 0 ? "regenerate" : "create"} />
            {versions.some((v) => v.status === "VARIATION") && (
              <Link
                href="/dashboard/website/variations"
                className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
              >
                View variations
              </Link>
            )}
            {draft && (
              <>
                <Link
                  href="/dashboard/website/editor"
                  className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
                >
                  Editor
                </Link>
                <Link
                  href="/dashboard/website/score"
                  className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
                >
                  Score
                </Link>
                <Link
                  href="/dashboard/website/publish"
                  className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
                >
                  Publish &amp; Domains
                </Link>
              </>
            )}
            <Link
              href="/dashboard/website/messages"
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
            >
              Messages
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
