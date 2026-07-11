import { describe, expect, it } from "vitest";
import { renderFaq } from "./faq";
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

describe("renderFaq", () => {
  it("renders nothing when there are no items", () => {
    expect(renderFaq({ type: "faq", props: { items: [] } }, ctx())).toBe("");
  });

  it("renders a details/summary accordion entry per item", () => {
    const html = renderFaq(
      { type: "faq", props: { items: [{ question: "Do you deliver?", answer: "Yes, citywide." }, { question: "What payments do you accept?", answer: "All major cards." }] } },
      ctx(),
    );
    expect(html).toContain("<details");
    expect(html).toContain("Do you deliver?");
    expect(html).toContain("Yes, citywide.");
    expect(html).toContain("What payments do you accept?");
  });

  it("escapes HTML in question/answer text", () => {
    const html = renderFaq({ type: "faq", props: { items: [{ question: "<script>alert(1)</script>", answer: "safe" }] } }, ctx());
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("uses a default title when none is provided", () => {
    const html = renderFaq({ type: "faq", props: { items: [{ question: "Q", answer: "A" }] } }, ctx());
    expect(html).toContain("Frequently Asked Questions");
  });

  it("uses a custom title when provided", () => {
    const html = renderFaq({ type: "faq", props: { title: "Common Questions", items: [{ question: "Q", answer: "A" }] } }, ctx());
    expect(html).toContain("Common Questions");
  });
});
