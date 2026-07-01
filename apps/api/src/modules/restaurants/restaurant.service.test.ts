import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
    restaurant: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../lib/prisma";
import { RestaurantAlreadyExistsError } from "./restaurant.errors";
import { createRestaurant, getOwnRestaurantId } from "./restaurant.service";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getOwnRestaurantId", () => {
  it("returns the user's restaurantId when set", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ restaurantId: "restaurant-1" } as never);

    await expect(getOwnRestaurantId("user-1")).resolves.toBe("restaurant-1");
  });

  it("returns null when the user has no restaurant", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ restaurantId: null } as never);

    await expect(getOwnRestaurantId("user-1")).resolves.toBeNull();
  });
});

describe("createRestaurant", () => {
  it("rejects if the caller already owns a restaurant", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ restaurantId: "existing-restaurant" } as never);

    await expect(createRestaurant("owner-1", { name: "Test" })).rejects.toBeInstanceOf(
      RestaurantAlreadyExistsError,
    );
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("creates a restaurant and links it to the owner when none exists yet", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ restaurantId: null } as never);

    const created = { id: "new-restaurant", ownerId: "owner-1", name: "Test" };
    const txUserUpdate = vi.fn().mockResolvedValue({});
    const txRestaurantCreate = vi.fn().mockResolvedValue(created);
    const txMock = {
      restaurant: { create: txRestaurantCreate },
      user: { update: txUserUpdate },
    };
    const transactionMock = mockPrisma.$transaction as unknown as {
      mockImplementation: (fn: (callback: (tx: typeof txMock) => unknown) => unknown) => void;
    };
    transactionMock.mockImplementation((fn) => fn(txMock));

    const result = await createRestaurant("owner-1", { name: "Test" });

    expect(result).toEqual(created);
    expect(txRestaurantCreate).toHaveBeenCalledWith({ data: { ownerId: "owner-1", name: "Test" } });
    expect(txUserUpdate).toHaveBeenCalledWith({
      where: { id: "owner-1" },
      data: { restaurantId: "new-restaurant" },
    });
  });
});
