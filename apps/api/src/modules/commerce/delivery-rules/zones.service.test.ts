import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    deliveryZone: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    deliveryRule: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}));

import { prisma } from "../../../lib/prisma";
import { DeliveryRuleNotFoundError, DeliveryZoneNotFoundError, InvalidFallbackRuleError } from "./delivery-zones.errors";
import { createRule, deleteZone, updateRule, updateZone } from "./zones.service";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tenant isolation", () => {
  it("rejects updating a zone belonging to another restaurant", async () => {
    mockPrisma.deliveryZone.findUnique.mockResolvedValue({ id: "z1", restaurantId: "other" } as never);
    await expect(updateZone("my-restaurant", "z1", { name: "Hacked" })).rejects.toBeInstanceOf(
      DeliveryZoneNotFoundError,
    );
  });

  it("rejects deleting a zone belonging to another restaurant", async () => {
    mockPrisma.deliveryZone.findUnique.mockResolvedValue({ id: "z1", restaurantId: "other" } as never);
    await expect(deleteZone("my-restaurant", "z1")).rejects.toBeInstanceOf(DeliveryZoneNotFoundError);
  });

  it("rejects updating a rule belonging to another restaurant", async () => {
    mockPrisma.deliveryRule.findUnique.mockResolvedValue({ id: "dr1", restaurantId: "other" } as never);
    await expect(updateRule("my-restaurant", "dr1", {})).rejects.toBeInstanceOf(DeliveryRuleNotFoundError);
  });
});

describe("fallbackToRuleId validation", () => {
  it("rejects creating a rule whose fallback points to another restaurant's rule", async () => {
    mockPrisma.deliveryRule.findUnique.mockResolvedValue({ id: "fb1", restaurantId: "other" } as never);

    await expect(
      createRule("my-restaurant", { fulfillmentMethod: "RESTAURANT_DRIVER", fallbackToRuleId: "fb1" }),
    ).rejects.toBeInstanceOf(InvalidFallbackRuleError);
  });

  it("rejects creating a rule whose fallback does not exist", async () => {
    mockPrisma.deliveryRule.findUnique.mockResolvedValue(null as never);

    await expect(
      createRule("my-restaurant", { fulfillmentMethod: "RESTAURANT_DRIVER", fallbackToRuleId: "missing" }),
    ).rejects.toBeInstanceOf(InvalidFallbackRuleError);
  });

  it("allows a fallback that belongs to the same restaurant", async () => {
    mockPrisma.deliveryRule.findUnique.mockResolvedValue({ id: "fb1", restaurantId: "r1" } as never);
    mockPrisma.deliveryRule.create.mockResolvedValue({ id: "new-rule" } as never);

    const result = await createRule("r1", { fulfillmentMethod: "RESTAURANT_DRIVER", fallbackToRuleId: "fb1" });

    expect(result.id).toBe("new-rule");
  });
});
