import Link from "next/link";
import { DashboardNav } from "@/components/dashboard-nav";
import type { ImportJob } from "@/lib/api";
import { serverFetch } from "@/lib/server-api";
import { RerunButton } from "./rerun-button";
import { UploadForm } from "./upload-form";

function progressForStatus(status: ImportJob["status"]) {
  switch (status) {
    case "PENDING": return 10;
    case "PROCESSING": return 60;
    case "AWAITING_REVIEW": return 90;
    case "APPROVED": return 100;
    case "REJECTED": return 100;
    case "FAILED": return 100;
  }
}

function statusTone(status: ImportJob["status"]) {
  if (status === "FAILED") return "bg-red-50 text-red-700";
  if (status === "PROCESSING" || status === "PENDING") return "bg-amber-50 text-amber-700";
  if (status === "AWAITING_REVIEW") return "bg-blue-50 text-blue-700";
  return "bg-emerald-50 text-emerald-700";
}

export default async function ImportPage() {
  const result = await serverFetch<{ jobs: ImportJob[] }>("/api/imports");
  const jobs = result.ok ? result.data.jobs : [];

  return (
    <div className="min-h-screen bg-[#F7F0E5] p-4 text-[#171512] sm:p-6 lg:p-10">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <DashboardNav />
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">AI IMPORT HUB</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Bring your business from anywhere.</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#756B5D]">Upload a menu, paste a link, or connect a supported source. OrderVora turns it into structured menu data ready for review.</p>
        </header>

        <UploadForm />

        <section className="rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)] sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Import history</h2>
            <span className="rounded-full bg-[#F7F0E5] px-3 py-1 text-xs font-semibold text-[#756B5D]">{jobs.length} jobs</span>
          </div>

          {jobs.length === 0 ? (
            <p className="mt-4 text-sm text-[#756B5D]">No imports yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-[#EEE5D9]">
              {jobs.map((job) => {
                const progress = progressForStatus(job.status);
                return (
                  <li key={job.id} className="py-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-semibold">{job.sourceType}</p>
                        <span className={`mt-1 inline-flex rounded-full px-3 py-1 text-xs font-bold ${statusTone(job.status)}`}>{job.status.replaceAll("_", " ")}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {job.status === "AWAITING_REVIEW" && <Link href={`/dashboard/import/${job.id}`} className="rounded-xl bg-[#171512] px-4 py-2 font-semibold text-white">Review</Link>}
                        {job.status === "FAILED" && job.errorMessage && <span className="max-w-sm text-xs text-red-600">{job.errorMessage}</span>}
                        {(job.status === "FAILED" || job.status === "APPROVED" || job.status === "REJECTED") && <RerunButton jobId={job.id} />}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#EEE5D9]">
                        <div className="h-full rounded-full bg-[#B97824]" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-bold text-[#9A6A2F]">{progress}%</span>
                    </div>
                    {(job.status === "PROCESSING" || job.status === "PENDING") && <p className="mt-2 text-xs text-[#8A7D6C]">Estimated progress based on the current import status.</p>}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
