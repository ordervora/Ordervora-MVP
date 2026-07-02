import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    fulfillment: { findUnique: vi.fn(), update: vi.fn() },
    user: { findUnique: vi.fn() },
    driverAssignment: { upsert: vi.fn(), findUnique: vi.fn(), update: vi.fn(), count: vi.fn() },
    driverLocationPing: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "../../../lib/prisma";
import {
  DriverAssignmentNotFoundError,
  DriverNotOnStaffError,
  FulfillmentNotFoundError,
} from "./fulfillment.errors";
import {
  assignDriver,
  countActiveDriverAssignments,
  getFulfillment,
  recordLocationPing,
  respondToAssignment,
  updateFulfillmentStatus,
} from "./fulfillment.service";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("tenant isolation", () => {
  it("rejects fetching a fulfillment belonging to another restaurant", async () => {
    mockPrisma.fulfillment.findUnique.mockResolvedValue({ id: "f1", restaurantId: "other" } as never);
    await expect(getFulfillment("my-restaurant", "f1")).rejects.toBeInstanceOf(FulfillmentNotFoundError);
  });

  it("rejects updating status on a fulfillment belonging to another restaurant", async () => {
    mockPrisma.fulfillment.findUnique.mockResolvedValue({ id: "f1", restaurantId: "other" } as never);
    await expect(updateFulfillmentStatus("my-restaurant", "f1", "ASSIGNED")).rejects.toBeInstanceOf(
      FulfillmentNotFoundError,
    );
  });
});

describe("assignDriver", () => {
  it("rejects a driverId that is not RESTAURANT_STAFF for this restaurant", async () => {
    mockPrisma.fulfillment.findUnique.mockResolvedValue({ id: "f1", restaurantId: "r1" } as never);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", restaurantId: "r1", role: "RESTAURANT_OWNER" } as never);

    await expect(assignDriver("r1", "f1", "u1")).rejects.toBeInstanceOf(DriverNotOnStaffError);
  });

  it("rejects a staff member who belongs to a different restaurant", async () => {
    mockPrisma.fulfillment.findUnique.mockResolvedValue({ id: "f1", restaurantId: "r1" } as never);
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      restaurantId: "other",
      role: "RESTAURANT_STAFF",
    } as never);

    await expect(assignDriver("r1", "f1", "u1")).rejects.toBeInstanceOf(DriverNotOnStaffError);
  });

  it("creates a DriverAssignment for valid staff", async () => {
    mockPrisma.fulfillment.findUnique.mockResolvedValue({ id: "f1", restaurantId: "r1" } as never);
    mockPrisma.user.findUnique.mockResolvedValue({ id: "u1", restaurantId: "r1", role: "RESTAURANT_STAFF" } as never);
    mockPrisma.driverAssignment.upsert.mockResolvedValue({ id: "da1", status: "OFFERED" } as never);

    const result = await assignDriver("r1", "f1", "u1");
    expect(result.status).toBe("OFFERED");
  });
});

describe("respondToAssignment", () => {
  it("rejects responding to an assignment that belongs to a different driver", async () => {
    mockPrisma.driverAssignment.findUnique.mockResolvedValue({ id: "da1", driverId: "other-driver" } as never);
    await expect(respondToAssignment("me", "da1", true)).rejects.toBeInstanceOf(DriverAssignmentNotFoundError);
  });
});

describe("recordLocationPing", () => {
  it("writes an append-only ping AND updates the denormalized current position atomically", async () => {
    mockPrisma.driverAssignment.findUnique.mockResolvedValue({ id: "da1" } as never);
    mockPrisma.$transaction.mockResolvedValue([{}, { id: "da1", currentLat: 41.8, currentLng: -87.6 }] as never);

    const result = await recordLocationPing("da1", 41.8, -87.6);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(result.currentLat).toBe(41.8);
  });

  it("rejects a location ping for a nonexistent assignment", async () => {
    mockPrisma.driverAssignment.findUnique.mockResolvedValue(null as never);
    await expect(recordLocationPing("missing", 0, 0)).rejects.toBeInstanceOf(DriverAssignmentNotFoundError);
  });
});

describe("countActiveDriverAssignments", () => {
  it("counts only busy-status assignments on non-terminal fulfillments", async () => {
    mockPrisma.driverAssignment.count.mockResolvedValue(3);

    const count = await countActiveDriverAssignments("r1");

    expect(count).toBe(3);
    expect(mockPrisma.driverAssignment.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { in: ["OFFERED", "ACCEPTED", "EN_ROUTE"] },
        }),
      }),
    );
  });
});
