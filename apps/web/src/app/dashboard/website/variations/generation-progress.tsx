"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getGenerationStatus, regenerateVariations, type GenerationJob } from "@/lib/api";

const POLL_INTERVAL_MS = 2500;

export function GenerationProgress({ siteId, initialJob }: { siteId: string; initialJob: GenerationJob }) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (job.status !== "PENDING" && job.status !== "RUNNING") return;

    const interval = setInterval(async () => {
      try {
        const { job: latest } = await getGenerationStatus(siteId);
        if (!latest) return;
        setJob(latest);
        if (latest.status === "COMPLETED") {
          router.refresh();
        }
      } catch {
        // Transient fetch failure — keep polling on the next tick.
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [job.status, router, siteId]);

  async function handleRetry() {
    setRetrying(true);
    try {
      const { job: newJob } = await regenerateVariations(siteId);
      setJob(newJob);
    } finally {
      setRetrying(false);
    }
  }

  if (job.status === "FAILED") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
        <p className="text-sm text-red-600">Generation failed: {job.error ?? "Unknown error"}</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={retrying}
          className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
        >
          {retrying ? "Retrying…" : "Try again"}
        </button>
      </div>
    );
  }

  const STAGE_LABELS: Record<string, string> = {
    INGEST: "Reading your menu and profile",
    BRAND_ANALYSIS: "Analyzing your brand",
    THEME_SELECTION: "Selecting themes for each style",
    CONTENT_GENERATION: "Writing your content",
    ASSEMBLY: "Assembling three designs",
    ASSETS: "Preparing images",
    SCORING: "Scoring each design",
    FINALIZE: "Finishing up",
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
      <h2 className="text-base font-semibold text-black dark:text-zinc-50">Generating your website</h2>
      <p className="text-sm text-zinc-600 dark:text-zinc-400">{STAGE_LABELS[job.stage] ?? job.stage}…</p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
        <div className="h-full w-1/2 animate-pulse rounded-full bg-foreground" />
      </div>
    </div>
  );
}
