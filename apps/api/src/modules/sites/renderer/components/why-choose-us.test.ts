import { describe, expect, it } from "vitest";
import { renderWhyChooseUs } from "./why-choose-us";
import type { RenderContext } from "../render-context";
import type { SiteDefinition } from "../../types";

function ctx(): RenderContext {
  return {
    siteId: "site-1",
    restaurantId: "restaurant-1",
    orderingBaseUrl: "http://localhost:3000",
    bestSellers: [],
    activeOffers: [],
    loyaltyProgram: null,
    definition: {
      schemaVersion: 1,
      restaurantName: "Trattoria Bella",
      tagline: "x",
      cuisine: "italian",
      businessType: "bistro",
      styleFamily: "MODERN",
      themeKey: "modern-bistro",
      themeVersion: 1,
      colorSeed: "#e8590c",
      typography: { display: "Sora", body: "Inter" },
      facts: { restaurantName: "Trattoria Bella", hasOnlineOrdering: false, hasReservations: false },
      pages: [],
    } as SiteDefinition,
    liveMenu: [],
    assets: { galleryImages: [] },
  };
}

describe("renderWhyChooseUs", () => {
  it("renders nothing when there are no items", () => {
    expect(renderWhyChooseUs({ type: "whyChooseUs", props: { items: [] } }, ctx())).toBe("");
  });

  it("renders a card per item with heading and description", () => {
    const html = renderWhyChooseUs(
      { type: "whyChooseUs", props: { items: [{ heading: "Quality First", description: "Every order is made fresh." }, { heading: "Local Favorite", description: "Loved by the neighborhood." }] } },
      ctx(),
    );
    expect(html).toContain("Quality First");
    expect(html).toContain("Every order is made fresh.");
    expect(html).toContain("Local Favorite");
  });

  it("escapes HTML in heading/description text", () => {
    const html = renderWhyChooseUs({ type: "whyChooseUs", props: { items: [{ heading: "<b>x</b>", description: "safe" }] } }, ctx());
    expect(html).not.toContain("<b>x</b>");
  });

  it("uses a default title when none is provided", () => {
    const html = renderWhyChooseUs({ type: "whyChooseUs", props: { items: [{ heading: "H", description: "D" }] } }, ctx());
    expect(html).toContain("Why Choose Us");
  });
});
