"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { approveImportJob, rejectImportJob } from "@/lib/api";

export function ReviewActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleApprove() {
    setError(null);
    setSubmitting(true);
    try {
      await approveImportJob(jobId);
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
      await rejectImportJob(jobId);
      router.push("/dashboard/import");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject import");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
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
