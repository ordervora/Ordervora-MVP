import { ImportSourceType } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { NotImplementedError } from "../import.errors";
import { importAdapterRegistry } from "./registry";

describe("importAdapterRegistry", () => {
  it("resolves an adapter for every source type", () => {
    for (const sourceType of Object.values(ImportSourceType)) {
      expect(importAdapterRegistry.get(sourceType)).toBeDefined();
    }
  });

  it("marks PDF and IMAGE as implemented", () => {
    expect(importAdapterRegistry.get(ImportSourceType.PDF)?.implemented).toBe(true);
    expect(importAdapterRegistry.get(ImportSourceType.IMAGE)?.implemented).toBe(true);
  });

  it("marks Website, Google Maps, DoorDash, Uber Eats, and Grubhub as not implemented", () => {
    const deferred = [
      ImportSourceType.WEBSITE,
      ImportSourceType.GOOGLE_MAPS,
      ImportSourceType.DOORDASH,
      ImportSourceType.UBER_EATS,
      ImportSourceType.GRUBHUB,
    ];

    for (const sourceType of deferred) {
      expect(importAdapterRegistry.get(sourceType)?.implemented).toBe(false);
    }
  });

  it("rejects with NotImplementedError when a stub adapter's extract() is called", async () => {
    const adapter = importAdapterRegistry.get(ImportSourceType.WEBSITE);
    await expect(adapter?.extract({ kind: "url", url: "https://example.com" })).rejects.toBeInstanceOf(
      NotImplementedError,
    );
  });
});
