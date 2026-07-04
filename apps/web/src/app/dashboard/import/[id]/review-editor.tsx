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

function confidenceBadgeClass(confidence: number): string {
  if (confidence >= 0.8) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

export function ReviewEditor({ job }: { job: ImportJob }) {
  const router = useRouter();
  const [items, setItems] = useState<EditableItem[]>(() => flatten(job.extractedData ?? { categories: [] }));
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkCategory, setBulkCategory] = useState("");
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

  function handleBulkMove() {
    const target = bulkCategory.trim();
    if (!target || selectedKeys.size === 0) return;
    setItems((prev) => prev.map((item) => (selectedKeys.has(item.key) ? { ...item, category: target } : item)));
    setSelectedKeys(new Set());
    setBulkCategory("");
  }

  function handleBulkDelete() {
    if (selectedKeys.size === 0) return;
    setItems((prev) => prev.filter((item) => !selectedKeys.has(item.key)));
    setSelectedKeys(new Set());
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
      router.push("/dashboard/import");
      router.refresh();
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
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-red-600">{error}</p>}

      {selectedKeys.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded border border-black/[.08] p-2 text-sm dark:border-white/[.145]">
          <span>{selectedKeys.size} selected</span>
          <input
            type="text"
            list="category-names"
            value={bulkCategory}
            onChange={(e) => setBulkCategory(e.target.value)}
            placeholder="Move to category…"
            className="rounded border border-black/[.08] px-2 py-1 dark:border-white/[.145] dark:bg-black"
          />
          <datalist id="category-names">
            {categoryNames.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
          <button type="button" onClick={handleBulkMove} className="rounded-full border border-black/[.08] px-3 py-1 dark:border-white/[.145]">
            Move
          </button>
          <button type="button" onClick={handleBulkDelete} className="rounded-full border border-red-300 px-3 py-1 text-red-600">
            Delete selected
          </button>
        </div>
      )}

      {categoryNames.map((categoryName) => (
        <div key={categoryName} className="flex flex-col gap-1">
          <h2 className="font-medium text-black dark:text-zinc-50">{categoryName}</h2>
          <ul className="flex flex-col gap-2">
            {items
              .filter((item) => item.category === categoryName)
              .map((item) => (
                <li key={item.key} className="flex flex-wrap items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(item.key)}
                    onChange={() => toggleSelected(item.key)}
                    aria-label={`Select ${item.name}`}
                  />
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItem(item.key, { name: e.target.value })}
                    className="w-40 rounded border border-black/[.08] px-2 py-1 dark:border-white/[.145] dark:bg-black"
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={formatDollars(item.priceCents)}
                    onChange={(e) => updateItem(item.key, { priceCents: Math.round(Number(e.target.value) * 100) })}
                    className="w-20 rounded border border-black/[.08] px-2 py-1 dark:border-white/[.145] dark:bg-black"
                  />
                  {item.confidence !== undefined && (
                    <span className={`rounded-full px-2 py-0.5 text-xs ${confidenceBadgeClass(item.confidence)}`}>
                      {Math.round(item.confidence * 100)}%
                    </span>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleApprove}
          disabled={submitting}
          className="rounded-full bg-foreground px-5 py-2 text-sm text-background disabled:opacity-50"
        >
          Approve into menu
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={submitting}
          className="rounded-full border border-black/[.08] px-5 py-2 text-sm disabled:opacity-50 dark:border-white/[.145]"
        >
          Save changes
        </button>
        <button
          type="button"
          onClick={handleReject}
          disabled={submitting}
          className="rounded-full border border-black/[.08] px-5 py-2 text-sm disabled:opacity-50 dark:border-white/[.145]"
        >
          Reject
        </button>
      </div>
    </div>
  );
}
