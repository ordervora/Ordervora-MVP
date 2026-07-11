import { describe, expect, it } from "vitest";
import type { SiteDefinition } from "../types";
import { applyAbout, applyCta, applyFaq, applyFeatured, applyFooter, applyHero, applySeo, applyWhyChooseUs, defaultPageSlugForScope } from "./apply-content";

function baseDefinition(overrides: Partial<SiteDefinition> = {}): SiteDefinition {
  return {
    schemaVersion: 1,
    restaurantName: "Trattoria Bella",
    tagline: "Handmade pasta",
    cuisine: "italian",
    businessType: "bistro",
    styleFamily: "MODERN",
    themeKey: "modern-bistro",
    themeVersion: 1,
    colorSeed: "#e8590c",
    typography: { display: "Sora", body: "Inter" },
    facts: { restaurantName: "Trattoria Bella", hasOnlineOrdering: false, hasReservations: false },
    pages: [
      { slug: "/", title: "Home", metaDescription: "x", sections: [{ type: "hero", props: { headline: "Old headline" } }, { type: "footer", props: {} }] },
      { slug: "/about", title: "About", metaDescription: "y", sections: [{ type: "footer", props: {} }] },
      { slug: "/contact", title: "Contact", metaDescription: "z", sections: [{ type: "contactInfo", props: {} }, { type: "footer", props: {} }] },
    ],
    ...overrides,
  };
}

describe("applyHero", () => {
  it("merges generated copy onto the existing hero block's props without dropping other fields", () => {
    const definition = baseDefinition();
    definition.pages[0].sections[0].props.ctaLink = "#order";

    const patch = applyHero(definition, { headline: "New headline", subhead: "New subhead" }, "/");

    const hero = patch.pages!.find((p) => p.slug === "/")!.sections.find((s) => s.type === "hero")!;
    expect(hero.props.headline).toBe("New headline");
    expect(hero.props.ctaLink).toBe("#order"); // untouched
  });

  it("appends a new hero block if the target page has none", () => {
    const definition = baseDefinition();
    const patch = applyHero(definition, { headline: "H", subhead: "S" }, "/about");
    const aboutPage = patch.pages!.find((p) => p.slug === "/about")!;
    expect(aboutPage.sections.some((s) => s.type === "hero")).toBe(true);
  });

  it("inserts a newly-appended block before footer, never after it", () => {
    const definition = baseDefinition();
    // /contact already has [contactInfo, footer] — a freshly-appended block must land before footer.
    const patch = applyHero(definition, { headline: "H", subhead: "S" }, "/contact");
    const contactPage = patch.pages!.find((p) => p.slug === "/contact")!;
    const types = contactPage.sections.map((s) => s.type);
    expect(types.indexOf("hero")).toBeLessThan(types.indexOf("footer"));
  });

  it("leaves other pages completely untouched", () => {
    const definition = baseDefinition();
    const patch = applyHero(definition, { headline: "H", subhead: "S" }, "/");
    const aboutPage = patch.pages!.find((p) => p.slug === "/about")!;
    expect(aboutPage).toEqual(definition.pages[1]);
  });
});

describe("applyAbout", () => {
  it("upserts aboutStory on the target page and aboutTeaser on the home page", () => {
    const definition = baseDefinition();
    const patch = applyAbout(definition, { story: "Our story...", excerpt: "Short version." }, "/about");

    const aboutPage = patch.pages!.find((p) => p.slug === "/about")!;
    expect(aboutPage.sections.find((s) => s.type === "aboutStory")?.props.story).toBe("Our story...");

    const homePage = patch.pages!.find((p) => p.slug === "/")!;
    expect(homePage.sections.find((s) => s.type === "aboutTeaser")?.props.excerpt).toBe("Short version.");
  });
});

describe("applyWhyChooseUs", () => {
  it("upserts a whyChooseUs block with the generated title/items", () => {
    const definition = baseDefinition();
    const content = { title: "Why Us", items: [{ heading: "Quality", description: "Great." }] };

    const patch = applyWhyChooseUs(definition, content, "/");

    const home = patch.pages!.find((p) => p.slug === "/")!;
    expect(home.sections.find((s) => s.type === "whyChooseUs")?.props).toEqual(content);
  });
});

