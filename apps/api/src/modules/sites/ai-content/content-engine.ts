import { getAIProvider } from "../../../lib/ai";
import { sanitizeClaims } from "../claims-filter";
import type { IngestData, SiteFacts } from "../types";
import { computeCtaOptions } from "./cta-options";
import {
  buildAboutPrompt,
  buildContactPrompt,
  buildFaqPrompt,
  buildFeaturedPrompt,
  buildFooterPrompt,
  buildHeroPrompt,
  buildSeoPrompt,
  buildWhyChooseUsPrompt,
  businessTypeLabel,
} from "./prompts";
import {
  aboutContentSchema,
  contactContentSchema,
  faqContentSchema,
  featuredContentSchema,
  footerContentSchema,
  heroContentSchema,
  seoContentSchema,
  whyChooseUsContentSchema,
  type AboutContent,
  type ContactContent,
  type CtaContent,
  type FaqContent,
  type FeaturedContent,
  type FooterContent,
  type FullGeneratedContent,
  type HeroContent,
  type SeoContent,
  type WhyChooseUsContent,
} from "./types";

/**
 * Sprint 20A Task 6 content engine. One `generate*` function per scope,
 * each following the exact never-throw-with-fallback shape already
 * established by content-generator.ts/brand-analysis.ts: build a prompt,
 * call whichever provider `getAIProvider()` currently resolves to, parse
 * the JSON response, validate it against that scope's zod schema, sanitize
 * every text field through `sanitizeClaims`, and fall back to deterministic
 * templated copy on any failure (empty response, malformed JSON, schema
 * mismatch, thrown error) so a generation call can never fail the caller.
 * The returned `provider` name (or `null` for a fallback) is what
 * content-generation.service.ts records on the ContentGeneration row.
 */

export interface GeneratedWithProvider<T> {
  content: T;
  provider: string | null;
}

async function callProvider(prompt: string, maxTokens: number): Promise<{ text: string; provider: string } | null> {
  const provider = getAIProvider();
  const text = await provider.complete({ text: prompt, maxTokens });
  return text ? { text, provider: provider.name } : null;
}

function sanitizeStrings<T extends Record<string, unknown>>(value: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "string") out[key] = sanitizeClaims(v);
    else if (Array.isArray(v)) out[key] = v.map((item) => (typeof item === "string" ? sanitizeClaims(item) : typeof item === "object" && item ? sanitizeStrings(item as Record<string, unknown>) : item));
    else out[key] = v;
  }
  return out as T;
}

function fallbackHero(input: IngestData, label: string): HeroContent {
  return { headline: input.restaurantName, subhead: `Welcome to ${input.restaurantName} — your neighborhood ${label}.` };
}

function fallbackAbout(input: IngestData, label: string): AboutContent {
  const story = input.description ?? `${input.restaurantName} is a ${label} proud to serve the local community. [add your story]`;
  return { story, excerpt: story.length > 200 ? `${story.slice(0, 197)}…` : story };
}

function fallbackWhyChooseUs(input: IngestData, label: string): WhyChooseUsContent {
  return {
    title: `Why Choose ${input.restaurantName}`,
    items: [
      { heading: "Quality First", description: `Every order at this ${label} is prepared with care.` },
      { heading: "Local Favorite", description: "Proudly serving our local community." },
      { heading: "Easy to Reach", description: "Order online or visit us in person." },
    ],
  };
}

function fallbackFeatured(): FeaturedContent {
  return {
    categoriesTitle: "Shop by Category",
    categoriesSubtitle: "Explore everything we offer.",
    productsTitle: "Customer Favorites",
    productsSubtitle: "A few of our most popular picks.",
  };
}

function fallbackContact(label: string): ContactContent {
  return { intro: `Have a question? We'd love to hear from you — reach out to this ${label} any time.` };
}

function fallbackFooter(input: IngestData, label: string): FooterContent {
  return { description: `${input.restaurantName} — your local ${label}.` };
}

function fallbackSeo(input: IngestData, label: string, pageName: string): SeoContent {
  const title = `${pageName} — ${input.restaurantName}`.slice(0, 70);
  const description = `${input.restaurantName} is a ${label}. Visit our ${pageName.toLowerCase()} page to learn more.`.slice(0, 160);
  return {
    pageTitle: title,
    metaDescription: description,
    keywords: [input.restaurantName.toLowerCase(), label, pageName.toLowerCase()],
    ogTitle: title,
    ogDescription: description,
  };
}

