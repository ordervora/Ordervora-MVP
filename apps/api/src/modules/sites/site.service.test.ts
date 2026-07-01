import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    site: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    siteVersion: { findMany: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    siteScore: { create: vi.fn(), findFirst: vi.fn() },
    $transaction: vi.fn(),
  },
}));

vi.mock("./asset-summary", () => ({ getAssetSummary: vi.fn() }));
vi.mock("./scoring/score-aggregator", () => ({ scoreSiteDefinition: vi.fn() }));

import { prisma } from "../../lib/prisma";
import { getAssetSummary } from "./asset-summary";
import { scoreSiteDefinition } from "./scoring/score-aggregator";
import {
  createSite,
  getVersion,
  listReleases,
  listVersions,
  patchDraft,
  publishSite,
  rollbackSite,
  unpublishSite,
  updateSite,
} from "./site.service";
import { PrePublishCheckFailedError, SiteAlreadyExistsError, SiteNotFoundError, SiteVersionNotFoundError } from "./site.errors";
import { THEME_CATALOG } from "./theme-catalog";
import type { SiteDefinition } from "./types";

const mockPrisma = vi.mocked(prisma, { deep: true });
const mockGetAssetSummary = vi.mocked(getAssetSummary);
const mockScoreSiteDefinition = vi.mocked(scoreSiteDefinition);

const theme = THEME_CATALOG.find((t) => t.key === "modern-bistro")!;

function validDefinition(overrides: Partial<SiteDefinition> = {}): SiteDefinition {
  return {
    schemaVersion: 1,
    restaurantName: "Trattoria Bella",
    tagline: "Handmade pasta",
    cuisine: "italian",
    businessType: "bistro",
    styleFamily: "MODERN",
    themeKey: theme.key,
    themeVersion: theme.version,
    colorSeed: theme.tokens.colorSeed,
    typography: theme.tokens.typography,
    facts: { restaurantName: "Trattoria Bella", hasOnlineOrdering: false, hasReservations: false },
    pages: [
      {
        slug: "/",
        title: "Home — Trattoria Bella | Italian",
        metaDescription: "Handmade pasta, made fresh daily in our kitchen.",
        sections: [{ type: "hero", props: {} }, { type: "footer", props: {} }],
      },
    ],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAssetSummary.mockResolvedValue({ totalPhotoAssets: 0, altTextMissingCount: 0, unprocessedRenditionsCount: 0 });
  mockScoreSiteDefinition.mockResolvedValue({ overall: 90, seo: 90, performance: 90, accessibility: 90, brandConsistency: 90, conversion: 90, suggestions: [] });
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
});

describe("createSite", () => {
  it("throws SiteAlreadyExistsError if a site already exists for the restaurant", async () => {
    mockPrisma.site.findUnique.mockResolvedValueOnce({ id: "site-1" } as never);
    await expect(createSite("restaurant-1", "Trattoria Bella")).rejects.toBeInstanceOf(SiteAlreadyExistsError);
  });

  it("slugifies the restaurant name for a new site", async () => {
    mockPrisma.site.findUnique.mockResolvedValueOnce(null); // existing-site check
    mockPrisma.site.findUnique.mockResolvedValueOnce(null); // slug-uniqueness check
    mockPrisma.site.create.mockResolvedValue({ id: "site-1", slug: "trattoria-bella" } as never);

    await createSite("restaurant-1", "Trattoria Bella!!");

    expect(mockPrisma.site.create).toHaveBeenCalledWith({ data: { restaurantId: "restaurant-1", slug: "trattoria-bella", status: "DRAFT" } });
  });

  it("appends a numeric suffix when the slug is already taken", async () => {
    mockPrisma.site.findUnique.mockResolvedValueOnce(null); // existing-site check
    mockPrisma.site.findUnique.mockResolvedValueOnce({ id: "other" } as never); // "trattoria-bella" taken
    mockPrisma.site.findUnique.mockResolvedValueOnce(null); // "trattoria-bella-2" free
    mockPrisma.site.create.mockResolvedValue({ id: "site-1" } as never);

    await createSite("restaurant-1", "Trattoria Bella");

    expect(mockPrisma.site.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ slug: "trattoria-bella-2" }) }));
  });
});

