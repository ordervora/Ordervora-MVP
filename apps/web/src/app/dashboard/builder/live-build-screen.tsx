"use client";

import { useEffect, useState } from "react";
import {
  BUILD_STEPS,
  VALUE_PITCH_ITEMS,
  overallProgressPercent,
  statusFor,
  type BuildCaptionContext,
} from "./build-steps";
import { DesignChoiceReveal } from "./design-choice-reveal";
import { usePrefersReducedMotion } from "./use-prefers-reduced-motion";
import type { DesignCandidate } from "./use-restaurant-builder";
import { WebsiteMockup } from "./website-mockup";

const CAPTION_ROTATE_MS = 2200;
const REASSURANCE_DELAY_MS = 7000;

/**
 * Keyed by activeStepId at the call site so React remounts this (fresh
 * useState(0)) whenever the active stage changes — avoids resetting state
 * imperatively inside an effect, which cascades renders.
 */
function RotatingCaption({ captions }: { captions: string[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (captions.length <= 1) return;
    const interval = setInterval(() => setIndex((i) => (i + 1) % captions.length), CAPTION_ROTATE_MS);
    return () => clearInterval(interval);
  }, [captions]);

  return <>{captions[index] ?? ""}</>;
}

/**
 * A quiet reassurance line that only appears once the current stage has
 * been active for a while — reassures without nagging on the fast steps.
 * Keyed by activeStepId at the call site, same remount-to-reset pattern as
 * RotatingCaption.
 */
function ReassuranceLine() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), REASSURANCE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;
  return (
    <p className="animate-[fade-in-up_0.5s_ease-out] text-xs text-zinc-500 dark:text-zinc-500">
      Still working — great restaurants take an extra moment.
    </p>
  );
}

function ValuePitchChecklist({ activeStepId }: { activeStepId: string }) {
  return (
    <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 text-xs">
      {VALUE_PITCH_ITEMS.map((item) => {
        const done = statusFor(item.doneAtStepId, activeStepId) === "done";
        return (
          <li
            key={item.label}
            className={`flex items-center gap-1.5 ${
              done ? "text-black dark:text-zinc-50" : "text-zinc-400 dark:text-zinc-600"
            }`}
          >
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] transition-colors duration-500 ${
                done ? "animate-[pop-in_0.4s_ease-out] bg-green-600 text-white" : "border border-zinc-300 dark:border-zinc-700"
              }`}
            >
              {done ? "✓" : ""}
            </span>
            {item.label}
          </li>
        );
      })}
    </ul>
  );
}

export function LiveBuildScreen({
  restaurantName,
  activeStepId,
  errorMessage,
  onRetry,
  captionContext,
  candidates,
  winnerId,
  colorSeed,
}: {
  restaurantName: string;
  activeStepId: string;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Extra brand details known once a design has been picked — personalizes the SELECTING/PUBLISHING captions. */
  captionContext?: Partial<BuildCaptionContext>;
  /** Present once SELECTING starts — powers the "dramatize the choice" moment in place of the generic mockup. */
  candidates?: DesignCandidate[];
  winnerId?: string | null;
  colorSeed?: string | null;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const activeStep = BUILD_STEPS.find((s) => s.id === activeStepId);
  const progress = overallProgressPercent(activeStepId);

  const groups = [...new Set(BUILD_STEPS.map((s) => s.group))];
  const captions = activeStep?.captions({ restaurantName, ...captionContext }) ?? [];
  const showDesignChoice = activeStepId === "SELECTING" && candidates && candidates.length > 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 bg-zinc-50 p-8 dark:bg-black">
      <div className="flex w-full max-w-3xl flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold text-black dark:text-zinc-50">
          Building {restaurantName}&apos;s digital home
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {errorMessage ? "We hit a snag — nothing was lost." : <RotatingCaption key={activeStepId} captions={captions} />}
        </p>
        {!errorMessage && (
          <div key={activeStepId}>
            <ReassuranceLine />
          </div>
        )}
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-8 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          {groups.map((group) => (
            <div key={group} className="mb-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                {group}
              </p>
              <ul className="flex flex-col gap-2">
                {BUILD_STEPS.filter((s) => s.group === group).map((step) => {
                  const status = statusFor(step.id, activeStepId);
                  return (
                    <li key={step.id} className="flex items-center gap-2 text-sm">
                      <span
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] transition-colors duration-500 ${
                          status === "done"
                            ? "animate-[pop-in_0.4s_ease-out] bg-green-600 text-white"
                            : status === "active"
                              ? `border-2 border-foreground ${reducedMotion ? "" : "animate-pulse"}`
                              : "border border-zinc-300 text-transparent dark:border-zinc-700"
                        }`}
                      >
                        {status === "done" ? "✓" : ""}
                      </span>
                      <span
                        className={
                          status === "upcoming"
                            ? "text-zinc-400 dark:text-zinc-600"
                            : "text-black dark:text-zinc-50"
                        }
                      >
                        {step.title}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col items-center gap-4">
          {showDesignChoice ? (
            <DesignChoiceReveal candidates={candidates} winnerId={winnerId ?? null} reducedMotion={reducedMotion} />
          ) : (
            <WebsiteMockup activeStepId={activeStepId} reducedMotion={reducedMotion} colorSeed={colorSeed} />
          )}
          <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">{progress}% complete</p>
          <ValuePitchChecklist activeStepId={activeStepId} />
        </div>
      </div>

      {errorMessage && (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-center dark:border-red-900 dark:bg-red-950">
          <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
          {onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
