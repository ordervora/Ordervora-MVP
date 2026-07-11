import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    contentGeneration: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("./ingest", () => ({ ingestRestaurantData: vi.fn() }));
vi.mock("./site.service", () => ({ getDraftDefinition: vi.fn(), getOwnSiteById: vi.fn(), patchDraft: vi.fn() }));
vi.mock("./ai-content/content-engine", () => ({
  generateHero: vi.fn(),
  generateAbout: vi.fn(),
  generateWhyChooseUs: vi.fn(),
  generateFeatured: vi.fn(),
  generateContact: vi.fn(),
  generateFooter: vi.fn(),
  generateSeo: vi.fn(),
  generateCta: vi.fn(),
  generateFaq: vi.fn(),
  generateFullContent: vi.fn(),
}));

import { prisma } from "../../lib/prisma";
import { ingestRestaurantData } from "./ingest";
import { getDraftDefinition, getOwnSiteById, patchDraft } from "./site.service";
import { generateAbout, generateFooter, generateHero, generateFullContent } from "./ai-content/content-engine";
import { generateContent, listContentGenerations, restoreContentGeneration } from "./content-generation.service";
import { ContentGenerationNotFoundError } from "./site.errors";
import type { SiteDefinition } from "./types";

const mockPrisma = vi.mocked(prisma, { deep: true });
const mockIngest = vi.mocked(ingestRestaurantData);
const mockGetDraftDefinition = vi.mocked(getDraftDefinition);
const mockGetOwnSiteById = vi.mocked(getOwnSiteById);
const mockPatchDraft = vi.mocked(patchDraft);
const mockGenerateHero = vi.mocked(generateHero);
const mockGenerateAbout = vi.mocked(generateAbout);
const mockGenerateFooter = vi.mocked(generateFooter);
const mockGenerateFullContent = vi.mocked(generateFullContent);

function definition(): SiteDefinition {
  return {
    schemaVersion: 1,
    restaurantName: "Trattoria Bella",
    tagline: "Handmade pasta",
    cuisine: "italian",
    businessType: "bistro",
    styleFamily: "MODERN",
    themeKey: "modern-bistro",
    themeVersion: 1,
    colorSeed: "#e8590c",
    typography: { display: "Sora", body: "Inter" },
    facts: { restaurantName: "Trattoria Bella", hasOnlineOrdering: false, hasReservations: false },
    pages: [{ slug: "/", title: "Home", metaDescription: "x", sections: [{ type: "hero", props: {} }, { type: "footer", props: {} }] }],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetDraftDefinition.mockResolvedValue({ site: { id: "site-1", restaurantId: "restaurant-1" } as never, definition: definition() });
  mockIngest.mockResolvedValue({ restaurantId: "restaurant-1", restaurantName: "Trattoria Bella", menu: [], photoCount: 0 });
  mockPrisma.contentGeneration.findFirst.mockResolvedValue(null);
  mockPrisma.contentGeneration.create.mockImplementation((async (args: { data: Record<string, unknown> }) => ({ id: "gen-1", createdAt: new Date(), ...args.data })) as never);
  mockPatchDraft.mockResolvedValue({ definition: definition() } as never);
});

