import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    site: { findUnique: vi.fn() },
    siteAsset: { count: vi.fn(), create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    restaurant: { findUniqueOrThrow: vi.fn() },
  },
}));

vi.mock("../../lib/file-storage", () => ({ fileStorage: { save: vi.fn(), read: vi.fn() } }));

import { fileStorage } from "../../lib/file-storage";
import { prisma } from "../../lib/prisma";
import { autoFillMissingAltText, deleteAsset, listAssets, updateAsset, uploadAsset } from "./asset.service";
import { AssetNotFoundError, SiteNotFoundError } from "./site.errors";

const mockPrisma = vi.mocked(prisma, { deep: true });
const mockFileStorage = vi.mocked(fileStorage, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("uploadAsset", () => {
  it("throws SiteNotFoundError for a site owned by a different restaurant", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "someone-else" } as never);
    await expect(uploadAsset("restaurant-1", "site-1", "GALLERY", { buffer: Buffer.from("x"), mimeType: "image/png", originalName: "a.png" })).rejects.toBeInstanceOf(
      SiteNotFoundError,
    );
  });

  it("saves the file via fileStorage and creates a SiteAsset row with the next sortOrder", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockFileStorage.save.mockResolvedValue({ path: "/uploads/sites/abc.png" });
    mockPrisma.siteAsset.count.mockResolvedValue(2);
    mockPrisma.siteAsset.create.mockResolvedValue({ id: "asset-1" } as never);

    await uploadAsset("restaurant-1", "site-1", "GALLERY", { buffer: Buffer.from("x"), mimeType: "image/png", originalName: "a.png" });

    expect(mockPrisma.siteAsset.create).toHaveBeenCalledWith({
      data: { siteId: "site-1", kind: "GALLERY", storageKey: "/uploads/sites/abc.png", sortOrder: 2 },
    });
  });
});

describe("updateAsset / deleteAsset", () => {
  it("throws AssetNotFoundError for an asset belonging to a different site", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteAsset.findUnique.mockResolvedValue({ id: "asset-1", siteId: "other-site" } as never);

    await expect(updateAsset("restaurant-1", "site-1", "asset-1", { altText: "A photo" })).rejects.toBeInstanceOf(AssetNotFoundError);
    await expect(deleteAsset("restaurant-1", "site-1", "asset-1")).rejects.toBeInstanceOf(AssetNotFoundError);
  });

  it("updates alt text on an owned asset", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteAsset.findUnique.mockResolvedValue({ id: "asset-1", siteId: "site-1" } as never);
    mockPrisma.siteAsset.update.mockResolvedValue({ id: "asset-1", altText: "A photo" } as never);

    const result = await updateAsset("restaurant-1", "site-1", "asset-1", { altText: "A photo" });

    expect(result.altText).toBe("A photo");
  });
});

describe("listAssets", () => {
  it("scopes to the caller's own site", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.siteAsset.findMany.mockResolvedValue([] as never);

    await listAssets("restaurant-1", "site-1");

    expect(mockPrisma.siteAsset.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { siteId: "site-1" } }));
  });
});

describe("autoFillMissingAltText", () => {
  it("generates deterministic alt text for every asset missing one, and returns the count fixed", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.restaurant.findUniqueOrThrow.mockResolvedValue({ name: "Trattoria Bella" } as never);
    mockPrisma.siteAsset.findMany.mockResolvedValue([
      { id: "a1", kind: "GALLERY", altText: null },
      { id: "a2", kind: "HERO", altText: null },
    ] as never);
    mockPrisma.siteAsset.update.mockResolvedValue({} as never);

    const count = await autoFillMissingAltText("restaurant-1", "site-1");

    expect(count).toBe(2);
    expect(mockPrisma.siteAsset.update).toHaveBeenCalledWith({ where: { id: "a1" }, data: { altText: "Gallery photo of Trattoria Bella" } });
    expect(mockPrisma.siteAsset.update).toHaveBeenCalledWith({ where: { id: "a2" }, data: { altText: "Hero photo of Trattoria Bella (2)" } });
  });

  it("returns 0 without querying updates when nothing is missing alt text", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.restaurant.findUniqueOrThrow.mockResolvedValue({ name: "Trattoria Bella" } as never);
    mockPrisma.siteAsset.findMany.mockResolvedValue([] as never);

    const count = await autoFillMissingAltText("restaurant-1", "site-1");

    expect(count).toBe(0);
    expect(mockPrisma.siteAsset.update).not.toHaveBeenCalled();
  });
});
