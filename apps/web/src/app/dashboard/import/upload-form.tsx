"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createImportJob, type ImportSourceType } from "@/lib/api";

type Source = {
  id: string;
  label: string;
  value: ImportSourceType;
  inputKind: "file" | "url";
  accept?: string;
};

const SOURCES: Source[] = [
  { id: "image", label: "Photo", value: "IMAGE", inputKind: "file", accept: "image/png,image/jpeg,image/webp,image/gif" },
  { id: "pdf", label: "PDF", value: "PDF", inputKind: "file", accept: "application/pdf" },
  { id: "csv", label: "Spreadsheet", value: "CSV", inputKind: "file", accept: ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { id: "website", label: "Website", value: "WEBSITE", inputKind: "url" },
  { id: "maps", label: "Google Maps", value: "GOOGLE_MAPS", inputKind: "url" },
];

export function UploadForm() {
  const router = useRouter();
  const [sourceId, setSourceId] = useState("image");
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const selected = SOURCES.find((source) => source.id === sourceId) ?? SOURCES[0];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (selected.inputKind === "file" && !file) {
      setError("Choose a file to upload");
      return;
    }
    if (selected.inputKind === "url" && !sourceUrl.trim()) {
      setError("Enter a URL to import from");
      return;
    }
    setSubmitting(true);
    try {
      await createImportJob(selected.value, selected.inputKind === "file" ? { file: file! } : { url: sourceUrl.trim() });
      setFile(null);
      setSourceUrl("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className="rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)] sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#F4E6D1] text-2xl font-bold text-[#9A5F17]">＋</div>
          <div className="min-w-0">
            <h2 className="text-xl font-bold">Import menu</h2>
            <p className="mt-1 text-sm leading-6 text-[#756B5D]">Choose one source. OrderVora handles the extraction and review flow.</p>
          </div>
        </div>

        <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
          {SOURCES.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => { setSourceId(source.id); setFile(null); setSourceUrl(""); setError(null); }}
              className={`shrink-0 rounded-full px-4 py-2.5 text-sm font-bold transition ${source.id === sourceId ? "bg-[#171512] text-white" : "bg-[#F7F0E5] text-[#756B5D]"}`}
            >
              {source.label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl border border-dashed border-[#CDBA9E] bg-[#FFFDF9] p-4 text-center sm:p-6">
          <h3 className="text-lg font-bold">{selected.inputKind === "url" ? "Paste your source link" : `Upload ${selected.label}`}</h3>
          <p className="mt-1 text-sm text-[#756B5D]">We will extract categories, products, prices, and descriptions.</p>

          {selected.inputKind === "file" ? (
            <label className="mt-4 flex cursor-pointer flex-col items-center rounded-2xl border border-[#E7DDCF] bg-white px-4 py-4 shadow-sm">
              <span className="text-sm font-bold text-[#171512]">{file ? file.name : "Choose a file"}</span>
              <span className="mt-1 text-xs text-[#8A7D6C]">{selected.label}</span>
              <input type="file" accept={selected.accept} onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="sr-only" />
            </label>
          ) : (
            <input
              type="text"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder={selected.value === "GOOGLE_MAPS" ? "https://maps.app.goo.gl/..." : "https://example.com/menu"}
              className="mt-4 min-h-14 w-full rounded-2xl border border-[#E7DDCF] bg-white px-4 text-base text-[#171512] outline-none placeholder:text-[#A3988A] focus:border-[#B97824]"
            />
          )}

          {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="mt-4 min-h-12 w-full rounded-2xl bg-[#171512] px-6 text-sm font-bold text-white shadow-lg shadow-black/10 disabled:opacity-50 sm:w-auto">
            {submitting ? "Starting AI import…" : "Start import"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-[#E7DDCF] bg-white p-5 shadow-[0_12px_36px_rgba(48,39,27,0.04)] sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">CONNECT EXISTING SYSTEMS</p>
          <h2 className="mt-1 text-xl font-bold">POS connections</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {["Clover", "Toast"].map((name) => (
            <article key={name} className="rounded-2xl border border-[#E7DDCF] bg-[#FFFDF9] p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F4E6D1] font-bold text-[#9A5F17]">{name[0]}</div>
              <h3 className="mt-3 font-bold">{name}</h3>
              <p className="mt-1 text-xs text-[#756B5D]">Connect POS</p>
              <span className="mt-3 inline-flex rounded-full bg-[#F4E6D1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8A571C]">Coming soon</span>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#E7DDCF] bg-white p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">DELIVERY PLATFORMS</p>
            <p className="mt-1 text-sm text-[#756B5D]">DoorDash · Uber Eats · Grubhub</p>
          </div>
          <span className="shrink-0 rounded-full bg-[#F7F0E5] px-3 py-1.5 text-xs font-bold text-[#756B5D]">Coming soon</span>
        </div>
      </section>
    </form>
  );
}
