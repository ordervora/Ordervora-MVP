import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    deliveryConfig: { findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
}));

import { prisma } from "../../../lib/prisma";
import { getConfig, updateConfig } from "./delivery-config.service";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getConfig", () => {
  it("lazily creates a default config (pickup on, delivery/dine-in off) on first access", async () => {
    mockPrisma.deliveryConfig.findFirst.mockResolvedValue(null as never);
    mockPrisma.deliveryConfig.create.mockResolvedValue({ id: "dc1", isPickupEnabled: true } as never);

    const config = await getConfig("r1");

    expect(mockPrisma.deliveryConfig.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ restaurantId: "r1", isPickupEnabled: true, isDeliveryEnabled: false }),
      }),
    );
    expect(config.isPickupEnabled).toBe(true);
  });

  it("returns the existing row without creating a duplicate", async () => {
    mockPrisma.deliveryConfig.findFirst.mockResolvedValue({ id: "dc1" } as never);

    await getConfig("r1");

    expect(mockPrisma.deliveryConfig.create).not.toHaveBeenCalled();
  });
});

describe("updateConfig", () => {
  it("ensures the row exists before updating", async () => {
    mockPrisma.deliveryConfig.findFirst.mockResolvedValue({ id: "dc1" } as never);
    mockPrisma.deliveryConfig.update.mockResolvedValue({ id: "dc1", isDeliveryEnabled: true } as never);

    const result = await updateConfig("r1", { isDeliveryEnabled: true });

    expect(result.isDeliveryEnabled).toBe(true);
    expect(mockPrisma.deliveryConfig.update).toHaveBeenCalledWith({
      where: { restaurantId: "r1" },
      data: { isDeliveryEnabled: true },
    });
  });
});
