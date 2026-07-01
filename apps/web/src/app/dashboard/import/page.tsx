import Link from "next/link";
import { DashboardNav } from "@/components/dashboard-nav";
import type { ImportJob } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { UploadForm } from "./upload-form";

export default async function ImportPage() {
  const result = await serverFetch<{ jobs: ImportJob[] }>("/api/imports");
  const jobs = result.ok ? result.data.jobs : [];

  return (
    <div className="flex flex-1 flex-col items-center gap-6 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <DashboardNav />

        <UploadForm />

        <div className="rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950">
          <h2 className="mb-3 text-sm font-semibold text-black dark:text-zinc-50">Import history</h2>
          {jobs.length === 0 && (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">No imports yet.</p>
          )}
          <ul className="flex flex-col divide-y divide-black/[.08] dark:divide-white/[.145]">
            {jobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between py-2 text-sm">
                <span>
                  {job.sourceType} — <span className="font-mono">{job.status}</span>
                </span>
                {job.status === "AWAITING_REVIEW" && (
                  <Link href={`/dashboard/import/${job.id}`} className="font-medium text-zinc-950 dark:text-zinc-50">
                    Review
                  </Link>
                )}
                {job.status === "FAILED" && job.errorMessage && (
                  <span className="text-xs text-red-600">{job.errorMessage}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