describe("updateSite / listVersions / getVersion (tenant isolation)", () => {
  it("throws SiteNotFoundError for a site owned by a different restaurant", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "someone-else" } as never);
    await expect(updateSite("restaurant-1", "site-1", { slug: "new-slug" })).rejects.toBeInstanceOf(SiteNotFoundError);
  });

  it("throws SiteVersionNotFoundError for a version belonging to another site", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteVersion.findUnique.mockResolvedValue({ id: "v1", siteId: "other-site" } as never);
    await expect(getVersion("restaurant-1", "site-1", "v1")).rejects.toBeInstanceOf(SiteVersionNotFoundError);
  });

  it("lists versions ordered by versionNo desc", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteVersion.findMany.mockResolvedValue([] as never);
    await listVersions("restaurant-1", "site-1");
    expect(mockPrisma.siteVersion.findMany).toHaveBeenCalledWith({ where: { siteId: "site-1" }, orderBy: { versionNo: "desc" } });
  });
});

describe("patchDraft", () => {
  it("throws SiteVersionNotFoundError when there's no active draft", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteVersion.findFirst.mockResolvedValue(null);
    await expect(patchDraft("restaurant-1", "site-1", { tagline: "New tagline" })).rejects.toBeInstanceOf(SiteVersionNotFoundError);
  });

  it("merges the patch into the current definition and re-validates before saving", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteVersion.findFirst.mockResolvedValue({ id: "draft-1", definition: validDefinition() } as never);
    mockPrisma.siteVersion.update.mockResolvedValue({ id: "draft-1" } as never);

    await patchDraft("restaurant-1", "site-1", { tagline: "Updated tagline" });

    const savedDefinition = mockPrisma.siteVersion.update.mock.calls[0][0].data.definition as SiteDefinition;
    expect(savedDefinition.tagline).toBe("Updated tagline");
    expect(savedDefinition.restaurantName).toBe("Trattoria Bella"); // untouched fields preserved
  });

  it("rejects a patch that would make the definition invalid", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteVersion.findFirst.mockResolvedValue({ id: "draft-1", definition: validDefinition() } as never);

    await expect(patchDraft("restaurant-1", "site-1", { colorSeed: "not-a-hex-color" })).rejects.toThrow();
  });
});

