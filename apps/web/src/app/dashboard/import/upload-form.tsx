"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createImportJob, type ImportSourceType } from "@/lib/api";

const SOURCES: { value: ImportSourceType; label: string; enabled: boolean; inputKind: "file" | "url"; accept?: string }[] = [
  { value: "PDF", label: "PDF", enabled: true, inputKind: "file", accept: "application/pdf" },
  { value: "IMAGE", label: "Image", enabled: true, inputKind: "file", accept: "image/png,image/jpeg,image/webp,image/gif" },
  {
    value: "CSV",
    label: "CSV / Spreadsheet",
    enabled: true,
    inputKind: "file",
    accept: ".csv,.xlsx,.xls,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  },
  { value: "WEBSITE", label: "Website URL", enabled: true, inputKind: "url" },
  { value: "GOOGLE_MAPS", label: "Google Maps", enabled: true, inputKind: "url" },
  { value: "DOORDASH", label: "DoorDash", enabled: false, inputKind: "url" },
  { value: "UBER_EATS", label: "Uber Eats", enabled: false, inputKind: "url" },
  { value: "GRUBHUB", label: "Grubhub", enabled: false, inputKind: "url" },
];

export function UploadForm() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<ImportSourceType>("PDF");
  const [file, setFile] = useState<File | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = SOURCES.find((source) => source.value === sourceType) ?? SOURCES[0];

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
      await createImportJob(sourceType, selected.inputKind === "file" ? { file: file! } : { url: sourceUrl.trim() });
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
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-4 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950"
    >
      <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Import a menu</h2>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <fieldset className="flex flex-wrap gap-3">
        {SOURCES.map((source) => (
          <label
            key={source.value}
            className={`flex items-center gap-2 text-sm ${
              source.enabled ? "text-zinc-700 dark:text-zinc-300" : "text-zinc-400"
            }`}
          >
            <input
              type="radio"
              name="sourceType"
              value={source.value}
              checked={sourceType === source.value}
              disabled={!source.enabled}
              onChange={() => setSourceType(source.value)}
            />
            {source.label}
            {!source.enabled && <span className="text-xs">(coming soon)</span>}
          </label>
        ))}
      </fieldset>

      {selected.inputKind === "file" ? (
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          File
          <input
            type="file"
            accept={selected.accept}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="rounded border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-black"
          />
        </label>
      ) : (
        <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
          {sourceType === "GOOGLE_MAPS" ? "Google Maps URL or Place ID" : "Website URL"}
          <input
            type="text"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder={sourceType === "GOOGLE_MAPS" ? "https://maps.app.goo.gl/..." : "https://example.com/menu"}
            className="rounded border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-black"
          />
        </label>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 self-start rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
      >
        {submitting ? "Importing..." : "Import"}
      </button>
    </form>
  );
}
