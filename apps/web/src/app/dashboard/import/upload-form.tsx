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
  icon: "photo" | "pdf" | "sheet" | "web" | "maps";
};

type PlatformIconName = "clover" | "toast" | "doordash" | "ubereats" | "grubhub";

const SOURCES: Source[] = [
  { id: "image", label: "Photo", value: "IMAGE", inputKind: "file", accept: "image/png,image/jpeg,image/webp,image/gif", icon: "photo" },
  { id: "pdf", label: "PDF", value: "PDF", inputKind: "file", accept: "application/pdf", icon: "pdf" },
  { id: "csv", label: "Spreadsheet", value: "CSV", inputKind: "file", accept: ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", icon: "sheet" },
  { id: "website", label: "Website", value: "WEBSITE", inputKind: "url", icon: "web" },
  { id: "maps", label: "Google Maps", value: "GOOGLE_MAPS", inputKind: "url", icon: "maps" },
];

function SourceIcon({ name }: { name: Source["icon"] }) {
  const common = "h-5 w-5";
  if (name === "photo") return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="9" cy="10" r="2"/><path d="m5 17 5-5 3 3 2-2 4 4"/></svg>;
  if (name === "pdf") return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/></svg>;
  if (name === "sheet") return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M4 9h16M9 9v12M15 9v12M4 15h16"/></svg>;
  if (name === "maps") return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9"><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>;
  return <svg viewBox="0 0 24 24" className={common} fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>;
}

function PlatformIcon({ name }: { name: PlatformIconName }) {
  const box = "flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F4E6D1] text-[#9A5F17]";
  if (name === "clover") {
    return <div className={box} aria-label="Clover icon"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><circle cx="8" cy="8" r="4"/><circle cx="16" cy="8" r="4"/><circle cx="8" cy="16" r="4"/><circle cx="16" cy="16" r="4"/></svg></div>;
  }
  if (name === "toast") {
    return <div className={box} aria-label="Toast icon"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9a6 6 0 0 1 12 0v9H6z"/><path d="M9 13h6"/></svg></div>;
  }
  if (name === "doordash") {
    return <div className={box} aria-label="DoorDash icon"><svg viewBox="0 0 24 24" className="h-6 w-6" fill="currentColor"><path d="M3 7h10.5c4.4 0 7.5 2.1 7.5 5s-3.1 5-7.5 5H9l3.2-3H16c1.8 0 3-.8 3-2s-1.2-2-3-2H3z"/></svg></div>;
  }
  if (name === "ubereats") {
    return <div className={box} aria-label="Uber Eats icon"><span className="text-[11px] font-black leading-none tracking-[-0.04em]">UBER<br/>EATS</span></div>;
  }
  return <div className={box} aria-label="Grubhub icon"><span className="text-lg font-black">G</span></div>;
}

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
            <p className="mt-1 text-sm leading-6 text-[#756B5D]">Choose one source. All options stay visible.</p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SOURCES.map((source) => {
            const active = source.id === sourceId;
            return (
              <button
                key={source.id}
                type="button"
                onClick={() => { setSourceId(source.id); setFile(null); setSourceUrl(""); setError(null); }}
                className={`flex min-h-[92px] flex-col items-start justify-between rounded-2xl border p-3 text-left transition ${active ? "border-[#B97824] bg-[#FFF8ED] shadow-[0_8px_24px_rgba(185,120,36,0.10)]" : "border-[#E7DDCF] bg-[#FFFDF9]"}`}
              >
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${active ? "bg-[#B97824] text-white" : "bg-[#F4E6D1] text-[#9A5F17]"}`}><SourceIcon name={source.icon}/></span>
                <span className="mt-3 text-sm font-bold text-[#171512]">{source.label}</span>
              </button>
            );
          })}
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
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-[#E7DDCF] bg-[#FFFDF9] p-4"><PlatformIcon name="clover"/><h3 className="mt-3 font-bold">Clover</h3><p className="mt-1 text-xs text-[#756B5D]">Connect POS</p><span className="mt-3 inline-flex rounded-full bg-[#F4E6D1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8A571C]">Coming soon</span></article>
          <article className="rounded-2xl border border-[#E7DDCF] bg-[#FFFDF9] p-4"><PlatformIcon name="toast"/><h3 className="mt-3 font-bold">Toast</h3><p className="mt-1 text-xs text-[#756B5D]">Connect POS</p><span className="mt-3 inline-flex rounded-full bg-[#F4E6D1] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8A571C]">Coming soon</span></article>
        </div>
      </section>

      <section className="rounded-3xl border border-[#E7DDCF] bg-white p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">DELIVERY PLATFORMS</p>
          <h2 className="mt-1 text-xl font-bold">Import from delivery apps</h2>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-[#E7DDCF] bg-[#FFFDF9] p-4"><PlatformIcon name="doordash"/><h3 className="mt-3 font-bold">DoorDash</h3><span className="mt-3 inline-flex rounded-full bg-[#F7F0E5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#756B5D]">Coming soon</span></article>
          <article className="rounded-2xl border border-[#E7DDCF] bg-[#FFFDF9] p-4"><PlatformIcon name="ubereats"/><h3 className="mt-3 font-bold">Uber Eats</h3><span className="mt-3 inline-flex rounded-full bg-[#F7F0E5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#756B5D]">Coming soon</span></article>
          <article className="rounded-2xl border border-[#E7DDCF] bg-[#FFFDF9] p-4"><PlatformIcon name="grubhub"/><h3 className="mt-3 font-bold">Grubhub</h3><span className="mt-3 inline-flex rounded-full bg-[#F7F0E5] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#756B5D]">Coming soon</span></article>
        </div>
      </section>
    </form>
  );
}
