import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../restaurants/restaurant.service", () => ({
  getOwnRestaurantId: vi.fn(),
}));

vi.mock("./fulfillment.service", () => ({
  getFulfillment: vi.fn(),
  getDriverAssignmentByFulfillment: vi.fn(),
  recordLocationPing: vi.fn(),
  assignDriver: vi.fn(),
  updateFulfillmentStatus: vi.fn(),
}));

vi.mock("./provider.service", () => ({
  listProviders: vi.fn(),
  connectProvider: vi.fn(),
  disconnectProvider: vi.fn(),
}));

import type { Request, Response } from "express";
import { getOwnRestaurantId } from "../../restaurants/restaurant.service";
import { locationPingHandler } from "./fulfillment.controller";
import { getDriverAssignmentByFulfillment, getFulfillment, recordLocationPing } from "./fulfillment.service";

function mockRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), send: vi.fn() };
  return res as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("locationPingHandler", () => {
  it("lets the assigned driver post a location update", async () => {
    vi.mocked(getOwnRestaurantId).mockResolvedValue("r1");
    vi.mocked(getFulfillment).mockResolvedValue({ id: "f1", restaurantId: "r1" } as never);
    vi.mocked(getDriverAssignmentByFulfillment).mockResolvedValue({ id: "da1", driverId: "driver-1" } as never);
    vi.mocked(recordLocationPing).mockResolvedValue({ id: "da1" } as never);

    const req = {
      user: { id: "driver-1" },
      params: { id: "f1" },
      body: { lat: 41.8, lng: -87.6 },
    } as unknown as Request;
    const res = mockRes();

    await locationPingHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it("rejects a staff member who is not the assigned driver with 403, not 404", async () => {
    vi.mocked(getOwnRestaurantId).mockResolvedValue("r1");
    vi.mocked(getFulfillment).mockResolvedValue({ id: "f1", restaurantId: "r1" } as never);
    vi.mocked(getDriverAssignmentByFulfillment).mockResolvedValue({ id: "da1", driverId: "driver-1" } as never);

    const req = {
      user: { id: "some-other-staffer" },
      params: { id: "f1" },
      body: { lat: 41.8, lng: -87.6 },
    } as unknown as Request;
    const res = mockRes();

    await locationPingHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(recordLocationPing).not.toHaveBeenCalled();
  });
});
