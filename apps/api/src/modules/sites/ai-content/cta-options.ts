import type { SiteFacts } from "../types";
import type { CtaContent } from "./types";

/**
 * Sprint 20A Task 6 CTA Generator. Deterministic and business-type-aware,
 * not LLM-generated — same principle `cta.ts`'s existing `computeCtaLabel`
 * already documents ("the underlying action is decided purely from
 * structured facts, never guessed by an LLM"). This is a *separate*
 * function from `computeCtaLabel` (kept completely untouched) because it
 * covers the full non-restaurant business-type taxonomy Task 6 asks for,
 * where `computeCtaLabel` only ever chose between order/reserve/menu.
 *
 * Unknown/future business types (anything not in the map below) fall back
 * to a generic retail-flavored option set rather than throwing, so a
 * business type added after this file was written still gets sensible
 * CTAs.
 */
const CTA_OPTIONS_BY_BUSINESS_TYPE: Record<string, string[]> = {
  RESTAURANT: ["Order Now", "View Menu", "Reserve Table"],
  COFFEE_SHOP: ["Order Now", "View Menu", "Find Us"],
  DELI: ["Order Now", "View Menu", "See Specials"],
  BAKERY: ["Order Now", "View Menu", "See Today's Bakes"],
  PIZZA: ["Order Now", "View Menu", "Build Your Pizza"],
  VAPE_SHOP: ["Shop Online", "View Collection", "Shop Now"],
  CONVENIENCE_STORE: ["Shop Now", "View Products", "Find Store"],
  RETAIL: ["Shop Now", "Browse Products", "View Collection"],
  OTHER: ["Shop Now", "Learn More", "Contact Us"],
};

const GENERIC_FALLBACK = ["Shop Now", "Browse Products", "Learn More"];

/**
 * `facts.hasOnlineOrdering`/`hasReservations` (never guessed) still take
 * priority within a food-service business type, matching the exact logic
 * `computeCtaLabel` uses today — this only changes the option *set* per
 * business type, not that structural rule.
 */
export function computeCtaOptions(businessType: string | undefined, facts: SiteFacts): CtaContent {
  const key = (businessType ?? "OTHER").toUpperCase();
  const options = CTA_OPTIONS_BY_BUSINESS_TYPE[key] ?? GENERIC_FALLBACK;

  const isFoodService = key in CTA_OPTIONS_BY_BUSINESS_TYPE && key !== "VAPE_SHOP" && key !== "CONVENIENCE_STORE" && key !== "RETAIL" && key !== "OTHER";

  let primaryLabel = options[0];
  if (isFoodService) {
    if (facts.hasOnlineOrdering) primaryLabel = options[0];
    else if (facts.hasReservations && options.includes("Reserve Table")) primaryLabel = "Reserve Table";
    else primaryLabel = options[1] ?? options[0];
  }

  const secondaryLabel = options.find((label) => label !== primaryLabel);

  return { primaryLabel, secondaryLabel, options };
}