describe("generateContent", () => {
  it("generates HERO content, applies it to the draft via patchDraft, and records a ContentGeneration row", async () => {
    mockGenerateHero.mockResolvedValue({ content: { headline: "New headline", subhead: "New subhead" }, provider: "openai" });

    const result = await generateContent("restaurant-1", "site-1", "user-1", { scope: "HERO" });

    expect(mockPatchDraft).toHaveBeenCalledWith("restaurant-1", "site-1", expect.objectContaining({ pages: expect.any(Array) }));
    expect(mockPrisma.contentGeneration.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ siteId: "site-1", scope: "HERO", status: "COMPLETED", provider: "openai", createdById: "user-1" }) }),
    );
    expect(result.generation.scope).toBe("HERO");
  });

  it("assigns versionNo 1 for a site's first generation, and increments for subsequent ones", async () => {
    mockGenerateHero.mockResolvedValue({ content: { headline: "H", subhead: "S" }, provider: null });
    mockPrisma.contentGeneration.findFirst.mockResolvedValue({ versionNo: 3 } as never);

    await generateContent("restaurant-1", "site-1", "user-1", { scope: "HERO" });

    expect(mockPrisma.contentGeneration.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ versionNo: 4 }) }));
  });

  it("defaults pageSlug per scope when none is given (ABOUT -> /about when it exists)", async () => {
    mockGetDraftDefinition.mockResolvedValue({
      site: { id: "site-1", restaurantId: "restaurant-1" } as never,
      definition: { ...definition(), pages: [...definition().pages, { slug: "/about", title: "About", metaDescription: "y", sections: [{ type: "footer", props: {} }] }] },
    });
    mockGenerateAbout.mockResolvedValue({ content: { story: "s", excerpt: "e" }, provider: null });

    await generateContent("restaurant-1", "site-1", "user-1", { scope: "ABOUT" });

    expect(mockPrisma.contentGeneration.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pageSlug: "/about" }) }));
  });

  it("scope FOOTER is not page-scoped — pageSlug is recorded as null", async () => {
    mockGenerateFooter.mockResolvedValue({ content: { description: "d" }, provider: null });

    await generateContent("restaurant-1", "site-1", "user-1", { scope: "FOOTER" });

    expect(mockPrisma.contentGeneration.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pageSlug: null, scope: "FOOTER" }) }));
  });

  it("scope FULL calls generateFullContent and applies the whole bundle", async () => {
    mockGenerateFullContent.mockResolvedValue({
      content: {
        hero: { headline: "H", subhead: "S" },
        about: { story: "s", excerpt: "e" },
        whyChooseUs: { title: "t", items: [] },
        featured: { categoriesTitle: "c", categoriesSubtitle: "cs", productsTitle: "p", productsSubtitle: "ps" },
        contact: { intro: "i" },
        footer: { description: "d" },
        seo: { pageTitle: "pt", metaDescription: "md", keywords: ["a", "b", "c"], ogTitle: "ot", ogDescription: "od" },
        cta: { primaryLabel: "Order Now", options: [] },
        faq: { items: [] },
      },
      provider: "anthropic",
    });

    const result = await generateContent("restaurant-1", "site-1", "user-1", { scope: "FULL" });

    expect(mockGenerateFullContent).toHaveBeenCalled();
    expect(result.generation.scope).toBe("FULL");
    expect(mockPrisma.contentGeneration.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ provider: "anthropic" }) }));
  });
});

describe("listContentGenerations", () => {
  it("uses the tenant-checked site lookup and returns history ordered most-recent-first", async () => {
    mockGetOwnSiteById.mockResolvedValue({ id: "site-1" } as never);
    mockPrisma.contentGeneration.findMany.mockResolvedValue([
      { id: "g2", siteId: "site-1", versionNo: 2, scope: "HERO", pageSlug: "/", status: "COMPLETED", provider: "openai", restoredFromId: null, createdAt: new Date() },
    ] as never);

    const result = await listContentGenerations("restaurant-1", "site-1");

    expect(mockPrisma.contentGeneration.findMany).toHaveBeenCalledWith({ where: { siteId: "site-1" }, orderBy: { versionNo: "desc" } });
    expect(result).toHaveLength(1);
  });
});

describe("restoreContentGeneration", () => {
  it("throws ContentGenerationNotFoundError for a generation belonging to a different site (tenant isolation)", async () => {
    mockPrisma.contentGeneration.findUnique.mockResolvedValue({ id: "gen-1", siteId: "someone-elses-site" } as never);

    await expect(restoreContentGeneration("restaurant-1", "site-1", "gen-1", "user-1")).rejects.toBeInstanceOf(ContentGenerationNotFoundError);
  });

  it("throws ContentGenerationNotFoundError when the generation doesn't exist", async () => {
    mockPrisma.contentGeneration.findUnique.mockResolvedValue(null);
    await expect(restoreContentGeneration("restaurant-1", "site-1", "missing", "user-1")).rejects.toBeInstanceOf(ContentGenerationNotFoundError);
  });

  it("re-applies the original content via patchDraft and records a new row pointing at restoredFromId, without deleting the original", async () => {
    mockPrisma.contentGeneration.findUnique.mockResolvedValue({
      id: "gen-1",
      siteId: "site-1",
      scope: "HERO",
      pageSlug: "/",
      content: { headline: "Old headline", subhead: "Old subhead" },
      provider: "openai",
    } as never);

    const result = await restoreContentGeneration("restaurant-1", "site-1", "gen-1", "user-2");

    expect(mockPatchDraft).toHaveBeenCalledWith("restaurant-1", "site-1", expect.objectContaining({ pages: expect.any(Array) }));
    expect(mockPrisma.contentGeneration.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ restoredFromId: "gen-1", scope: "HERO", createdById: "user-2" }) }),
    );
    expect(mockPrisma.contentGeneration.findUnique).toHaveBeenCalledWith({ where: { id: "gen-1" } });
    expect(result.generation.restoredFromId).toBe("gen-1");
  });
});
