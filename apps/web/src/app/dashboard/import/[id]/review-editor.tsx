"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveImportJob, rejectImportJob, updateImportJobData, type ExtractedMenuData, type ImportJob } from "@/lib/api";

interface EditableItem {
  key: string;
  category: string;
  name: string;
  description?: string;
  priceCents: number;
  confidence?: number;
}

function flatten(data: ExtractedMenuData): EditableItem[] {
  return data.categories.flatMap((category, categoryIndex) =>
    category.items.map((item, itemIndex) => ({
      key: `${categoryIndex}-${itemIndex}`,
      category: category.name,
      name: item.name,
      description: item.description,
      priceCents: item.priceCents,
      confidence: item.confidence,
    })),
  );
}

function toExtractedMenuData(items: EditableItem[], businessProfile: ExtractedMenuData["businessProfile"]): ExtractedMenuData {
  const byCategory = new Map<string, EditableItem[]>();
  for (const item of items) {
    const existing = byCategory.get(item.category) ?? [];
    existing.push(item);
    byCategory.set(item.category, existing);
  }
  return {
    categories: [...byCategory.entries()].map(([name, categoryItems]) => ({
      name,
      items: categoryItems.map((item) => ({
        name: item.name,
        description: item.description,
        priceCents: item.priceCents,
        confidence: item.confidence,
      })),
    })),
    ...(businessProfile ? { businessProfile } : {}),
  };
}

function formatDollars(cents: number): string {
  return (cents / 100).toFixed(2);
}

function confidenceClass(confidence: number): string {
  if (confidence >= 0.8) return "bg-emerald-50 text-emerald-700";
  if (confidence >= 0.5) return "bg-amber-50 text-amber-700";
  return "bg-red-50 text-red-700";
}

export function ReviewEditor({ job }: { job: ImportJob }) {
  const router = useRouter();
  const [items, setItems] = useState<EditableItem[]>(() => flatten(job.extractedData ?? { categories: [] }));
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const categoryNames = [...new Set(items.map((item) => item.category))];
  const businessProfile = job.extractedData?.businessProfile;

  function toggleSelected(key: string) {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function updateItem(key: string, patch: Partial<EditableItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  async function persistEdits() {
    await updateImportJobData(job.id, toExtractedMenuData(items, businessProfile));
  }

  async function handleSave() {
    setError(null);
    setSubmitting(true);
    try {
      await persistEdits();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    try {
      await persistEdits();
      await approveImportJob(job.id);
      router.push("/dashboard/builder");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve import");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject() {
    setError(null);
    setSubmitting(true);
    try {
      await rejectImportJob(job.id);
      router.push("/dashboard/import");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject import");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-7">
      {error && <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {categoryNames.map((categoryName) => (
        <section key={categoryName}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-bold tracking-tight">{categoryName}</h2>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#756B5D] shadow-sm">
              {items.filter((item) => item.category === categoryName).length} items
            </span>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {items.filter((item) => item.category === categoryName).map((item) => (
              <article key={item.key} className="rounded-2xl border border-[#E7DDCF] bg-white p-4 shadow-[0_8px_24px_rgba(48,39,27,0.04)]">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(item.key)}
                    onChange={() => toggleSelected(item.key)}
                    aria-label={`Select ${item.name}`}
                    className="mt-1 h-5 w-5 shrink-0 accent-[#B97824]"
                  />
                  <div className="min-w-0 flex-1">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItem(item.key, { name: e.target.value })}
                      className="w-full rounded-xl border border-transparent bg-transparent px-0 py-1 text-base font-bold text-[#171512] outline-none focus:border-[#E7DDCF] focus:bg-[#FFFDF9] focus:px-3"
                    />
                    {item.description && (
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem(item.key, { description: e.target.value })}
                        rows={2}
                        className="mt-1 w-full resize-none rounded-xl border border-transparent bg-transparent px-0 py-1 text-sm leading-5 text-[#756B5D] outline-none focus:border-[#E7DDCF] focus:bg-[#FFFDF9] focus:px-3"
                      />
                    )}
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-sm font-semibold text-[#756B5D]">
                        $
                        <input
                          type="number"
                          step="0.01"
                          value={formatDollars(item.priceCents)}
                          onChange={(e) => updateItem(item.key, { priceCents: Math.round(Number(e.target.value) * 100) })}
                          className="w-24 rounded-xl border border-[#E7DDCF] bg-[#FFFDF9] px-3 py-2 text-right font-bold text-[#171512] outline-none focus:border-[#B97824]"
                        />
                      </label>
                      {item.confidence !== undefined && (
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${confidenceClass(item.confidence)}`}>
                          {Math.round(item.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-20 z-40 rounded-3xl border border-[#E7DDCF] bg-white/96 p-3 shadow-[0_18px_50px_rgba(48,39,27,0.16)] backdrop-blur-xl lg:bottom-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <button type="button" onClick={handleSave} disabled={submitting} className="min-h-12 rounded-2xl border border-[#E7DDCF] px-4 text-sm font-bold text-[#2A251F] disabled:opacity-50">Save changes</button>
          <button type="button" onClick={handleApprove} disabled={submitting} className="min-h-12 rounded-2xl bg-[#171512] px-4 text-sm font-bold text-white disabled:opacity-50">Approve & continue</button>
          <button type="button" onClick={handleReject} disabled={submitting} className="col-span-2 min-h-11 rounded-2xl px-4 text-sm font-semibold text-red-600 disabled:opacity-50 sm:col-auto">Reject import</button>
        </div>
      </div>
    </div>
  );
}
