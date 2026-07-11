"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, History, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { generateContent, listContentGenerations, restoreContentGeneration, type ContentGeneration, type ContentGenerationScope, type WebsiteSiteDefinition } from "@/lib/api";

interface AiContentPanelProps {
  siteId: string;
  activePageSlug: string;
  onGenerated: (definition: WebsiteSiteDefinition) => void;
}

const SCOPE_LABELS: Record<ContentGenerationScope, string> = {
  FULL: "Generate Website Content",
  HERO: "Hero",
  ABOUT: "About / Story",
  WHY_CHOOSE_US: "Why Choose Us",
  FEATURED: "Featured Sections",
  CONTACT: "Contact Intro",
  FOOTER: "Footer Text",
  SEO: "SEO Metadata",
  CTA: "Buttons (CTA)",
  FAQ: "FAQ",
};

const REGENERATE_SCOPES: ContentGenerationScope[] = ["HERO", "ABOUT", "WHY_CHOOSE_US", "FEATURED", "CONTACT", "FOOTER", "SEO", "CTA", "FAQ"];

/**
 * Sprint 20A Task 6 — AI Content Generation Engine's Studio panel. Every
 * generate/regenerate/restore call returns the server's already-merged
 * `definition` (generated via `patchDraft`, the same persistence path
 * every other edit uses) and hands it to `onGenerated`, which the
 * Customization Studio wires straight into its existing `commit()` —
 * so undo/redo, autosave, and the live preview all update with zero new
 * plumbing here, exactly as if the owner had typed the change by hand.
 */
export function AiContentPanel({ siteId, activePageSlug, onGenerated }: AiContentPanelProps) {
  const [pending, setPending] = useState<ContentGenerationScope | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [justGenerated, setJustGenerated] = useState<ContentGenerationScope | null>(null);
  const [generations, setGenerations] = useState<ContentGeneration[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  useEffect(() => {
    void refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  async function refreshHistory() {
    setLoadingHistory(true);
    try {
      const { generations } = await listContentGenerations(siteId);
      setGenerations(generations);
    } catch {
      // History is a nice-to-have panel, not a blocker — a failed fetch
      // just leaves the list empty rather than breaking generation itself.
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleGenerate(scope: ContentGenerationScope) {
    setPending(scope);
    setError(null);
    try {
      const { definition } = await generateContent(siteId, scope, activePageSlug);
      onGenerated(definition);
      setJustGenerated(scope);
      setTimeout(() => setJustGenerated((current) => (current === scope ? null : current)), 2500);
      void refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed — try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleRestore(generation: ContentGeneration) {
    setRestoringId(generation.id);
    setError(null);
    try {
      const { definition } = await restoreContentGeneration(siteId, generation.id);
      onGenerated(definition);
      void refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed — try again.");
    } finally {
      setRestoringId(null);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-sm font-bold text-[#171512]">AI Content Generation</p>
        <p className="text-xs text-[#756B5D]">
          Generate professional copy for your website automatically — hero, about, FAQ, SEO, and more, tailored to your business type.
        </p>
      </div>

      {error && (
        <p className="flex items-center gap-1.5 text-xs font-semibold text-red-600" role="alert">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void handleGenerate("FULL")}
        disabled={pending !== null}
        className="flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#171512] px-4 text-sm font-bold text-white disabled:opacity-50"
      >
        {pending === "FULL" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Sparkles className="h-4 w-4" aria-hidden="true" />}
        Generate Website Content
      </button>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-[#9A6A2F]">Regenerate a Section</p>
        <div className="grid grid-cols-2 gap-2">
          {REGENERATE_SCOPES.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => void handleGenerate(scope)}
              disabled={pending !== null}
              className="flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-[#E7DDCF] bg-white px-3 text-xs font-bold text-[#171512] disabled:opacity-50"
            >
              {pending === scope ? (
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden="true" />
              ) : justGenerated === scope ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-700" aria-hidden="true" />
              ) : null}
              <span className="truncate">{SCOPE_LABELS[scope]}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-[#E7DDCF] pt-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#9A6A2F]">
          <History className="h-3.5 w-3.5" aria-hidden="true" /> Version History
        </p>
        {loadingHistory ? (
          <p className="text-xs text-[#756B5D]">Loading…</p>
        ) : generations.length === 0 ? (
          <p className="text-xs text-[#756B5D]">No generations yet — use Generate or Regenerate above.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {generations.map((generation) => (
              <li key={generation.id} className="flex items-center justify-between gap-2 rounded-xl border border-[#E7DDCF] bg-white px-3 py-2 text-xs">
                <div className="min-w-0">
                  <p className="truncate font-bold text-[#171512]">
                    {SCOPE_LABELS[generation.scope]}
                    {generation.restoredFromId ? " (restored)" : ""}
                  </p>
                  <p className="truncate text-[#8A7D6C]">
                    {new Date(generation.createdAt).toLocaleString()} · {generation.provider ?? "template"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRestore(generation)}
                  disabled={restoringId !== null}
                  aria-label={`Restore ${SCOPE_LABELS[generation.scope]} from ${new Date(generation.createdAt).toLocaleString()}`}
                  className="flex shrink-0 items-center gap-1 rounded-full border border-[#E7DDCF] px-2.5 py-1 font-bold text-[#9A6A2F] disabled:opacity-50"
                >
                  {restoringId === generation.id ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> : <RotateCcw className="h-3 w-3" aria-hidden="true" />}
                  Restore
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
