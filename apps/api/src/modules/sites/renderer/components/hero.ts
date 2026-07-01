import { escapeHtml } from "../html-escape";
import type { RenderContext } from "../render-context";
import type { SectionBlock } from "../../types";

/** §3 Hero Builder — 3 variants; auto-contrast scrim when a hero photo is present. */
export function renderHero(section: SectionBlock, ctx: RenderContext): string {
  const headline = typeof section.props.headline === "string" ? section.props.headline : ctx.definition.tagline;
  const subhead = typeof section.props.subhead === "string" ? section.props.subhead : "";
  const ctaLabel = typeof section.props.ctaLabel === "string" ? section.props.ctaLabel : "View Menu";
  const scrimOpacity = typeof section.props.scrimOpacity === "number" ? section.props.scrimOpacity : 0.45;
  const variant = section.variant ?? "minimal-typographic";
  const hasImage = variant !== "minimal-typographic" && Boolean(ctx.assets.heroUrl);

  const ctaHtml = `<a class="cta" href="#primary-action">${escapeHtml(ctaLabel)}</a>`;

  if (hasImage) {
    return `<section class="hero hero--${escapeHtml(variant)}" style="position:relative;">
  <img src="${escapeHtml(ctx.assets.heroUrl!)}" alt="${escapeHtml(ctx.assets.heroAlt ?? ctx.definition.restaurantName)}" style="width:100%;height:60vh;object-fit:cover;display:block;" />
  <div style="position:absolute;inset:0;background:rgba(0,0,0,${scrimOpacity});display:flex;flex-direction:column;justify-content:center;align-items:${
    variant === "split" ? "flex-start" : "center"
  };padding:2rem;text-align:${variant === "split" ? "left" : "center"};">
    <h1 style="color:#ffffff;margin:0 0 0.5rem;">${escapeHtml(headline)}</h1>
    <p style="color:#ffffff;margin:0 0 1rem;">${escapeHtml(subhead)}</p>
    ${ctaHtml}
  </div>
</section>`;
  }

  return `<section class="hero hero--minimal-typographic" style="text-align:center;padding:4rem 1rem;">
  <h1>${escapeHtml(headline)}</h1>
  <p>${escapeHtml(subhead)}</p>
  ${ctaHtml}
</section>`;
}
