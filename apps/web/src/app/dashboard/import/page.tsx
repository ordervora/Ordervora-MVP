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

function ImportProgress({ job }: { job: ImportJob }) {
  const overall = progressForStatus(job.status);
  const stages = [
    ["Upload complete", overall >= 10 ? 100 : 0],
    ["OCR reading menu", overall >= 25 ? 100 : Math.min(100, overall * 3)],
    ["Detect categories", overall >= 45 ? 100 : Math.max(0, (overall - 25) * 5)],
    ["Detect products", overall >= 65 ? 100 : Math.max(0, (overall - 45) * 5)],
    ["Extract prices", overall >= 78 ? 100 : Math.max(0, (overall - 65) * 7)],
    ["Generate descriptions", overall >= 88 ? 100 : Math.max(0, (overall - 78) * 10)],
    ["Build menu structure", overall >= 100 ? 100 : Math.max(0, (overall - 88) * 8)],
  ] as const;

  return (
    <section className="rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)] sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">AI IMPORT PROGRESS</p>
          <h2 className="mt-1 text-2xl font-bold">OrderVora is building your menu</h2>
        </div>
        <span className="text-2xl font-bold text-[#B97824]">{overall}%</span>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-[#EEE5D9]">
        <div className="h-full rounded-full bg-[#B97824] transition-all" style={{ width: `${overall}%` }} />
      </div>
      <p className="mt-2 text-xs text-[#8A7D6C]">Estimated progress based on the current backend job status.</p>

      <div className="mt-6 space-y-5">
        {stages.map(([label, value]) => (
          <div key={label}>
            <div className="mb-2 flex items-center justify-between gap-3 text-sm">
              <span className="font-semibold text-[#2A251F]">{label}</span>
              <span className="font-bold text-[#9A6A2F]">{Math.round(value)}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#EEE5D9]">
              <div className={`h-full rounded-full ${value >= 100 ? "bg-emerald-600" : value > 0 ? "bg-amber-500" : "bg-transparent"}`} style={{ width: `${Math.round(value)}%` }} />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-[#171512] p-4 text-white">
        <p className="text-sm font-bold text-[#E1B56F]">Currently working…</p>
        <p className="mt-1 text-sm leading-6 text-[#E9E0D4]">
          {job.status === "PENDING" ? "Preparing the source for AI analysis." : job.status === "PROCESSING" ? "Reading menu content, detecting categories, products, and prices." : job.status === "AWAITING_REVIEW" ? "Extraction is complete. Your menu is ready for review." : "Import job finished."}
        </p>
      </div>
    </section>
  );
}

export default async function ImportPage() {
  const result = await serverFetch<{ jobs: ImportJob[] }>("/api/imports");
  const jobs = result.ok ? result.data.jobs : [];
  const activeJob = jobs.find((job) => job.status === "PENDING" || job.status === "PROCESSING" || job.status === "AWAITING_REVIEW");

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
        {activeJob && <ImportProgress job={activeJob} />}

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
