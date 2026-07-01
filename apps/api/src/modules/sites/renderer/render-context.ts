import type { SiteDefinition } from "../types";

export interface LiveMenuCategory {
  name: string;
  items: { name: string; description?: string; priceCents: number; isAvailable: boolean }[];
}

export interface RenderAssets {
  heroUrl?: string;
  heroAlt?: string;
  galleryImages: { url: string; alt: string }[];
  logoUrl?: string;
}

/**
 * Everything a section renderer needs beyond its own `props`. Menu data is
 * live (fetched fresh at render time, not baked into the stored
 * SiteDefinition JSON) per §5: "renders directly from the live menu
 * database — menu edits reflect on the site without regeneration."
 */
export interface RenderContext {
  siteId: string;
  definition: SiteDefinition;
  liveMenu: LiveMenuCategory[];
  assets: RenderAssets;
}

export function formatPrice(cents: number): string {
  return (cents / 100).toFixed(2);
}
