import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./google-maps/resolve-place-id", () => ({
  resolvePlaceId: vi.fn(),
}));

vi.mock("./google-maps/places-client", () => ({
  getPlaceDetails: vi.fn(),
  getPlacePhoto: vi.fn(),
}));

vi.mock("../vision-extractor", () => ({
  extractMenuFromImages: vi.fn(),
}));

import { extractMenuFromImages } from "../vision-extractor";
import { getPlaceDetails, getPlacePhoto } from "./google-maps/places-client";
import { resolvePlaceId } from "./google-maps/resolve-place-id";
import { GoogleMapsImportAdapter } from "./google-maps.adapter";

const mockResolvePlaceId = vi.mocked(resolvePlaceId);
const mockGetPlaceDetails = vi.mocked(getPlaceDetails);
const mockGetPlacePhoto = vi.mocked(getPlacePhoto);
const mockExtractImages = vi.mocked(extractMenuFromImages);

const adapter = new GoogleMapsImportAdapter();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GoogleMapsImportAdapter", () => {
  it("reports itself as implemented and url-based", () => {
    expect(adapter.implemented).toBe(true);
    expect(adapter.inputKind).toBe("url");
  });

  it("builds a businessProfile from Places API fields when no photos exist", async () => {
    mockResolvePlaceId.mockResolvedValue("abc");
    mockGetPlaceDetails.mockResolvedValue({
      name: "Joe's Diner",
      address: "123 Main St",
      phone: "555-0100",
      photoNames: [],
    });

    const result = await adapter.extract({ kind: "url", url: "https://maps.google.com/?place_id=abc" });

    expect(result.businessProfile).toEqual({ name: "Joe's Diner", address: "123 Main St", phone: "555-0100" });
    expect(result.categories).toEqual([]);
    expect(mockGetPlacePhoto).not.toHaveBeenCalled();
  });

  it("merges profile fields with menu items extracted from up to 3 listing photos", async () => {
    mockResolvePlaceId.mockResolvedValue("abc");
    mockGetPlaceDetails.mockResolvedValue({
      name: "Joe's Diner",
      photoNames: ["p1", "p2", "p3", "p4"],
    });
    mockGetPlacePhoto.mockResolvedValue(Buffer.from("photo-bytes"));
    mockExtractImages.mockResolvedValue({ categories: [{ name: "Mains", items: [] }] });

    const result = await adapter.extract({ kind: "url", url: "https://maps.google.com/?place_id=abc" });

    expect(mockGetPlacePhoto).toHaveBeenCalledTimes(3);
    expect(result.businessProfile?.name).toBe("Joe's Diner");
    expect(result.categories).toEqual([
      { name: "Mains", items: [] },
      { name: "Mains", items: [] },
      { name: "Mains", items: [] },
    ]);
  });

  it("does not fail the whole import when one photo fails to fetch or extract", async () => {
    mockResolvePlaceId.mockResolvedValue("abc");
    mockGetPlaceDetails.mockResolvedValue({ name: "Joe's Diner", photoNames: ["p1", "p2"] });
    mockGetPlacePhoto.mockRejectedValueOnce(new Error("photo unavailable"));
    mockGetPlacePhoto.mockResolvedValueOnce(Buffer.from("photo-bytes"));
    mockExtractImages.mockResolvedValue({ categories: [{ name: "Mains", items: [] }] });

    const result = await adapter.extract({ kind: "url", url: "https://maps.google.com/?place_id=abc" });

    expect(result.categories).toEqual([{ name: "Mains", items: [] }]);
  });

  it("rejects a non-url input", async () => {
    await expect(
      adapter.extract({ kind: "file", buffer: Buffer.from(""), mimeType: "application/pdf" }),
    ).rejects.toThrow();
  });
});
