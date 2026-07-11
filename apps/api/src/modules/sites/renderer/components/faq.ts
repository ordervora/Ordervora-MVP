import { escapeHtml } from "../html-escape";
import type { RenderContext } from "../render-context";
import type { SectionBlock } from "../../types";

interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Sprint 20A Task 6 — AI-generated (or owner-edited) FAQ, backed by real
 * `<details>/<summary>` elements: an accordion with zero JavaScript,
 * matching the renderer's existing "no framework needed" philosophy
 * (gallery.ts's native `<dialog>` lightbox is the same idea).
 */
export function renderFaq(section: SectionBlock, _ctx: RenderContext): string {
  const title = typeof section.props.title === "string" ? section.props.title : "Frequently Asked Questions";
  const items = Array.isArray(section.props.items) ? (section.props.items as FaqItem[]) : [];

  if (items.length === 0) return "";

  const entries = items
    .map(
      (item) => `<details style="border-bottom:1px solid var(--color-surface-200);padding:1rem 0;">
      <summary style="cursor:pointer;font-weight:600;list-style:none;">${escapeHtml(item.question)}</summary>
      <p style="margin:0.75rem 0 0;color:var(--color-text-700);">${escapeHtml(item.answer)}</p>
    </details>`,
    )
    .join("\n");

  return `<section class="faq">
  <h2>${escapeHtml(title)}</h2>
  <div>
    ${entries}
  </div>
</section>`;
}
