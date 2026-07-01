import { escapeHtml } from "../html-escape";
import type { RenderContext } from "../render-context";
import type { SectionBlock } from "../../types";

/** Social links are omitted — the Restaurant data model has no social-profile fields yet (see Known Limitations). */
export function renderFooter(section: SectionBlock, ctx: RenderContext): string {
  const restaurantName = typeof section.props.restaurantName === "string" ? section.props.restaurantName : ctx.definition.restaurantName;
  const year = new Date().getFullYear();

  return `<footer style="padding:2rem 0;text-align:center;color:var(--color-text-700);border-top:1px solid var(--color-surface-200);">
  <p>&copy; ${year} ${escapeHtml(restaurantName)}</p>
</footer>`;
}
