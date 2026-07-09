"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createImportJob, type ImportSourceType } from "@/lib/api";

type Source = {
  id: string;
  label: string;
  description: string;
  badge?: string;
  value?: ImportSourceType;
  inputKind?: "file" | "url";
  accept?: string;
  enabled: boolean;
};

const AI_SOURCES: Source[] = [
  { id: "image", label: "Photo", description: "Take or upload a menu image", value: "IMAGE", inputKind: "file", accept: "image/png,image/jpeg,image/webp,image/gif", enabled: true },
  { id: "pdf", label: "PDF", description: "Upload a PDF menu", value: "PDF", inputKind: "file", accept: "application/pdf", enabled: true },
  { id: "csv", label: "CSV / Spreadsheet", description: "Import structured menu data", value: "CSV", inputKind: "file", accept: ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", enabled: true },
  { id: "website", label: "Website URL", description: "Read menu from your website", value: "WEBSITE", inputKind: "url", enabled: true },
  { id: "maps", label: "Google Maps", description: "Import business profile basics", value: "GOOGLE_MAPS", inputKind: "url", enabled: true },
];

const POS_SOURCES: Source[] = [
  { id: "clover", label: "Clover", description: "Connect your POS account", badge: "Connect POS", enabled: false },
  { id: "toast", label: "Toast", description: "Connect your POS account", badge: "Connect POS", enabled: false },
  { id: "square", label: "Square POS", description: "POS menu import", badge: "Coming soon", enabled: false },
  { id: "lightspeed", label: "Lightspeed", description: "POS menu import", badge: "Coming soon", enabled: false },
];

const DELIVERY_SOURCES: Source[] = [
  { id: "doordash", label: "DoorDash", description: "Delivery platform menu import", badge: "Coming soon", enabled: false },
  { id: "uber", label: "Uber Eats", description: "Delivery platform menu import", badge: "Coming soon", enabled: false },
  { id: "grubhub", label: "Grubhub", description: "Delivery platform menu import", badge: "Coming soon", enabled: false },
];

function SourceCard({ source, selected, onSelect }: { source: Source; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      disabled={!source.enabled}
      onClick={onSelect}
      className={`relative min-h-28 rounded-2xl border p-4 text-left transition ${selected ? "border-[#B97824] bg-[#FFF8ED] shadow-[0_8px_24px_rgba(185,120,36,0.12)]" : source.enabled ? "border-[#E7DDCF] bg-white hover:border-[#CFB894]" : "border-[#E7DDCF] bg-[#F8F4ED] opacity-80"}`}
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-xl text-base font-bold ${selected ? "bg-[#B97824] text-white" : "bg-[#F4E6D1] text-[#9A5F17]"}`}>
        {source.label.slice(0, 1)}
      </div>
      <p className="mt-3 text-sm font-bold text-[#171512]">{source.label}</p>
      <p className="mt-1 text-xs leading-5 text-[#756B5D]">{source.description}</p>
      {source.badge && <span className="absolute right-3 top-3 rounded-full bg-[#F4E6D1] px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8A571C]">{source.badge}</span>}
    </button>
  );
}

export function UploadForm() {
  const router = useRouter();
  const [sourceId, setSourceId] = useState("image");
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = AI_SOURCES.find((source) => source.id === sourceId) ?? AI_SOURCES[0];

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!selected.value || !selected.inputKind) return;
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">AI Sources</p>
          <h2 className="mt-1 text-xl font-bold text-[#171512]">Choose where your menu lives</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {AI_SOURCES.map((source) => (
            <SourceCard key={source.id} source={source} selected={source.id === sourceId} onSelect={() => { setSourceId(source.id); setFile(null); setSourceUrl(""); setError(null); }} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">POS Systems</p>
          <h2 className="mt-1 text-xl font-bold text-[#171512]">Connect your existing POS</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {POS_SOURCES.map((source) => <SourceCard key={source.id} source={source} selected={false} onSelect={() => undefined} />)}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#9A6A2F]">Delivery Platforms</p>
          <h2 className="mt-1 text-xl font-bold text-[#171512]">Bring over your delivery menu</h2>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {DELIVERY_SOURCES.map((source) => <SourceCard key={source.id} source={source} selected={false} onSelect={() => undefined} />)}
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-[#CDBA9E] bg-[#FFFDF9] p-5 sm:p-8">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F4E6D1] text-2xl font-bold text-[#9A5F17]">↑</div>
          <h3 className="mt-4 text-xl font-bold text-[#171512]">{selected.inputKind === "url" ? "Paste your source link" : "Upload your menu"}</h3>
          <p className="mt-2 text-sm leading-6 text-[#756B5D]">OrderVora will analyze the source and prepare structured menu data for review.</p>

          {selected.inputKind === "file" ? (
            <label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border border-[#E7DDCF] bg-white px-4 py-4 shadow-sm">
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
              className="mt-5 w-full rounded-2xl border border-[#E7DDCF] bg-white px-4 py-4 text-sm text-[#171512] outline-none placeholder:text-[#A3988A] focus:border-[#B97824]"
            />
          )}

          {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="mt-5 inline-flex min-h-12 items-center justify-center rounded-2xl bg-[#171512] px-7 py-3 text-sm font-bold text-white shadow-lg shadow-black/10 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Starting AI import…" : "Start import"}
          </button>
        </div>
      </section>
    </form>
  );
}
