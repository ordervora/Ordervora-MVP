import { beforeEach, describe, expect, it, vi } from "vitest";

const mockComplete = vi.fn();
const mockProviderName = vi.fn(() => "openai");

vi.mock("../../../lib/ai", () => ({
  getAIProvider: () => ({ get name() { return mockProviderName(); }, complete: mockComplete }),
}));

import {
  generateAbout,
  generateContact,
  generateCta,
  generateFaq,
  generateFeatured,
  generateFooter,
  generateFullContent,
  generateHero,
  generateSeo,
  generateWhyChooseUs,
} from "./content-engine";
import type { IngestData, SiteFacts } from "../types";

beforeEach(() => {
  vi.clearAllMocks();
  mockProviderName.mockReturnValue("openai");
});

function ingest(overrides: Partial<IngestData> = {}): IngestData {
  return {
    restaurantId: "r1",
    restaurantName: "Trattoria Bella",
    menu: [{ categoryName: "Mains", name: "Spaghetti Carbonara", priceCents: 1800 }],
    photoCount: 3,
    businessType: "RESTAURANT",
    ...overrides,
  };
}

function facts(overrides: Partial<SiteFacts> = {}): SiteFacts {
  return { restaurantName: "Trattoria Bella", hasOnlineOrdering: false, hasReservations: false, ...overrides };
}

describe("generateHero", () => {
  it("parses a valid AI response", async () => {
    mockComplete.mockResolvedValue(JSON.stringify({ headline: "Fresh Pasta Daily", subhead: "Handmade in our kitchen every morning." }));

    const result = await generateHero(ingest());

    expect(result.content.headline).toBe("Fresh Pasta Daily");
    expect(result.provider).toBe("openai");
  });

  it("falls back to a templated headline on malformed JSON", async () => {
    mockComplete.mockResolvedValue("not json");

    const result = await generateHero(ingest());

    expect(result.content.headline).toBe("Trattoria Bella");
    expect(result.provider).toBeNull();
  });

  it("falls back when the response fails schema validation", async () => {
    mockComplete.mockResolvedValue(JSON.stringify({ notTheRightShape: true }));

    const result = await generateHero(ingest());

    expect(result.provider).toBeNull();
    expect(result.content.headline).toBeTruthy();
  });

  it("falls back when the response is empty", async () => {
    mockComplete.mockResolvedValue("");

    const result = await generateHero(ingest());

    expect(result.provider).toBeNull();
  });

  it("falls back when the provider throws", async () => {
    mockComplete.mockRejectedValue(new Error("network error"));

    const result = await generateHero(ingest());

    expect(result.provider).toBeNull();
    expect(result.content.headline).toBeTruthy();
  });

  it("sanitizes banned claim phrases out of the generated headline", async () => {
    mockComplete.mockResolvedValue(JSON.stringify({ headline: "The world-famous pasta", subhead: "Come try it." }));

    const result = await generateHero(ingest());

    expect(result.content.headline).not.toMatch(/world-famous/i);
  });
});

describe("generateAbout", () => {
  it("parses a valid AI response", async () => {
    mockComplete.mockResolvedValue(JSON.stringify({ story: "A".repeat(200), excerpt: "A short summary." }));
    const result = await generateAbout(ingest());
    expect(result.content.story).toHaveLength(200);
  });

  it("falls back to the owner-provided description when the AI call fails", async () => {
    mockComplete.mockRejectedValue(new Error("boom"));
    const result = await generateAbout(ingest({ description: "A cozy neighborhood spot." }));
    expect(result.content.story).toBe("A cozy neighborhood spot.");
    expect(result.provider).toBeNull();
  });
});

describe("generateWhyChooseUs", () => {
  it("parses a valid AI response with 3-4 items", async () => {
    mockComplete.mockResolvedValue(
      JSON.stringify({ title: "Why Choose Us", items: [{ heading: "Quality", description: "Great food." }, { heading: "Fast", description: "Quick service." }, { heading: "Local", description: "Community favorite." }] }),
    );
    const result = await generateWhyChooseUs(ingest());
    expect(result.content.items).toHaveLength(3);
  });

  it("falls back to templated reasons on failure", async () => {
    mockComplete.mockRejectedValue(new Error("boom"));
    const result = await generateWhyChooseUs(ingest());
    expect(result.content.items.length).toBeGreaterThanOrEqual(3);
    expect(result.provider).toBeNull();
  });
});

describe("generateFeatured", () => {
  it("parses a valid AI response", async () => {
    mockComplete.mockResolvedValue(
      JSON.stringify({ categoriesTitle: "Shop by Category", categoriesSubtitle: "Browse it all", productsTitle: "Favorites", productsSubtitle: "Top picks" }),
    );
    const result = await generateFeatured(ingest());
    expect(result.content.categoriesTitle).toBe("Shop by Category");
  });

  it("falls back to templated copy on failure", async () => {
    mockComplete.mockResolvedValue("");
    const result = await generateFeatured(ingest());
    expect(result.content.categoriesTitle).toBeTruthy();
    expect(result.provider).toBeNull();
  });
});

