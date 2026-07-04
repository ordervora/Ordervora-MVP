"use client";

import confetti from "canvas-confetti";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DevicePreview } from "../website/variations/[id]/device-preview";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";

function fireConfetti() {
  const duration = 1500;
  const end = Date.now() + duration;

  (function frame() {
    confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
    confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
    if (Date.now() < end) requestAnimationFrame(frame);
  })();
}

export function FinaleReveal({
  restaurantName,
  siteId,
  siteSlug,
  publishedVersionId,
  qrToken,
  qrError,
}: {
  restaurantName: string;
  siteId: string;
  siteSlug: string;
  publishedVersionId: string | null;
  qrToken: string | null;
  qrError: string | null;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const qrContainerRef = useRef<HTMLDivElement>(null);
  const orderUrl = qrToken && typeof window !== "undefined" ? `${window.location.origin}/order/qr/${qrToken}` : null;

  useEffect(() => {
    if (!reducedMotion) fireConfetti();
  }, [reducedMotion]);

  function handleDownloadQr() {
    const svg = qrContainerRef.current?.querySelector("svg");
    if (!svg) return;
    const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${siteSlug}-qr-code.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-8 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-semibold text-black dark:text-zinc-50">🎉 {restaurantName} is live</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          A branded website, a full menu, mobile-ready pages, SEO, and QR ordering — built in minutes.
        </p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Your website</h2>
          {publishedVersionId ? (
            <DevicePreview siteId={siteId} variationId={publishedVersionId} />
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">Preview unavailable right now.</p>
          )}
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Live at <span className="font-mono">{siteSlug}.sites.ordervora.example</span>
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-black dark:text-zinc-50">Your QR ordering code</h2>
          {orderUrl ? (
            <div
              ref={qrContainerRef}
              className="flex flex-col items-center gap-3 rounded-lg border border-black/[.08] bg-white p-6 dark:border-white/[.145] dark:bg-zinc-950"
            >
              <QRCodeSVG value={orderUrl} size={180} />
              <p className="break-all text-center text-xs text-zinc-500 dark:text-zinc-400">{orderUrl}</p>
              <button
                type="button"
                onClick={handleDownloadQr}
                className="rounded-full border border-black/[.08] px-4 py-2 text-xs font-medium dark:border-white/[.145]"
              >
                Download QR code
              </button>
            </div>
          ) : (
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {qrError
                ? `Your QR code isn't ready yet (${qrError}) — you can create one anytime from Tables.`
                : "Setting up your QR code…"}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/dashboard/website"
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          View my website
        </Link>
        <Link
          href="/dashboard/tables"
          className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium dark:border-white/[.145]"
        >
          Manage QR codes
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full border border-black/[.08] px-5 py-2 text-sm font-medium dark:border-white/[.145]"
        >
          Go to dashboard
        </Link>
      </div>
    </div>
  );
}
