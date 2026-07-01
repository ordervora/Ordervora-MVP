import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../sites/site.service", () => ({ revalidatePublishedSite: vi.fn() }));
vi.mock("./restaurant.service", () => ({
  createRestaurant: vi.fn(),
  getOwnRestaurant: vi.fn(),
  listAllRestaurants: vi.fn(),
  updateOwnRestaurant: vi.fn(),
}));

import { revalidatePublishedSite } from "../sites/site.service";
import { updateMine } from "./restaurant.controller";
import { updateOwnRestaurant } from "./restaurant.service";

const mockRevalidate = vi.mocked(revalidatePublishedSite);
const mockUpdateOwnRestaurant = vi.mocked(updateOwnRestaurant);

function mockRes() {
  const res: Record<string, unknown> = {};
  res.status = vi.fn(() => res);
  res.json = vi.fn(() => res);
  return res as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRevalidate.mockResolvedValue(undefined);
});

describe("restaurant.controller revalidation hook (§19.4 profile changes)", () => {
  it("triggers revalidation for the updated restaurant after a profile change", async () => {
    mockUpdateOwnRestaurant.mockResolvedValue({ id: "restaurant-1", name: "New Name" } as never);
    const req = { user: { id: "user-1" }, body: { name: "New Name" } } as never;

    await updateMine(req, mockRes());

    expect(mockRevalidate).toHaveBeenCalledWith("restaurant-1");
  });

  it("swallows a revalidation failure rather than failing the request", async () => {
    mockUpdateOwnRestaurant.mockResolvedValue({ id: "restaurant-1", name: "New Name" } as never);
    mockRevalidate.mockRejectedValue(new Error("render failed"));
    const req = { user: { id: "user-1" }, body: { name: "New Name" } } as never;

    await expect(updateMine(req, mockRes())).resolves.toBeUndefined();
  });
});
