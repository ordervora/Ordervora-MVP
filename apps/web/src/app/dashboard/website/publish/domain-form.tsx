"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDomain, setPrimaryDomain, verifyDomain, type SiteDomain } from "@/lib/api";

export function DomainForm({ siteId }: { siteId: string }) {
  const router = useRouter();
  const [hostname, setHostname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await addDomain(siteId, hostname.trim());
      setHostname("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add domain");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        type="text"
        value={hostname}
        onChange={(e) => setHostname(e.target.value)}
        placeholder="menu.yourrestaurant.com"
        className="flex-1 rounded border border-black/[.08] px-3 py-2 text-sm dark:border-white/[.145] dark:bg-black"
      />
      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
      >
        {submitting ? "Adding…" : "Add domain"}
      </button>
    </form>
  );
}

export function DomainRow({ siteId, domain }: { siteId: string; domain: SiteDomain }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleVerify() {
    setBusy(true);
    try {
      await verifyDomain(siteId, domain.id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPrimary() {
    setBusy(true);
    try {
      await setPrimaryDomain(siteId, domain.id);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className="flex items-center justify-between gap-2 rounded border border-black/[.08] p-3 text-sm dark:border-white/[.145]">
      <div>
        <p className="font-mono text-black dark:text-zinc-50">
          {domain.hostname} {domain.isPrimary && <span className="text-xs text-emerald-600">(primary)</span>}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-500">
          DNS: {domain.verificationStatus} · TLS: {domain.tlsStatus}
        </p>
      </div>
      <div className="flex gap-2">
        {domain.verificationStatus !== "VERIFIED" && (
          <button type="button" onClick={handleVerify} disabled={busy} className="rounded-full border border-black/[.08] px-3 py-1 text-xs dark:border-white/[.145]">
            Check DNS
          </button>
        )}
        {domain.verificationStatus === "VERIFIED" && !domain.isPrimary && (
          <button type="button" onClick={handleSetPrimary} disabled={busy} className="rounded-full border border-black/[.08] px-3 py-1 text-xs dark:border-white/[.145]">
            Make primary
          </button>
        )}
      </div>
    </li>
  );
}
