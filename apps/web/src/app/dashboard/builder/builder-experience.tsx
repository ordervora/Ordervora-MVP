"use client";

import { useEffect, useState } from "react";
import { FinaleReveal } from "./finale-reveal";
import { LiveBuildScreen } from "./live-build-screen";
import { useRestaurantBuilder } from "./use-restaurant-builder";

/** A brief cinematic beat between the last build step and the reveal — long enough to register, short enough to never feel like a stall. */
const REVEAL_DELAY_MS = 700;

/**
 * The orchestrated "AI Restaurant Builder" experience — see Sprint 11's
 * Product Experience Plan. Every visible stage maps to real backend work
 * (existing site-generation job stages, then auto-select/publish/QR
 * provisioning over existing endpoints); nothing here is a fake timer.
 */
export function BuilderExperience({ restaurantName }: { restaurantName: string }) {
  const state = useRestaurantBuilder();
  const [readyToReveal, setReadyToReveal] = useState(false);

  useEffect(() => {
    if (state.phase !== "done") return;
    const timer = setTimeout(() => setReadyToReveal(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state.phase]);

  if (state.phase === "loading") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-8 dark:bg-black">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Let&apos;s build {restaurantName}&apos;s digital home…</p>
      </div>
    );
  }

  if (state.phase === "bootstrap_failed") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-8 dark:bg-black">
        <p className="text-sm text-red-600">{state.bootstrapError ?? "Something went wrong getting started."}</p>
        <button
          type="button"
          onClick={state.retryBootstrap}
          className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
        >
          Try again
        </button>
      </div>
    );
  }

  if (state.phase === "generating" || state.phase === "generation_failed") {
    const activeStepId = state.job?.stage ?? "INGEST";
    return (
      <LiveBuildScreen
        restaurantName={restaurantName}
        activeStepId={activeStepId}
        errorMessage={state.phase === "generation_failed" ? (state.job?.error ?? "Generation failed") : null}
        onRetry={state.phase === "generation_failed" ? state.retryGeneration : undefined}
      />
    );
  }

  if (state.phase === "finishing" || state.phase === "finish_failed" || (state.phase === "done" && !readyToReveal)) {
    const activeStepId = state.phase === "done" ? "PROVISIONING" : (state.finishFailure?.step ?? state.finishStepId);
    return (
      <LiveBuildScreen
        restaurantName={restaurantName}
        activeStepId={activeStepId}
        errorMessage={state.finishFailure?.message ?? null}
        onRetry={state.phase === "finish_failed" ? state.retryFinish : undefined}
        captionContext={state.winningDesign ?? undefined}
        candidates={state.candidates}
        winnerId={state.winnerId}
        colorSeed={state.winningDesign?.colorSeed}
      />
    );
  }

  // phase === "done" && readyToReveal
  return (
    <FinaleReveal
      restaurantName={restaurantName}
      siteId={state.siteId!}
      siteSlug={state.siteSlug ?? "your-restaurant"}
      publishedVersionId={state.publishedVersionId}
      qrToken={state.qrToken}
      qrError={state.qrError}
    />
  );
}
