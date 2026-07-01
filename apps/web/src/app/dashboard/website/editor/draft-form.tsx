"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchDraft } from "@/lib/api";

export function DraftForm({ siteId, tagline, colorSeed }: { siteId: string; tagline: string; colorSeed: string }) {
  const router = useRouter();
  const [taglineValue, setTaglineValue] = useState(tagline);
  const [colorSeedValue, setColorSeedValue] = useState(colorSeed);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await patchDraft(siteId, { tagline: taglineValue, colorSeed: colorSeedValue });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Tagline
        <input
          type="text"
          value={taglineValue}
          onChange={(e) => setTaglineValue(e.target.value)}
          className="rounded border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-black"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
        Brand color
        <input
          type="color"
          value={colorSeedValue}
          onChange={(e) => setColorSeedValue(e.target.value)}
          className="h-10 w-20 rounded border border-black/[.08] dark:border-white/[.145]"
        />
      </label>

      <button
        type="submit"
        disabled={saving}
        className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