describe("applyFeatured", () => {
  it("upserts both featuredCategories and featuredProducts on the target page", () => {
    const definition = baseDefinition();
    const content = { categoriesTitle: "Categories", categoriesSubtitle: "Browse", productsTitle: "Favorites", productsSubtitle: "Top picks" };

    const patch = applyFeatured(definition, content, "/");

    const home = patch.pages!.find((p) => p.slug === "/")!;
    expect(home.sections.find((s) => s.type === "featuredCategories")?.props.title).toBe("Categories");
    expect(home.sections.find((s) => s.type === "featuredProducts")?.props.title).toBe("Favorites");
  });
});

describe("applyFooter", () => {
  it("sets footer.description without touching other footer settings", () => {
    const definition = baseDefinition({ footer: { showHours: true } });
    const patch = applyFooter(definition, { description: "New footer text" });
    expect(patch.footer).toEqual({ showHours: true, description: "New footer text" });
  });
});

describe("applySeo", () => {
  it("replaces title/metaDescription/keywords/og fields on the target page only", () => {
    const definition = baseDefinition();
    const content = { pageTitle: "New Title", metaDescription: "New description", keywords: ["a", "b", "c"], ogTitle: "OG Title", ogDescription: "OG description" };

    const patch = applySeo(definition, content, "/");

    const home = patch.pages!.find((p) => p.slug === "/")!;
    expect(home.title).toBe("New Title");
    expect(home.keywords).toEqual(["a", "b", "c"]);
    expect(home.sections).toEqual(definition.pages[0].sections); // sections untouched
  });
});

describe("applyCta", () => {
  it("updates hero.ctaLabel and, when a ctaBanner block exists, its label too", () => {
    const definition = baseDefinition();
    definition.pages[0].sections.push({ type: "ctaBanner", props: { label: "Old" } });

    const patch = applyCta(definition, { primaryLabel: "Shop Now", secondaryLabel: "Browse Products", options: [] }, "/");

    const home = patch.pages!.find((p) => p.slug === "/")!;
    expect(home.sections.find((s) => s.type === "hero")?.props.ctaLabel).toBe("Shop Now");
    expect(home.sections.find((s) => s.type === "hero")?.props.secondaryCtaLabel).toBe("Browse Products");
    expect(home.sections.find((s) => s.type === "ctaBanner")?.props.label).toBe("Shop Now");
  });

  it("does not add a ctaBanner block if none already existed", () => {
    const definition = baseDefinition();
    const patch = applyCta(definition, { primaryLabel: "Shop Now", options: [] }, "/");
    const home = patch.pages!.find((p) => p.slug === "/")!;
    expect(home.sections.some((s) => s.type === "ctaBanner")).toBe(false);
  });
});

describe("applyFaq", () => {
  it("upserts a faq block with the generated items on the target page", () => {
    const definition = baseDefinition();
    const items = [
      { question: "Q1", answer: "A1" },
      { question: "Q2", answer: "A2" },
    ];

    const patch = applyFaq(definition, { items }, "/contact");

    const contact = patch.pages!.find((p) => p.slug === "/contact")!;
    expect(contact.sections.find((s) => s.type === "faq")?.props.items).toEqual(items);
  });
});

describe("defaultPageSlugForScope", () => {
  it("defaults ABOUT to /about when that page exists", () => {
    expect(defaultPageSlugForScope("ABOUT", baseDefinition())).toBe("/about");
  });

  it("defaults CONTACT and FAQ to /contact when that page exists", () => {
    expect(defaultPageSlugForScope("CONTACT", baseDefinition())).toBe("/contact");
    expect(defaultPageSlugForScope("FAQ", baseDefinition())).toBe("/contact");
  });

  it("falls back to / for ABOUT when there is no /about page", () => {
    const definition = baseDefinition({ pages: [{ slug: "/", title: "Home", metaDescription: "x", sections: [{ type: "footer", props: {} }] }] });
    expect(defaultPageSlugForScope("ABOUT", definition)).toBe("/");
  });

  it("defaults every other scope to /", () => {
    expect(defaultPageSlugForScope("HERO", baseDefinition())).toBe("/");
    expect(defaultPageSlugForScope("SEO", baseDefinition())).toBe("/");
  });
});
