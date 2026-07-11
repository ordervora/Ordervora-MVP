import { describe, expect, it } from "vitest";
import type { SiteFacts } from "../types";
import { computeCtaOptions } from "./cta-options";

function facts(overrides: Partial<SiteFacts> = {}): SiteFacts {
  return { restaurantName: "Trattoria Bella", hasOnlineOrdering: false, hasReservations: false, ...overrides };
}

describe("computeCtaOptions", () => {
  it("returns Order Now for a restaurant with online ordering", () => {
    const result = computeCtaOptions("RESTAURANT", facts({ hasOnlineOrdering: true }));
    expect(result.primaryLabel).toBe("Order Now");
    expect(result.options).toContain("Reserve Table");
  });

  it("returns Reserve Table for a restaurant with reservations but no online ordering", () => {
    const result = computeCtaOptions("RESTAURANT", facts({ hasReservations: true }));
    expect(result.primaryLabel).toBe("Reserve Table");
  });

  it("falls back to View Menu for a restaurant with neither ordering nor reservations", () => {
    const result = computeCtaOptions("RESTAURANT", facts());
    expect(result.primaryLabel).toBe("View Menu");
  });

  it("returns Shop Online for a vape shop, regardless of ordering/reservation facts", () => {
    const result = computeCtaOptions("VAPE_SHOP", facts({ hasOnlineOrdering: true, hasReservations: true }));
    expect(result.primaryLabel).toBe("Shop Online");
    expect(result.options).toEqual(["Shop Online", "View Collection", "Shop Now"]);
  });

  it("returns Shop Now for retail", () => {
    const result = computeCtaOptions("RETAIL", facts());
    expect(result.primaryLabel).toBe("Shop Now");
    expect(result.options).toContain("Browse Products");
  });

  it("returns Shop Now for convenience stores", () => {
    const result = computeCtaOptions("CONVENIENCE_STORE", facts());
    expect(result.primaryLabel).toBe("Shop Now");
  });

  it("falls back to a generic retail-flavored option set for an unrecognized/future business type", () => {
    const result = computeCtaOptions("GROCERY", facts());
    expect(result.options).toEqual(["Shop Now", "Browse Products", "Learn More"]);
  });

  it("falls back gracefully when businessType is undefined", () => {
    const result = computeCtaOptions(undefined, facts());
    expect(result.primaryLabel).toBeTruthy();
    expect(result.options.length).toBeGreaterThan(0);
  });

  it("always returns a secondaryLabel distinct from the primary when more than one option exists", () => {
    const result = computeCtaOptions("BAKERY", facts());
    expect(result.secondaryLabel).toBeDefined();
    expect(result.secondaryLabel).not.toBe(result.primaryLabel);
  });
});
