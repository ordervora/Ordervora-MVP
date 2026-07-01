"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { publishSite, rollbackSite, unpublishSite } from "@/lib/api";

export function PublishButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    setWarning(null);
    try {
      const result = await publishSite(siteId);
      if (result.warning) {
        setWarning(result.warning);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed pre-publish checks");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {warning && <p className="text-sm text-amber-600">{warning}</p>}
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="self-start rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {submitting ? "Publishing…" : "Publish"}
      </button>
    </div>
  );
}

export function UnpublishButton({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await unpublishSite(siteId);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      className="self-start rounded-full border border-black/[.08] px-4 py-2 text-sm font-medium text-black disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50"
    >
      {submitting ? "Unpublishing…" : "Unpublish"}
    </button>
  );
}

export function RollbackButton({ siteId, versionId }: { siteId: string; versionId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleClick() {
    setSubmitting(true);
    try {
      await rollbackSite(siteId, versionId);
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={submitting}
      className="rounded-full border border-black/[.08] px-3 py-1 text-xs font-medium text-black disabled:opacity-50 dark:border-white/[.145] dark:text-zinc-50"
    >
      {submitting ? "Rolling back…" : "Roll back to this release"}
    </button>
  );
}
