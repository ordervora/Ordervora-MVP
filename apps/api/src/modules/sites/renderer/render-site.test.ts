import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: { siteAsset: { findMany: vi.fn() } },
}));

vi.mock("../../menu/menu.service", () => ({ listCategories: vi.fn() }));

import { prisma } from "../../../lib/prisma";
import { listCategories } from "../../menu/menu.service";
import { renderAllPages, renderSitePage, resolveLiveMenu, resolveRenderAssets } from "./render-site";
import { THEME_CATALOG } from "../theme-catalog";
import type { SiteDefinition } from "../types";

const mockPrisma = vi.mocked(prisma, { deep: true });
const mockListCategories = vi.mocked(listCategories);

const theme = THEME_CATALOG.find((t) => t.key === "modern-bistro")!;

function definition(): SiteDefinition {
  return {
    schemaVersion: 1,
    restaurantName: "Trattoria Bella",
    tagline: "x",
    cuisine: "italian",
    businessType: "bistro",
    styleFamily: "MODERN",
    themeKey: theme.key,
    themeVersion: theme.version,
    colorSeed: theme.tokens.colorSeed,
    typography: theme.tokens.typography,
    facts: { restaurantName: "Trattoria Bella", hasOnlineOrdering: false, hasReservations: false },
    pages: [
      { slug: "/", title: "Home", metaDescription: "x", sections: [{ type: "footer", props: {} }] },
      { slug: "/menu", title: "Menu", metaDescription: "x", sections: [{ type: "menu", props: {} }] },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockListCategories.mockResolvedValue([]);
  mockPrisma.siteAsset.findMany.mockResolvedValue([]);
});

describe("resolveLiveMenu", () => {
  it("maps categories/items from menu.service into the renderer's shape", async () => {
    mockListCategories.mockResolvedValue([
      { id: "c1", restaurantId: "r1", name: "Mains", sortOrder: 0, createdAt: new Date(), updatedAt: new Date(), items: [
        { id: "i1", restaurantId: "r1", categoryId: "c1", name: "Spaghetti", description: null, priceCents: 1500, isAvailable: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      ] },
    ] as never);

    const result = await resolveLiveMenu("r1");
    expect(result).toEqual([{ name: "Mains", items: [{ name: "Spaghetti", description: undefined, priceCents: 1500, isAvailable: true }] }]);
  });
});

describe("resolveRenderAssets", () => {
  it("picks the first HERO asset and all GALLERY assets", async () => {
    mockPrisma.siteAsset.findMany.mockResolvedValue([
      { kind: "HERO", storageKey: "/uploads/hero.png", altText: "Hero" },
      { kind: "GALLERY", storageKey: "/uploads/g1.png", altText: "G1" },
      { kind: "GALLERY", storageKey: "/uploads/g2.png", altText: null },
      { kind: "LOGO", storageKey: "/uploads/logo.png", altText: null },
    ] as never);

    const assets = await resolveRenderAssets("site-1");
    expect(assets.heroUrl).toBe("/assets/hero.png");
    expect(assets.heroAlt).toBe("Hero");
    expect(assets.galleryImages).toEqual([
      { url: "/assets/g1.png", alt: "G1" },
      { url: "/assets/g2.png", alt: "" },
    ]);
    expect(assets.logoUrl).toBe("/assets/logo.png");
  });

  it("returns undefined hero/logo and an empty gallery when there are no assets", async () => {
    const assets = await resolveRenderAssets("site-1");
    expect(assets).toEqual({ heroUrl: undefined, heroAlt: undefined, galleryImages: [], logoUrl: undefined });
  });
});

describe("renderSitePage", () => {
  it("returns null for a slug that doesn't exist in the definition", async () => {
    const result = await renderSitePage({ siteId: "site-1", restaurantId: "r1", definition: definition(), siteUrl: "https://example.com" }, "/nope");
    expect(result).toBeNull();
  });

  it("renders the requested page with live menu data resolved", async () => {
    mockListCategories.mockResolvedValue([
      { id: "c1", restaurantId: "r1", name: "Mains", sortOrder: 0, createdAt: new Date(), updatedAt: new Date(), items: [
        { id: "i1", restaurantId: "r1", categoryId: "c1", name: "Spaghetti", description: null, priceCents: 1500, isAvailable: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      ] },
    ] as never);

    const html = await renderSitePage({ siteId: "site-1", restaurantId: "r1", definition: definition(), siteUrl: "https://example.com" }, "/menu");
    expect(html).toContain("Spaghetti");
  });
});

describe("renderAllPages", () => {
  it("renders every page in the definition, keyed by slug", async () => {
    const pages = await renderAllPages({ siteId: "site-1", restaurantId: "r1", definition: definition(), siteUrl: "https://example.com" });
    expect(Array.from(pages.keys())).toEqual(["/", "/menu"]);
    expect(pages.get("/")).toContain("<!DOCTYPE html>");
  });
});
