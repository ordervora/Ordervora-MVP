import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import type { SiteDomain, SiteVersion, WebsiteSite } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { DomainForm, DomainRow } from "./domain-form";
import { PublishButton, RollbackButton, UnpublishButton } from "./publish-actions";

export default async function PublishPage() {
  const siteResult = await serverFetch<{ site: WebsiteSite }>("/api/sites/me");
  if (!siteResult.ok) notFound();
  const { site } = siteResult.data;

  const [versionsResult, releasesResult, domainsResult] = await Promise.all([
    serverFetch<{ versions: SiteVersion[] }>(`/api/sites/${site.id}/versions`),
    serverFetch<{ releases: SiteVersion[] }>(`/api/sites/${site.id}/releases`),
    serverFetch<{ domains: SiteDomain[] }>(`/api/sites/${site.id}/domains`),
  ]);

  const versions = versionsResult.ok ? versionsResult.data.versions : [];
  const draft = versions.find((v) => v.status === "DRAFT");
  const releases = releasesResult.ok ? releasesResult.data.releases : [];
  const domains = domainsResult.ok ? domainsResult.data.domains : [];

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <DashboardNav />

        <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Publish</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Status: <span className="font-mono">{site.status}</span>
          </p>
          {!draft ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              No active draft to publish —{" "}
              <Link href="/dashboard/website/variations" className="underline">
                choose a variation
              </Link>{" "}
              first.
            </p>
          ) : (
            <div className="flex gap-3">
              <PublishButton siteId={site.id} />
              {site.status === "PUBLISHED" && <UnpublishButton siteId={site.id} />}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Releases</h2>
          {releases.length === 0 ? (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No releases yet.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {releases.map((release) => (
                <li key={release.id} className="flex items-center justify-between rounded border border-black/[.08] p-3 text-sm dark:border-white/[.145]">
                  <span>
                    v{release.versionNo} — {release.publishedAt ? new Date(release.publishedAt).toLocaleString() : "unknown"}
                    {release.id === site.publishedVersionId && <span className="ml-2 text-xs text-emerald-600">(live)</span>}
                  </span>
                  {release.id !== site.publishedVersionId && <RollbackButton siteId={site.id} versionId={release.id} />}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Domains</h2>
          <DomainForm siteId={site.id} />
          {domains.length > 0 && (
            <ul className="flex flex-col gap-2">
              {domains.map((domain) => (
                <DomainRow key={domain.id} siteId={site.id} domain={domain} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
