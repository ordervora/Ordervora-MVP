import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell } from "@/components/ui";
import type { SiteVersion, WebsiteSite } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { DraftForm } from "./draft-form";
import { SectionEditor } from "./section-editor";

export default async function EditorPage() {
  const siteResult = await serverFetch<{ site: WebsiteSite }>("/api/sites/me");
  if (!siteResult.ok) notFound();
  const { site } = siteResult.data;

  const versionsResult = await serverFetch<{ versions: SiteVersion[] }>(`/api/sites/${site.id}/versions`);
  const versions = versionsResult.ok ? versionsResult.data.versions : [];
  const draft = versions.find((v) => v.status === "DRAFT");

  if (!draft) {
    return (
      <PageShell maxWidth="2xl">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          No active draft yet — select a variation from the{" "}
          <Link href="/dashboard/website/variations" className="underline">
            Variation Picker
          </Link>{" "}
          first.
        </p>
      </PageShell>
    );
  }

  return (
    <PageShell maxWidth="2xl">
        <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-black dark:text-zinc-50">Editor</h1>
            <span className="text-xs text-zinc-500 dark:text-zinc-500">{draft.styleFamily}</span>
          </div>
          <DraftForm siteId={site.id} tagline={draft.definition.tagline} colorSeed={draft.definition.colorSeed} />
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Homepage sections</h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-500">
            Edit each section&apos;s text and reorder them — changes save automatically to your draft.
          </p>
          <SectionEditor siteId={site.id} pages={draft.definition.pages} pageSlug="/" />
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
    </PageShell>
  );
}