describe("publishSite", () => {
  it("throws PrePublishCheckFailedError when photo assets haven't finished processing", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1", brandProfile: null, publishedVersionId: null } as never);
    mockPrisma.siteVersion.findFirst.mockResolvedValue({ id: "draft-1", definition: validDefinition() } as never);
    mockGetAssetSummary.mockResolvedValue({ totalPhotoAssets: 3, altTextMissingCount: 0, unprocessedRenditionsCount: 2 });

    await expect(publishSite("restaurant-1", "site-1")).rejects.toBeInstanceOf(PrePublishCheckFailedError);
  });

  it("rejects a malformed stored definition before running any checks (schema-valid gate)", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1", brandProfile: null, publishedVersionId: null } as never);
    mockPrisma.siteVersion.findFirst.mockResolvedValue({ id: "draft-1", definition: { garbage: true } } as never);

    await expect(publishSite("restaurant-1", "site-1")).rejects.toThrow();
  });

  it("publishes a valid draft and points the site at the new published version", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1", brandProfile: null, publishedVersionId: null } as never);
    mockPrisma.siteVersion.findFirst.mockResolvedValue({ id: "draft-1", definition: validDefinition() } as never);
    mockPrisma.siteVersion.update.mockResolvedValue({ id: "draft-1", status: "PUBLISHED" } as never);
    mockPrisma.siteVersion.findMany.mockResolvedValue([] as never);

    const result = await publishSite("restaurant-1", "site-1");

    expect(result.version).toEqual({ id: "draft-1", status: "PUBLISHED" });
    expect(mockPrisma.site.update).toHaveBeenCalledWith({ where: { id: "site-1" }, data: { status: "PUBLISHED", publishedVersionId: "draft-1" } });
    expect(result.warning).toBeUndefined();
  });

  it("warns (without throwing) when the new score is lower than the live version's score", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1", brandProfile: null, publishedVersionId: "live-1" } as never);
    mockPrisma.siteVersion.findFirst.mockResolvedValue({ id: "draft-1", definition: validDefinition() } as never);
    mockPrisma.siteScore.findFirst.mockResolvedValue({ overall: 95 } as never);
    mockScoreSiteDefinition.mockResolvedValue({ overall: 80, seo: 80, performance: 80, accessibility: 80, brandConsistency: 80, conversion: 80, suggestions: [] });
    mockPrisma.siteVersion.update.mockResolvedValue({ id: "draft-1", status: "PUBLISHED" } as never);
    mockPrisma.siteVersion.findMany.mockResolvedValue([] as never);

    const result = await publishSite("restaurant-1", "site-1");

    expect(result.warning).toMatch(/dropped/i);
    expect(result.scoreDelta).toBe(-15);
    // Still published despite the drop — advisory only, never a hard block.
    expect(mockPrisma.site.update).toHaveBeenCalled();
  });

  it("archives releases beyond the retention count of 10", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1", brandProfile: null, publishedVersionId: null } as never);
    mockPrisma.siteVersion.findFirst.mockResolvedValue({ id: "draft-1", definition: validDefinition() } as never);
    mockPrisma.siteVersion.update.mockResolvedValue({ id: "draft-1", status: "PUBLISHED" } as never);
    const existingReleases = Array.from({ length: 12 }, (_, i) => ({ id: `release-${i}` }));
    mockPrisma.siteVersion.findMany.mockResolvedValue(existingReleases as never);

    await publishSite("restaurant-1", "site-1");

    expect(mockPrisma.siteVersion.updateMany).toHaveBeenCalledWith({
      where: { id: { in: existingReleases.slice(10).map((v) => v.id) } },
      data: { status: "ARCHIVED" },
    });
  });
});

describe("listReleases / rollbackSite / unpublishSite", () => {
  it("rollback only accepts a PUBLISHED version belonging to the same site", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteVersion.findUnique.mockResolvedValue({ id: "v1", siteId: "site-1", status: "ARCHIVED" } as never);
    await expect(rollbackSite("restaurant-1", "site-1", "v1")).rejects.toBeInstanceOf(SiteVersionNotFoundError);
  });

  it("rollback flips the site's publishedVersionId to the target release", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteVersion.findUnique.mockResolvedValue({ id: "v1", siteId: "site-1", status: "PUBLISHED" } as never);
    mockPrisma.site.update.mockResolvedValue({ id: "site-1", publishedVersionId: "v1" } as never);

    await rollbackSite("restaurant-1", "site-1", "v1");

    expect(mockPrisma.site.update).toHaveBeenCalledWith({ where: { id: "site-1" }, data: { status: "PUBLISHED", publishedVersionId: "v1" } });
  });

  it("unpublish requires an existing published version", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1", publishedVersionId: null } as never);
    await expect(unpublishSite("restaurant-1", "site-1")).rejects.toThrow();
  });

  it("unpublish sets status to UNPUBLISHED while retaining publishedVersionId for later republish", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1", publishedVersionId: "v1" } as never);
    mockPrisma.site.update.mockResolvedValue({ id: "site-1", status: "UNPUBLISHED" } as never);

    await unpublishSite("restaurant-1", "site-1");

    expect(mockPrisma.site.update).toHaveBeenCalledWith({ where: { id: "site-1" }, data: { status: "UNPUBLISHED" } });
  });

  it("listReleases only returns PUBLISHED versions", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteVersion.findMany.mockResolvedValue([] as never);

    await listReleases("restaurant-1", "site-1");

    expect(mockPrisma.siteVersion.findMany).toHaveBeenCalledWith({ where: { siteId: "site-1", status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
  });
});
