import { describe, expect, it } from "vitest";
import { renderSeoHead, type SeoHeadInput } from "./seo-head";
import type { SitePage } from "../types";

function page(overrides: Partial<SitePage> = {}): SitePage {
  return { slug: "/", title: "Home — Trattoria Bella", metaDescription: "Fresh pasta, made daily.", sections: [], ...overrides };
}

function input(overrides: Partial<SeoHeadInput> = {}): SeoHeadInput {
  return {
    page: page(),
    restaurantName: "Trattoria Bella",
    cuisine: "italian",
    siteUrl: "https://trattoria-bella.example",
    facts: { hasReservations: false },
    liveMenu: [],
    pages: [page()],
    currentPage: page(),
    ...overrides,
  };
}

describe("renderSeoHead", () => {
  it("falls back to title/metaDescription for OG tags when ogTitle/ogDescription are absent (Sprint 20A Task 6 backward compatibility)", () => {
    const html = renderSeoHead(input());
    expect(html).toContain('<meta property="og:title" content="Home — Trattoria Bella" />');
    expect(html).toContain('<meta property="og:description" content="Fresh pasta, made daily." />');
  });

  it("uses ogTitle/ogDescription when the page has generated ones", () => {
    const html = renderSeoHead(input({ page: page({ ogTitle: "Social Title", ogDescription: "Social description" }) }));
    expect(html).toContain('<meta property="og:title" content="Social Title" />');
    expect(html).toContain('<meta property="og:description" content="Social description" />');
    expect(html).toContain('<meta name="twitter:title" content="Social Title" />');
  });

  it("omits the keywords meta tag when the page has no keywords", () => {
    const html = renderSeoHead(input());
    expect(html).not.toContain("name=\"keywords\"");
  });

  it("emits a comma-separated keywords meta tag when the page has generated keywords", () => {
    const html = renderSeoHead(input({ page: page({ keywords: ["italian restaurant", "pasta", "trattoria"] }) }));
    expect(html).toContain('<meta name="keywords" content="italian restaurant, pasta, trattoria" />');
  });

  it("escapes HTML in keywords", () => {
    const html = renderSeoHead(input({ page: page({ keywords: ["<script>alert(1)</script>"] }) }));
    expect(html).not.toContain("<script>alert(1)</script>");
  });
});
