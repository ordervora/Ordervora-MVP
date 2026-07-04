/**
 * The build pipeline's narrative, ordered to match REAL backend execution
 * order (GenerationJob.stage's actual sequence, then the client-orchestrated
 * select -> publish -> QR steps) rather than a scripted sequence — every
 * step here corresponds to genuine work happening server-side, not a timer.
 */
export interface BuildStep {
  id: string;
  group: string;
  title: string;
  captions: string[];
}

export const BUILD_STEPS: BuildStep[] = [
  {
    id: "INGEST",
    group: "Understanding your restaurant",
    title: "Menu Organization",
    captions: ["Reading your menu and profile…", "Organizing your categories and items…"],
  },
  {
    id: "BRAND_ANALYSIS",
    group: "Understanding your restaurant",
    title: "Business Analysis & Brand Discovery",
    captions: [
      "Analyzing your restaurant's personality…",
      "Finding your brand colors…",
      "Understanding your cuisine and style…",
    ],
  },
  {
    id: "THEME_SELECTION",
    group: "Designing your website",
    title: "Theme Selection",
    captions: ["Matching your brand to the perfect theme…"],
  },
  {
    id: "CONTENT_GENERATION",
    group: "Designing your website",
    title: "Category Optimization",
    captions: ["Writing your homepage copy…", "Polishing your menu descriptions…"],
  },
  {
    id: "ASSEMBLY",
    group: "Designing your website",
    title: "Homepage Creation",
    captions: ["Assembling three complete designs…"],
  },
  {
    id: "ASSETS",
    group: "Designing your website",
    title: "Image Optimization",
    captions: ["Preparing your photos…"],
  },
  {
    id: "SCORING",
    group: "Designing your website",
    title: "Mobile Optimization & Final Polish",
    captions: ["Checking mobile readiness…", "Scoring each design…"],
  },
  {
    id: "FINALIZE",
    group: "Designing your website",
    title: "Final Restaurant Review",
    captions: ["Wrapping up your three designs…"],
  },
  {
    id: "SELECTING",
    group: "Publishing your business",
    title: "Choosing Your Best Design",
    captions: ["Picking your best-scoring design…"],
  },
  {
    id: "PUBLISHING",
    group: "Publishing your business",
    title: "Publishing & SEO Generation",
    captions: ["Publishing your website…", "Generating your sitemap and SEO tags…"],
  },
  {
    id: "PROVISIONING",
    group: "Publishing your business",
    title: "QR Ordering Creation",
    captions: ["Setting up your QR ordering code…"],
  },
];

export function stepIndex(id: string): number {
  return BUILD_STEPS.findIndex((step) => step.id === id);
}

export type StepStatus = "done" | "active" | "upcoming";

export function statusFor(id: string, activeId: string): StepStatus {
  const activeIndex = stepIndex(activeId);
  const thisIndex = stepIndex(id);
  if (activeIndex === -1 || thisIndex === -1) return "upcoming";
  if (thisIndex < activeIndex) return "done";
  if (thisIndex === activeIndex) return "active";
  return "upcoming";
}

export function overallProgressPercent(activeId: string): number {
  const activeIndex = stepIndex(activeId);
  if (activeIndex === -1) return 0;
  return Math.round(((activeIndex + 1) / BUILD_STEPS.length) * 100);
}
