import { describe, expect, it } from "vitest";
import { renderContactForm } from "./contact";
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

describe("renderContactForm", () => {
  it("renders the form with no intro paragraph when props.intro is absent (backward compatibility)", () => {
    const html = renderContactForm({ type: "contactForm", props: {} }, ctx());
    expect(html).toContain("<form");
    expect(html).not.toContain("<p>");
  });

  it("renders the generated intro copy above the form when present (Sprint 20A Task 6)", () => {
    const html = renderContactForm({ type: "contactForm", props: { intro: "Reach out any time." } }, ctx());
    expect(html).toContain("Reach out any time.");
    expect(html).toContain("<form");
  });

  it("escapes HTML in the intro", () => {
    const html = renderContactForm({ type: "contactForm", props: { intro: "<script>alert(1)</script>" } }, ctx());
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
