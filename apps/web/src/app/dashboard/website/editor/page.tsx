import Link from "next/link";
import { notFound } from "next/navigation";
import { DashboardNav } from "@/components/dashboard-nav";
import type { SiteVersion, WebsiteSite } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { DraftForm } from "./draft-form";

export default async function EditorPage() {
  const siteResult = await serverFetch<{ site: WebsiteSite }>("/api/sites/me");
  if (!siteResult.ok) notFound();
  const { site } = siteResult.data;

  const versionsResult = await serverFetch<{ versions: SiteVersion[] }>(`/api/sites/${site.id}/versions`);
  const versions = versionsResult.ok ? versionsResult.data.versions : [];
  const draft = versions.find((v) => v.status === "DRAFT");

  if (!draft) {
    return (
      <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
        <div className="flex w-full max-w-2xl flex-col gap-6">
          <DashboardNav />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            No active draft yet — select a variation from the{" "}
            <Link href="/dashboard/website/variations" className="underline">
              Variation Picker
            </Link>{" "}
            first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <DashboardNav />
        <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Editor</h1>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">{draft.styleFamily}</span>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Constrained editing only — theme, palette, and copy. For a full-page layout builder see Known Limitations.
          </p>
          <DraftForm siteId={site.id} tagline={draft.definition.tagline} colorSeed={draft.definition.colorSeed} />
          <div className="flex gap-3 border-t border-black/[.08] pt-4 dark:border-white/[.145]">
            <Link
              href={`/dashboard/website/variations/${draft.id}`}
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
            >
              Preview
            </Link>
            <Link
              href="/dashboard/website/score"
              className="rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-black dark:border-white/[.145] dark:text-zinc-50"
            >
              Score
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