function fallbackFaq(label: string): FaqContent {
  return {
    items: [
      { question: "How do I place an order?", answer: `You can order directly from this ${label}'s website, or visit us in person.` },
      { question: "Do you offer delivery?", answer: "Delivery availability varies — check the ordering page for options near you." },
      { question: "What payment methods do you accept?", answer: "We accept all major credit and debit cards." },
      { question: "What are your opening hours?", answer: "See the hours listed on our Contact page for the most current schedule." },
      { question: "What is your return policy?", answer: "Contact us directly and we'll be happy to help resolve any issue with your order." },
    ],
  };
}

async function generateScoped<T>(
  buildPrompt: () => string,
  schema: { safeParse: (v: unknown) => { success: boolean; data?: T } },
  fallback: () => T,
  maxTokens = 1024,
): Promise<GeneratedWithProvider<T>> {
  try {
    const result = await callProvider(buildPrompt(), maxTokens);
    if (!result) return { content: fallback(), provider: null };

    const parsed: unknown = JSON.parse(result.text);
    const validated = schema.safeParse(parsed);
    if (!validated.success || !validated.data) return { content: fallback(), provider: null };

    return { content: sanitizeStrings(validated.data as Record<string, unknown>) as T, provider: result.provider };
  } catch {
    return { content: fallback(), provider: null };
  }
}

export function generateHero(input: IngestData): Promise<GeneratedWithProvider<HeroContent>> {
  const label = businessTypeLabel(input.businessType);
  return generateScoped(() => buildHeroPrompt(input, label), heroContentSchema, () => fallbackHero(input, label));
}

export function generateAbout(input: IngestData): Promise<GeneratedWithProvider<AboutContent>> {
  const label = businessTypeLabel(input.businessType);
  return generateScoped(() => buildAboutPrompt(input, label), aboutContentSchema, () => fallbackAbout(input, label), 2048);
}

export function generateWhyChooseUs(input: IngestData): Promise<GeneratedWithProvider<WhyChooseUsContent>> {
  const label = businessTypeLabel(input.businessType);
  return generateScoped(() => buildWhyChooseUsPrompt(input, label), whyChooseUsContentSchema, () => fallbackWhyChooseUs(input, label));
}

export function generateFeatured(input: IngestData): Promise<GeneratedWithProvider<FeaturedContent>> {
  const label = businessTypeLabel(input.businessType);
  return generateScoped(() => buildFeaturedPrompt(input, label), featuredContentSchema, fallbackFeatured);
}

export function generateContact(input: IngestData): Promise<GeneratedWithProvider<ContactContent>> {
  const label = businessTypeLabel(input.businessType);
  return generateScoped(() => buildContactPrompt(input, label), contactContentSchema, () => fallbackContact(label));
}

export function generateFooter(input: IngestData): Promise<GeneratedWithProvider<FooterContent>> {
  const label = businessTypeLabel(input.businessType);
  return generateScoped(() => buildFooterPrompt(input, label), footerContentSchema, () => fallbackFooter(input, label));
}

export function generateSeo(input: IngestData, pageName: string): Promise<GeneratedWithProvider<SeoContent>> {
  const label = businessTypeLabel(input.businessType);
  return generateScoped(() => buildSeoPrompt(input, label, pageName), seoContentSchema, () => fallbackSeo(input, label, pageName));
}

export function generateFaq(input: IngestData): Promise<GeneratedWithProvider<FaqContent>> {
  const label = businessTypeLabel(input.businessType);
  return generateScoped(() => buildFaqPrompt(input, label), faqContentSchema, () => fallbackFaq(label), 2048);
}

/** CTA is deterministic — see cta-options.ts. Never involves a provider, so `provider` is always `null` here (recorded as such on the ContentGeneration row). */
export function generateCta(input: IngestData, facts: SiteFacts): GeneratedWithProvider<CtaContent> {
  return { content: computeCtaOptions(input.businessType, facts), provider: null };
}

export async function generateFullContent(input: IngestData, facts: SiteFacts, pageName: string): Promise<GeneratedWithProvider<FullGeneratedContent>> {
  const [hero, about, whyChooseUs, featured, contact, footer, seo, faq] = await Promise.all([
    generateHero(input),
    generateAbout(input),
    generateWhyChooseUs(input),
    generateFeatured(input),
    generateContact(input),
    generateFooter(input),
    generateSeo(input, pageName),
    generateFaq(input),
  ]);
  const cta = generateCta(input, facts);

  const providers = [hero, about, whyChooseUs, featured, contact, footer, seo, faq].map((r) => r.provider).filter((p): p is string => Boolean(p));

  return {
    content: {
      hero: hero.content,
      about: about.content,
      whyChooseUs: whyChooseUs.content,
      featured: featured.content,
      contact: contact.content,
      footer: footer.content,
      seo: seo.content,
      cta: cta.content,
      faq: faq.content,
    },
    provider: providers[0] ?? null,
  };
}