describe("generateContact", () => {
  it("parses a valid AI response", async () => {
    mockComplete.mockResolvedValue(JSON.stringify({ intro: "We'd love to hear from you." }));
    const result = await generateContact(ingest());
    expect(result.content.intro).toBe("We'd love to hear from you.");
  });

  it("falls back on failure", async () => {
    mockComplete.mockRejectedValue(new Error("boom"));
    const result = await generateContact(ingest());
    expect(result.content.intro).toBeTruthy();
  });
});

describe("generateFooter", () => {
  it("parses a valid AI response", async () => {
    mockComplete.mockResolvedValue(JSON.stringify({ description: "Your neighborhood Italian kitchen." }));
    const result = await generateFooter(ingest());
    expect(result.content.description).toBe("Your neighborhood Italian kitchen.");
  });

  it("falls back on failure", async () => {
    mockComplete.mockRejectedValue(new Error("boom"));
    const result = await generateFooter(ingest());
    expect(result.content.description).toBeTruthy();
  });
});

describe("generateSeo", () => {
  it("parses a valid AI response for the given page", async () => {
    mockComplete.mockResolvedValue(
      JSON.stringify({
        pageTitle: "Home — Trattoria Bella",
        metaDescription: "Fresh pasta, made daily.",
        keywords: ["italian restaurant", "pasta", "trattoria"],
        ogTitle: "Trattoria Bella",
        ogDescription: "Fresh pasta, made daily.",
      }),
    );

    const result = await generateSeo(ingest(), "Home");

    expect(result.content.pageTitle).toBe("Home — Trattoria Bella");
    expect(result.content.keywords).toHaveLength(3);
  });

  it("rejects a response with too few keywords and falls back", async () => {
    mockComplete.mockResolvedValue(JSON.stringify({ pageTitle: "x", metaDescription: "y", keywords: ["one"], ogTitle: "x", ogDescription: "y" }));

    const result = await generateSeo(ingest(), "Home");

    expect(result.provider).toBeNull();
    expect(result.content.pageTitle).toContain("Trattoria Bella");
  });

  it("falls back to templated SEO metadata on failure", async () => {
    mockComplete.mockRejectedValue(new Error("boom"));

    const result = await generateSeo(ingest(), "Menu");

    expect(result.content.pageTitle.length).toBeLessThanOrEqual(70);
    expect(result.content.metaDescription.length).toBeLessThanOrEqual(160);
  });
});

describe("generateFaq", () => {
  it("parses a valid AI response with at least 5 items", async () => {
    mockComplete.mockResolvedValue(
      JSON.stringify({
        items: [
          { question: "Do you deliver?", answer: "Yes, through our online ordering." },
          { question: "Do you take reservations?", answer: "Yes, call ahead." },
          { question: "What are your hours?", answer: "See our Contact page." },
          { question: "Do you have vegetarian options?", answer: "Yes, several." },
          { question: "Is parking available?", answer: "Yes, street parking nearby." },
        ],
      }),
    );

    const result = await generateFaq(ingest());

    expect(result.content.items.length).toBeGreaterThanOrEqual(5);
  });

  it("rejects a response with fewer than 5 items and falls back to the templated FAQ (which itself has >=5)", async () => {
    mockComplete.mockResolvedValue(JSON.stringify({ items: [{ question: "Q1", answer: "A1" }] }));

    const result = await generateFaq(ingest());

    expect(result.provider).toBeNull();
    expect(result.content.items.length).toBeGreaterThanOrEqual(5);
  });

  it("falls back to a templated FAQ (still >=5 items) on failure", async () => {
    mockComplete.mockRejectedValue(new Error("boom"));

    const result = await generateFaq(ingest());

    expect(result.content.items.length).toBeGreaterThanOrEqual(5);
  });
});

describe("generateCta", () => {
  it("is deterministic — never calls the AI provider", () => {
    const result = generateCta(ingest({ businessType: "VAPE_SHOP" }), facts());

    expect(mockComplete).not.toHaveBeenCalled();
    expect(result.provider).toBeNull();
    expect(result.content.primaryLabel).toBe("Shop Online");
  });
});

describe("generateFullContent", () => {
  it("runs every sub-scope and aggregates a real provider name when at least one call succeeds", async () => {
    mockComplete.mockImplementation((req: { text: string }) => {
      if (req.text.includes("hero section")) return Promise.resolve(JSON.stringify({ headline: "Fresh Pasta Daily", subhead: "Handmade daily." }));
      return Promise.resolve("");
    });

    const result = await generateFullContent(ingest(), facts(), "Home");

    expect(result.content.hero.headline).toBe("Fresh Pasta Daily");
    expect(result.content.faq.items.length).toBeGreaterThanOrEqual(5);
    expect(result.content.cta.primaryLabel).toBeTruthy();
    expect(result.provider).toBe("openai");
  });

  it("reports provider null when every call falls back", async () => {
    mockComplete.mockResolvedValue("");

    const result = await generateFullContent(ingest(), facts(), "Home");

    expect(result.provider).toBeNull();
  });
});
