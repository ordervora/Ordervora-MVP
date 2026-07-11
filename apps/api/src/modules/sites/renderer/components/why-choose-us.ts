import { escapeHtml } from "../html-escape";
import type { RenderContext } from "../render-context";
import type { SectionBlock } from "../../types";

interface WhyChooseUsItem {
  heading: string;
  description: string;
}

/**
 * Sprint 20A Task 6 — AI-generated (or owner-edited) "Why Choose Us"
 * copy. Same category as "reviews"/"appPromotion": owner/AI-authored
 * prose, not pulled from any live data source, and never fabricated
 * facts — content-engine.ts's guardrails keep this to genuine,
 * non-superlative reasons (see ai-content/prompts.ts).
 */
export function renderWhyChooseUs(section: SectionBlock, _ctx: RenderContext): string {
  const title = typeof section.props.title === "string" ? section.props.title : "Why Choose Us";
  const items = Array.isArray(section.props.items) ? (section.props.items as WhyChooseUsItem[]) : [];

  if (items.length === 0) return "";

  const cards = items
    .map(
      (item) => `<li class="card" style="list-style:none;padding:1.25rem;background:var(--color-surface-100);">
      <h3 style="margin:0 0 0.5rem;">${escapeHtml(item.heading)}</h3>
      <p style="margin:0;color:var(--color-text-700);">${escapeHtml(item.description)}</p>
    </li>`,
    )
    .join("\n");

  return `<section class="why-choose-us">
  <h2>${escapeHtml(title)}</h2>
  <ul style="display:grid;grid-template-columns:repeat(auto-fit, minmax(200px, 1fr));gap:1rem;padding:0;">
    ${cards}
  </ul>
</section>`;
}
