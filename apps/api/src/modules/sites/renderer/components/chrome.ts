import { escapeHtml } from "../html-escape";
import { computeCtaLabel } from "../../cta";
import type { RenderContext } from "../render-context";

const NAV_LABELS: Record<string, string> = {
  "/": "Home",
  "/menu": "Menu",
  "/about": "About",
  "/contact": "Contact",
  "/gallery": "Gallery",
};

/** §22/25 SiteHeader/Nav — present on every page, not a section block. */
export function renderHeaderNav(ctx: RenderContext): string {
  const links = ctx.definition.pages
    .map((page) => `<a href="${escapeHtml(page.slug)}">${escapeHtml(NAV_LABELS[page.slug] ?? page.slug)}</a>`)
    .join("\n");

  return `<header style="display:flex;justify-content:space-between;align-items:center;padding:1rem;">
  <a href="/" style="font-family:var(--font-display);font-weight:700;font-size:var(--step-1);">${escapeHtml(
    ctx.definition.restaurantName,
  )}</a>
  <nav style="display:flex;gap:1rem;">${links}</nav>
</header>`;
}

/**
 * §16 Mobile-First Design — sticky bottom action bar: Call / Directions /
 * Order-or-Menu, present on every page below 768px (theme-css.ts hides it
 * at desktop widths via a media query).
 */
export function renderMobileActionBar(ctx: RenderContext): string {
  const { facts } = ctx.definition;
  const items: string[] = [];

  if (facts.phone) {
    items.push(`<a href="tel:${escapeHtml(facts.phone.replace(/[^\d+]/g, ""))}" class="cta">Call</a>`);
  }
  if (facts.address) {
    items.push(
      `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(facts.address)}" class="cta" target="_blank" rel="noopener noreferrer">Directions</a>`,
    );
  }
  items.push(`<a href="#primary-action" class="cta">${escapeHtml(computeCtaLabel(facts, ctx.definition.styleFamily))}</a>`);

  return `<div class="mobile-action-bar">${items.join("\n")}</div>`;
}
