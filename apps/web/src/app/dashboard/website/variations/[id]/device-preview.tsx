"use client";

import { useEffect, useState } from "react";
import { getPreviewToken } from "@/lib/api";

const DEVICE_WIDTHS = { mobile: 390, tablet: 768, desktop: 1280 } as const;
type Device = keyof typeof DEVICE_WIDTHS;

/**
 * §18 Preview System — renders the actual shared renderer's output (not a
 * mock) inside an iframe pointed at /preview/:token, with a mobile/tablet/
 * desktop frame toggle. The token is short-lived and site-scoped; the
 * preview always reflects this specific variation via ?variation=.
 */
export function DevicePreview({ siteId, variationId }: { siteId: string; variationId: string }) {
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [device, setDevice] = useState<Device>("desktop");

  useEffect(() => {
    let cancelled = false;
    getPreviewToken(siteId)
      .then(({ token: t }) => {
        if (!cancelled) setToken(t);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load preview");
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  if (error) return <p className="text-sm text-red-600">{error}</p>;
  if (!token) return <p className="text-sm text-zinc-600 dark:text-zinc-400">Loading preview…</p>;

  const src = `/preview/${token}?variation=${encodeURIComponent(variationId)}&path=${encodeURIComponent("/")}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {(Object.keys(DEVICE_WIDTHS) as Device[]).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDevice(d)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${
              device === d
                ? "border-foreground bg-foreground text-background"
                : "border-black/[.08] text-black dark:border-white/[.145] dark:text-zinc-50"
            }`}
          >
            {d}
          </button>
        ))}
      </div>
      <div
        className="mx-auto w-full overflow-hidden rounded-lg border border-black/[.08] transition-[max-width] dark:border-white/[.145]"
        style={{ maxWidth: DEVICE_WIDTHS[device] }}
      >
        <iframe src={src} title="Site preview" className="h-[600px] w-full border-0" />
      </div>
    </div>
  );
}
