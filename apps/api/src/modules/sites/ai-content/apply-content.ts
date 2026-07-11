import type { SectionType, SiteDefinition, SitePage } from "../types";
import type { AboutContent, ContactContent, CtaContent, FaqContent, FeaturedContent, FooterContent, FullGeneratedContent, HeroContent, SeoContent, WhyChooseUsContent } from "./types";

/**
 * Sprint 20A Task 6 — maps generated content onto a SiteDefinition patch.
 * Every `apply*` function reads the CURRENT definition (never mutates it)
 * and returns a `Partial<SiteDefinition>` patch shaped exactly the way
 * `patchDraft` already expects (site.service.ts §"constrained editing
 * only" — the whole merged object is re-validated there, so a bad patch
 * can never corrupt the draft). Section props are upserted — merged onto
 * an existing block of that type if one exists on the target page,
 * appended as a new block otherwise — so "Generate Website Content" is
 * useful even on a fresh definition that doesn't have every section yet,
 * and "Regenerate X" never wipes out unrelated props already set on that
 * block (e.g. regenerating Hero copy never touches a manually-picked
 * hero image variant).
 */

/**
 * A newly-appended section is inserted before `footer` when the page
 * already has one, rather than after it — footer always renders last on
 * a real page, so blindly pushing onto the end of the array (as a naive
 * append would) would put generated content like FAQ visually below the
 * footer. Existing blocks are always updated in place, never reordered.
 */
function upsertSection(page: SitePage, type: SectionType, props: Record<string, unknown>): SitePage {
  const idx = page.sections.findIndex((s) => s.type === type);
  if (idx === -1) {
    const footerIndex = page.sections.findIndex((s) => s.type === "footer");
    const insertAt = footerIndex === -1 ? page.sections.length : footerIndex;
    const sections = [...page.sections.slice(0, insertAt), { type, props }, ...page.sections.slice(insertAt)];
    return { ...page, sections };
  }
  return { ...page, sections: page.sections.map((s, i) => (i === idx ? { ...s, props: { ...s.props, ...props } } : s)) };
}

function mapPage(definition: SiteDefinition, slug: string, mutate: (page: SitePage) => SitePage): Partial<SiteDefinition> {
  return { pages: definition.pages.map((p) => (p.slug === slug ? mutate(p) : p)) };
}

export function applyHero(definition: SiteDefinition, content: HeroContent, pageSlug: string): Partial<SiteDefinition> {
  return mapPage(definition, pageSlug, (page) => upsertSection(page, "hero", { headline: content.headline, subhead: content.subhead }));
}

export function applyAbout(definition: SiteDefinition, content: AboutContent, pageSlug: string): Partial<SiteDefinition> {
  const withStory = mapPage(definition, pageSlug, (page) => upsertSection(page, "aboutStory", { story: content.story })).pages!;
  const withTeaser = withStory.map((p) => (p.slug === "/" ? upsertSection(p, "aboutTeaser", { excerpt: content.excerpt }) : p));
  return { pages: withTeaser };
}

export function applyWhyChooseUs(definition: SiteDefinition, content: WhyChooseUsContent, pageSlug: string): Partial<SiteDefinition> {
  return mapPage(definition, pageSlug, (page) => upsertSection(page, "whyChooseUs", { title: content.title, items: content.items }));
}

export function applyFeatured(definition: SiteDefinition, content: FeaturedContent, pageSlug: string): Partial<SiteDefinition> {
  return mapPage(definition, pageSlug, (page) => {
    const withCategories = upsertSection(page, "featuredCategories", { title: content.categoriesTitle, subtitle: content.categoriesSubtitle });
    return upsertSection(withCategories, "featuredProducts", { title: content.productsTitle, subtitle: content.productsSubtitle });
  });
}

export function applyContact(definition: SiteDefinition, content: ContactContent, pageSlug: string): Partial<SiteDefinition> {
  return mapPage(definition, pageSlug, (page) => upsertSection(page, "contactForm", { intro: content.intro }));
}

export function applyFooter(definition: SiteDefinition, content: FooterContent): Partial<SiteDefinition> {
  return { footer: { ...definition.footer, description: content.description } };
}

export function applySeo(definition: SiteDefinition, content: SeoContent, pageSlug: string): Partial<SiteDefinition> {
  return {
    pages: definition.pages.map((p) =>
      p.slug === pageSlug
        ? { ...p, title: content.pageTitle, metaDescription: content.metaDescription, keywords: content.keywords, ogTitle: content.ogTitle, ogDescription: content.ogDescription }
        : p,
    ),
  };
}

export function applyCta(definition: SiteDefinition, content: CtaContent, pageSlug: string): Partial<SiteDefinition> {
  return mapPage(definition, pageSlug, (page) => {
    const withHero = upsertSection(page, "hero", { ctaLabel: content.primaryLabel, ...(content.secondaryLabel ? { secondaryCtaLabel: content.secondaryLabel } : {}) });
    const hasBanner = page.sections.some((s) => s.type === "ctaBanner");
    return hasBanner ? upsertSection(withHero, "ctaBanner", { label: content.primaryLabel }) : withHero;
  });
}

export function applyFaq(definition: SiteDefinition, content: FaqContent, pageSlug: string): Partial<SiteDefinition> {
  return mapPage(definition, pageSlug, (page) => upsertSection(page, "faq", { items: content.items }));
}

/** Default page each scope applies to when the caller doesn't pass an explicit `pageSlug`. */
export function defaultPageSlugForScope(scope: string, definition: SiteDefinition): string {
  const has = (slug: string) => definition.pages.some((p) => p.slug === slug);
  switch (scope) {
    case "ABOUT":
      return has("/about") ? "/about" : "/";
    case "CONTACT":
    case "FAQ":
      return has("/contact") ? "/contact" : "/";
    default:
      return "/";
  }
}

export function applyFullContent(definition: SiteDefinition, content: FullGeneratedContent, pageSlug: string, aboutSlug: string, contactSlug: string): Partial<SiteDefinition> {
  let next: SiteDefinition = { ...definition, ...applyHero(definition, content.hero, pageSlug) };
  next = { ...next, ...applyAbout(next, content.about, aboutSlug) };
  next = { ...next, ...applyWhyChooseUs(next, content.whyChooseUs, pageSlug) };
  next = { ...next, ...applyFeatured(next, content.featured, pageSlug) };
  next = { ...next, ...applyContact(next, content.contact, contactSlug) };
  next = { ...next, ...applyFooter(next, content.footer) };
  next = { ...next, ...applySeo(next, content.seo, pageSlug) };
  next = { ...next, ...applyCta(next, content.cta, pageSlug) };
  next = { ...next, ...applyFaq(next, content.faq, contactSlug) };

  return { pages: next.pages, footer: next.footer };
}
