"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { patchDraft, type SitePage, type SiteSectionBlock } from "@/lib/api";
import { SECTION_FIELD_DEFS, moveItem } from "@/lib/site-editor";

const SECTION_LABELS: Record<string, string> = {
  hero: "Hero",
  signatureDishes: "Signature dishes",
  aboutTeaser: "About (teaser)",
  aboutStory: "About (full story)",
  hoursLocation: "Hours & location",
  gallery: "Gallery",
  ctaBanner: "Call to action",
  menu: "Menu",
  contactInfo: "Contact info",
  contactForm: "Contact form",
  footer: "Footer",
};

export function SectionEditor({
  siteId,
  pages,
  pageSlug,
}: {
  siteId: string;
  pages: SitePage[];
  pageSlug: string;
}) {
  const router = useRouter();
  const pageIndex = pages.findIndex((p) => p.slug === pageSlug);
  const [sections, setSections] = useState<SiteSectionBlock[]>(pages[pageIndex]?.sections ?? []);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function persist(nextSections: SiteSectionBlock[]) {
    setSections(nextSections);
    setError(null);
    setSaving(true);
    try {
      const nextPages = pages.map((page, i) => (i === pageIndex ? { ...page, sections: nextSections } : page));
      await patchDraft(siteId, { pages: nextPages });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save changes");
    } finally {
      setSaving(false);
    }
  }

  function handleFieldChange(sectionIndex: number, key: string, value: string) {
    const next = sections.map((section, i) =>
      i === sectionIndex ? { ...section, props: { ...section.props, [key]: value } } : section,
    );
    setSections(next);
  }

  function handleFieldBlur() {
    persist(sections);
  }

  function handleMove(sectionIndex: number, direction: "up" | "down") {
    persist(moveItem(sections, sectionIndex, direction));
  }

  if (pageIndex === -1) {
    return <p className="text-sm text-zinc-500 dark:text-zinc-400">Page not found.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {saving && <p className="text-xs text-zinc-500 dark:text-zinc-400">Saving…</p>}
      {sections.map((section, index) => {
        const fields = SECTION_FIELD_DEFS[section.type] ?? [];
        return (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg border border-black/[.08] p-4 dark:border-white/[.145]"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-black dark:text-zinc-50">
                {SECTION_LABELS[section.type] ?? section.type}
              </span>
              <div className="flex gap-1">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => handleMove(index, "up")}
                  className="rounded border border-black/[.08] px-2 py-1 text-xs disabled:opacity-30 dark:border-white/[.145]"
                  aria-label={`Move ${SECTION_LABELS[section.type] ?? section.type} up`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === sections.length - 1}
                  onClick={() => handleMove(index, "down")}
                  className="rounded border border-black/[.08] px-2 py-1 text-xs disabled:opacity-30 dark:border-white/[.145]"
                  aria-label={`Move ${SECTION_LABELS[section.type] ?? section.type} down`}
                >
                  ↓
                </button>
              </div>
            </div>

            {fields.length === 0 ? (
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                No editable text for this section — content is drawn from your restaurant profile/menu.
              </p>
            ) : (
              fields.map((field) => {
                const value = typeof section.props[field.key] === "string" ? (section.props[field.key] as string) : "";
                return (
                  <label key={field.key} className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                    {field.label}
                    {field.kind === "textarea" ? (
                      <textarea
                        value={value}
                        onChange={(e) => handleFieldChange(index, field.key, e.target.value)}
                        onBlur={handleFieldBlur}
                        rows={3}
                        className="rounded border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-black"
                      />
                    ) : (
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleFieldChange(index, field.key, e.target.value)}
                        onBlur={handleFieldBlur}
                        className="rounded border border-black/[.08] px-3 py-2 dark:border-white/[.145] dark:bg-black"
                      />
                    )}
                  </label>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}
