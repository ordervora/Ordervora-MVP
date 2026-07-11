import { z } from "zod";

/**
 * Sprint 20A Task 6 — AI Content Generation Engine. One schema per
 * generatable content scope, each independently regeneratable. Every
 * scope's schema mirrors the shape its matching prompt in prompts.ts asks
 * the model for, and is validated with `.safeParse` before use — an
 * invalid/unparseable response always falls back to deterministic
 * templated copy (content-engine.ts), never a thrown error, matching the
 * existing content-generator.ts/brand-analysis.ts guarantee that content
 * generation can never fail the caller.
 */

export const heroContentSchema = z.object({
  headline: z.string().min(1).max(120),
  subhead: z.string().min(1).max(240),
});
export type HeroContent = z.infer<typeof heroContentSchema>;

export const aboutContentSchema = z.object({
  story: z.string().min(1).max(2000),
  excerpt: z.string().min(1).max(320),
});
export type AboutContent = z.infer<typeof aboutContentSchema>;

export const whyChooseUsItemSchema = z.object({
  heading: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
});
export const whyChooseUsContentSchema = z.object({
  title: z.string().min(1).max(80),
  items: z.array(whyChooseUsItemSchema).min(3).max(4),
});
export type WhyChooseUsContent = z.infer<typeof whyChooseUsContentSchema>;

export const featuredContentSchema = z.object({
  categoriesTitle: z.string().min(1).max(80),
  categoriesSubtitle: z.string().min(1).max(200),
  productsTitle: z.string().min(1).max(80),
  productsSubtitle: z.string().min(1).max(200),
});
export type FeaturedContent = z.infer<typeof featuredContentSchema>;

export const contactContentSchema = z.object({
  intro: z.string().min(1).max(300),
});
export type ContactContent = z.infer<typeof contactContentSchema>;

export const footerContentSchema = z.object({
  description: z.string().min(1).max(400),
});
export type FooterContent = z.infer<typeof footerContentSchema>;

export const seoContentSchema = z.object({
  pageTitle: z.string().min(1).max(70),
  metaDescription: z.string().min(1).max(160),
  keywords: z.array(z.string().min(1).max(60)).min(3).max(10),
  ogTitle: z.string().min(1).max(70),
  ogDescription: z.string().min(1).max(200),
});
export type SeoContent = z.infer<typeof seoContentSchema>;

export const faqItemSchema = z.object({
  question: z.string().min(1).max(160),
  answer: z.string().min(1).max(400),
});
export const faqContentSchema = z.object({
  items: z.array(faqItemSchema).min(5).max(10),
});
export type FaqContent = z.infer<typeof faqContentSchema>;

/** CTA is deterministic (business-rules-driven, see cta-options.ts), not LLM-generated — same "never guessed by an LLM" principle cta.ts already documents for the original single-label CTA. */
export interface CtaContent {
  primaryLabel: string;
  secondaryLabel?: string;
  options: string[];
}

/** The full bundle produced by scope "FULL" — every sub-scope's content in one object, so a single ContentGeneration row can restore the whole thing at once. */
export interface FullGeneratedContent {
  hero: HeroContent;
  about: AboutContent;
  whyChooseUs: WhyChooseUsContent;
  featured: FeaturedContent;
  contact: ContactContent;
  footer: FooterContent;
  seo: SeoContent;
  cta: CtaContent;
  faq: FaqContent;
}

export const CONTENT_SCOPES = ["FULL", "HERO", "ABOUT", "WHY_CHOOSE_US", "FEATURED", "CONTACT", "FOOTER", "SEO", "CTA", "FAQ"] as const;
export type ContentGenerationScopeValue = (typeof CONTENT_SCOPES)[number];

/** Discriminated by scope; the controller/service pass this straight through to ContentGeneration.content (JSON) without re-shaping it. */
export type ScopedGeneratedContent =
  | { scope: "FULL"; content: FullGeneratedContent }
  | { scope: "HERO"; content: HeroContent }
  | { scope: "ABOUT"; content: AboutContent }
  | { scope: "WHY_CHOOSE_US"; content: WhyChooseUsContent }
  | { scope: "FEATURED"; content: FeaturedContent }
  | { scope: "CONTACT"; content: ContactContent }
  | { scope: "FOOTER"; content: FooterContent }
  | { scope: "SEO"; content: SeoContent }
  | { scope: "CTA"; content: CtaContent }
  | { scope: "FAQ"; content: FaqContent };
