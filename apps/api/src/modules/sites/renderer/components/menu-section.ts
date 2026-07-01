import { escapeHtml } from "../html-escape";
import { formatPrice, type RenderContext } from "../render-context";
import type { SectionBlock } from "../../types";

function slugifyCategory(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

/**
 * §5 Menu Page Builder — renders from `ctx.liveMenu` (fetched fresh by the
 * caller at render/revalidation time), never from whatever was baked into
 * the stored SiteDefinition at generation time. This is the one section
 * that's the "single source of truth reflects live data" requirement —
 * a price change is visible the next time this page is (re)rendered,
 * without regenerating the site (§5, acceptance criterion #8).
 *
 * Dietary tag badges aren't rendered — MenuItem has no dietary-tag field
 * in this data model yet (see Known Limitations).
 */
export function renderMenuSection(section: SectionBlock, ctx: RenderContext): string {
  const categories = ctx.liveMenu.filter((category) => category.items.some((item) => item.isAvailable));

  if (categories.length === 0) {
    return `<section class="menu"><h2>Menu</h2><p>Menu coming soon.</p></section>`;
  }

  const nav = `<nav class="menu-nav" style="position:sticky;top:0;background:var(--color-surface-50);padding:0.5rem 0;display:flex;gap:1rem;overflow-x:auto;">
    ${categories.map((c) => `<a href="#${slugifyCategory(c.name)}">${escapeHtml(c.name)}</a>`).join("\n")}
  </nav>`;

  const sections = categories
    .map((category) => {
      const items = category.items
        .filter((item) => item.isAvailable)
        .map(
          (item) => `<li style="display:flex;justify-content:space-between;gap:1rem;padding:0.5rem 0;border-bottom:1px solid var(--color-surface-200);">
        <span>
          <strong>${escapeHtml(item.name)}</strong>
          ${item.description ? `<br /><small style="color:var(--color-text-700);">${escapeHtml(item.description)}</small>` : ""}
        </span>
        <span style="white-space:nowrap;font-weight:600;">$${formatPrice(item.priceCents)}</span>
      </li>`,
        )
        .join("\n");

      return `<div id="${slugifyCategory(category.name)}" class="menu-category">
    <h3>${escapeHtml(category.name)}</h3>
    <ul style="list-style:none;padding:0;margin:0;">${items}</ul>
  </div>`;
    })
    .join("\n");

  return `<section class="menu">
  <h2>Menu</h2>
  ${nav}
  ${sections}
</section>`;
}
