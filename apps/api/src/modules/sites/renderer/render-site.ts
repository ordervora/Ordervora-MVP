import { resolveAssetRenditionKey } from "../../../lib/image-processing";
import { prisma } from "../../../lib/prisma";
import { listCategories } from "../../menu/menu.service";
import { THEME_CATALOG } from "../theme-catalog";
import type { SiteDefinition } from "../types";
import { assetUrl } from "./asset-url";
import type { LiveMenuCategory, RenderAssets } from "./render-context";
import { renderPage } from "./render-page";

export async function resolveLiveMenu(restaurantId: string): Promise<LiveMenuCategory[]> {
  const categories = await listCategories(restaurantId);
  return categories.map((category) => ({
    name: category.name,
    items: category.items.map((item) => ({
      name: item.name,
      description: item.description ?? undefined,
      priceCents: item.priceCents,
      isAvailable: item.isAvailable,
    })),
  }));
}

export async function resolveRenderAssets(siteId: string): Promise<RenderAssets> {
  const assets = await prisma.siteAsset.findMany({ where: { siteId }, orderBy: { sortOrder: "asc" } });

  const hero = assets.find((asset) => asset.kind === "HERO");
  const gallery = assets.filter((asset) => asset.kind === "GALLERY");
  const logo = assets.find((asset) => asset.kind === "LOGO");

  // Production Hardening Phase 8: prefer the responsive WebP variant sized
  // for how each kind is actually displayed, falling back to the
  // full-resolution original when no rendition was generated (resizing
  // failed open, or the asset predates this phase).
  return {
    heroUrl: hero ? assetUrl(resolveAssetRenditionKey(hero, "full")) : undefined,
    heroAlt: hero?.altText ?? undefined,
    galleryImages: gallery.map((asset) => ({ url: assetUrl(resolveAssetRenditionKey(asset, "card")), alt: asset.altText ?? "" })),
    logoUrl: logo ? assetUrl(resolveAssetRenditionKey(logo, "card")) : undefined,
  };
}

function resolveTheme(definition: SiteDefinition) {
  const theme = THEME_CATALOG.find((t) => t.key === definition.themeKey && t.version === definition.themeVersion);
  if (!theme) {
    throw new Error(`Unknown theme "${definition.themeKey}" v${definition.themeVersion}`);
  }
  return theme;
}

export interface RenderSiteInput {
  siteId: string;
  restaurantId: string;
  definition: SiteDefinition;
  siteUrl: string;
  noindex?: boolean;
}

/** Resolves live data (menu, assets) then delegates to the pure renderPage() — the DB-touching half of "the same renderer" for one page. */
export async function renderSitePage(input: RenderSiteInput, slug: string): Promise<string | null> {
  const page = input.definition.pages.find((p) => p.slug === slug);
  if (!page) return null;

  const [liveMenu, assets] = await Promise.all([
    resolveLiveMenu(input.restaurantId),
    resolveRenderAssets(input.siteId),
  ]);

  return renderPage({
    ctx: { siteId: input.siteId, definition: input.definition, liveMenu, assets },
    page,
    theme: resolveTheme(input.definition),
    siteUrl: input.siteUrl,
    noindex: input.noindex,
  });
}

/** Renders every page of a definition — used by publishSite's static-generation step. */
export async function renderAllPages(input: RenderSiteInput): Promise<Map<string, string>> {
  const [liveMenu, assets] = await Promise.all([
    resolveLiveMenu(input.restaurantId),
    resolveRenderAssets(input.siteId),
  ]);
  const theme = resolveTheme(input.definition);
  const ctx = { siteId: input.siteId, definition: input.definition, liveMenu, assets };

  const pages = new Map<string, string>();
  for (const page of input.definition.pages) {
    pages.set(page.slug, renderPage({ ctx, page, theme, siteUrl: input.siteUrl, noindex: input.noindex }));
  }
  return pages;
}
