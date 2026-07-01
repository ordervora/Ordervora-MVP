"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createImportJob, type ImportSourceType } from "@/lib/api";

const SOURCES: { value: ImportSourceType; label: string; enabled: boolean }[] = [
  { value: "PDF", label: "PDF", enabled: true },
  { value: "IMAGE", label: "Image", enabled: true },
  { value: "WEBSITE", label: "Website URL", enabled: false },
  { value: "GOOGLE_MAPS", label: "Google Maps", enabled: false },
  { value: "DOORDASH", label: "DoorDash", enabled: false },
  { value: "UBER_EATS", label: "Uber Eats", enabled: false },
  { value: "GRUBHUB", label: "Grubhub", enabled: false },
];

export function UploadForm() {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<ImportSourceType>("PDF");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!file) {
      setError("Choose a file to upload");
      return;
    }

    setSubmitting(true);
    try {
      await createImportJob(sourceType, file);
      setFile(null);
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

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        File
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="rounded border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-black"
        />
      </label>

      <button
        type="submit"
        disabled={submitting}
        className="mt-2 self-start rounded-full bg-foreground px-5 py-2 text-background disabled:opacity-50"
      >
        {submitting ? "Uploading..." : "Upload & import"}
      </button>
    </form>
  );
}
