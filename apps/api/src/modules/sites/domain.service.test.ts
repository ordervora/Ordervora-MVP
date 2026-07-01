import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockResolveCname } = vi.hoisted(() => ({ mockResolveCname: vi.fn() }));

vi.mock("node:dns/promises", () => ({ resolveCname: mockResolveCname }));

vi.mock("../../lib/prisma", () => ({
  prisma: {
    site: { findUnique: vi.fn() },
    domain: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), delete: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma";
import { addDomain, checkDnsOwnership, removeDomain, setPrimaryDomain, verifyDomain } from "./domain.service";
import { DomainAlreadyClaimedError, DomainNotFoundError } from "./site.errors";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => fn(mockPrisma));
});

describe("checkDnsOwnership", () => {
  it("returns true when the CNAME points at our edge target", async () => {
    mockResolveCname.mockResolvedValue(["edge.sites.ordervora.example"]);
    expect(await checkDnsOwnership("menu.example.com")).toBe(true);
  });

  it("returns false when the CNAME points elsewhere", async () => {
    mockResolveCname.mockResolvedValue(["somewhere-else.example.com"]);
    expect(await checkDnsOwnership("menu.example.com")).toBe(false);
  });

  it("returns false (not throw) when DNS resolution fails", async () => {
    mockResolveCname.mockRejectedValue(new Error("NXDOMAIN"));
    await expect(checkDnsOwnership("menu.example.com")).resolves.toBe(false);
  });
});

describe("addDomain", () => {
  it("throws DomainAlreadyClaimedError when the hostname is already registered to any site", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.domain.findUnique.mockResolvedValue({ id: "existing" } as never);

    await expect(addDomain("restaurant-1", "site-1", "menu.example.com")).rejects.toBeInstanceOf(DomainAlreadyClaimedError);
  });

  it("creates a PENDING/PENDING domain row", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.domain.findUnique.mockResolvedValue(null);
    mockPrisma.domain.create.mockResolvedValue({ id: "domain-1" } as never);

    await addDomain("restaurant-1", "site-1", "menu.example.com");

    expect(mockPrisma.domain.create).toHaveBeenCalledWith({
      data: { siteId: "site-1", hostname: "menu.example.com", type: "CUSTOM", verificationStatus: "PENDING", tlsStatus: "PENDING" },
    });
  });
});

describe("verifyDomain", () => {
  it("throws DomainNotFoundError for a domain belonging to a different site", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.domain.findUnique.mockResolvedValue({ id: "d1", siteId: "other-site" } as never);

    await expect(verifyDomain("restaurant-1", "site-1", "d1")).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("sets verificationStatus to VERIFIED when DNS checks out", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.domain.findUnique.mockResolvedValue({ id: "d1", siteId: "site-1", hostname: "menu.example.com" } as never);
    mockResolveCname.mockResolvedValue(["edge.sites.ordervora.example"]);
    mockPrisma.domain.update.mockResolvedValue({ id: "d1", verificationStatus: "VERIFIED" } as never);

    const result = await verifyDomain("restaurant-1", "site-1", "d1");

    expect(result.verificationStatus).toBe("VERIFIED");
  });

  it("sets verificationStatus to FAILED when DNS doesn't check out", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.domain.findUnique.mockResolvedValue({ id: "d1", siteId: "site-1", hostname: "menu.example.com" } as never);
    mockResolveCname.mockRejectedValue(new Error("NXDOMAIN"));
    mockPrisma.domain.update.mockResolvedValue({ id: "d1", verificationStatus: "FAILED" } as never);

    const result = await verifyDomain("restaurant-1", "site-1", "d1");

    expect(result.verificationStatus).toBe("FAILED");
  });
});

describe("setPrimaryDomain", () => {
  it("rejects a domain that hasn't been verified yet", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.domain.findUnique.mockResolvedValue({ id: "d1", siteId: "site-1", verificationStatus: "PENDING" } as never);

    await expect(setPrimaryDomain("restaurant-1", "site-1", "d1")).rejects.toBeInstanceOf(DomainNotFoundError);
  });

  it("clears isPrimary on other domains before setting the new one", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.domain.findUnique.mockResolvedValue({ id: "d1", siteId: "site-1", verificationStatus: "VERIFIED" } as never);
    mockPrisma.domain.update.mockResolvedValue({ id: "d1", isPrimary: true } as never);

    await setPrimaryDomain("restaurant-1", "site-1", "d1");

    expect(mockPrisma.domain.updateMany).toHaveBeenCalledWith({ where: { siteId: "site-1" }, data: { isPrimary: false } });
    expect(mockPrisma.domain.update).toHaveBeenCalledWith({ where: { id: "d1" }, data: { isPrimary: true } });
  });
});

describe("removeDomain", () => {
  it("only deletes a domain that belongs to the caller's own site", async () => {
    mockPrisma.site.findUnique.mockResolvedValue({ id: "site-1", restaurantId: "restaurant-1" } as never);
    mockPrisma.domain.findUnique.mockResolvedValue({ id: "d1", siteId: "other-site" } as never);

    await expect(removeDomain("restaurant-1", "site-1", "d1")).rejects.toBeInstanceOf(DomainNotFoundError);
    expect(mockPrisma.domain.delete).not.toHaveBeenCalled();
  });
});
