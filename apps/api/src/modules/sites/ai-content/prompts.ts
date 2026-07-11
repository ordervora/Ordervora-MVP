import type { IngestData } from "../types";

/**
 * Sprint 20A Task 6 — reusable prompt builders, one per content scope.
 * Every function here is a pure string builder: it takes structured data
 * in, returns a prompt string out, and never touches an AI provider
 * itself — content-engine.ts is the only place that calls
 * `getAIProvider().complete(...)`. This is what makes the provider
 * replaceable (OpenAI/Anthropic/Gemini/future) without touching a single
 * prompt: swapping providers only ever changes which `AIProvider` this
 * text gets handed to.
 */

const GUARDRAILS = `Never state a specific address, phone number, or price — write prose *around* those facts, they
are shown separately from structured data. Never invent testimonials, awards, reviews, or statistics
you were not given. Never make superlative or health claims ("best in the world", "healthiest",
"award-winning", "#1"). Never use markdown formatting or emoji in field values — plain prose only.`;

/**
 * Humanizes a business type for prompt context. Accepts the real
 * `Restaurant.businessType` enum value (e.g. "VAPE_SHOP"), free text
 * (e.g. "bistro"), or anything else — future business types not yet in
 * either taxonomy still produce a reasonable label rather than an error,
 * since this only ever feeds prose, never a hard business-logic branch.
 */
export function businessTypeLabel(businessType: string | undefined): string {
  if (!businessType) return "local business";
  const KNOWN: Record<string, string> = {
    RESTAURANT: "restaurant",
    COFFEE_SHOP: "coffee shop",
    DELI: "deli",
    VAPE_SHOP: "vape shop",
    CONVENIENCE_STORE: "convenience store",
    BAKERY: "bakery",
    PIZZA: "pizzeria",
    RETAIL: "retail store",
    OTHER: "local business",
  };
  if (KNOWN[businessType]) return KNOWN[businessType];
  // Free text (LLM-guessed SiteDefinition.businessType, or a future
  // enum value not yet in the map above) — humanize "VAPE_SHOP"-style
  // strings, pass through already-lowercase free text unchanged.
  return businessType.toLowerCase().replace(/_/g, " ");
}

function context(input: IngestData, label: string): string {
  const menuLines = input.menu.slice(0, 15).map((item) => `- ${item.name}${item.description ? `: ${item.description}` : ""}`).join("\n");
  return `Business name: ${input.restaurantName}
Business type: ${label}
${input.description ? `Owner-provided description: ${input.description}\n` : ""}${
    menuLines ? `Menu/product highlights:\n${menuLines}\n` : ""
  }`;
}

function jsonOnly(shape: string): string {
  return `Return ONLY a JSON object (no prose, no markdown fences) matching this shape:\n\n${shape}\n\n${GUARDRAILS}`;
}

export function buildHeroPrompt(input: IngestData, label: string): string {
  return `You are writing the hero section for ${input.restaurantName}'s website, a ${label}.

${context(input, label)}
${jsonOnly(`{
  "headline": "string, <=10 words, punchy and specific to this ${label}",
  "subhead": "string, one sentence expanding on the headline"
}`)}`;
}

export function buildAboutPrompt(input: IngestData, label: string): string {
  return `You are writing the About page for ${input.restaurantName}, a ${label}.

${context(input, label)}
If the owner's own story/history isn't given above, write a generic but warm placeholder rather than
inventing history.
${jsonOnly(`{
  "story": "string, 150-300 words telling this business's story",
  "excerpt": "string, one or two sentences summarizing the story for a homepage teaser"
}`)}`;
}

export function buildWhyChooseUsPrompt(input: IngestData, label: string): string {
  return `You are writing a "Why Choose Us" section for ${input.restaurantName}, a ${label}.

${context(input, label)}
${jsonOnly(`{
  "title": "string, a short section heading, e.g. 'Why Choose ${input.restaurantName}'",
  "items": [
    { "heading": "string, <=5 words", "description": "string, one sentence" }
  ]
}
Provide exactly 3 or 4 items, each a genuine, specific reason grounded in the business type/menu above
(e.g. quality, convenience, selection, service) — never a fabricated award or ranking.`)}`;
}

export function buildFeaturedPrompt(input: IngestData, label: string): string {
  return `You are writing short intro copy for two homepage sections on ${input.restaurantName}'s website, a ${label}: one
that links to product/menu categories, one that highlights specific featured products.

${context(input, label)}
${jsonOnly(`{
  "categoriesTitle": "string, <=6 words, e.g. 'Shop by Category'",
  "categoriesSubtitle": "string, one short sentence",
  "productsTitle": "string, <=6 words, e.g. 'Customer Favorites'",
  "productsSubtitle": "string, one short sentence"
}`)}`;
}

export function buildContactPrompt(input: IngestData, label: string): string {
  return `You are writing a one-sentence introduction for the contact form on ${input.restaurantName}'s website, a ${label}.

${context(input, label)}
${jsonOnly(`{
  "intro": "string, one warm, inviting sentence encouraging visitors to reach out"
}`)}`;
}

export function buildFooterPrompt(input: IngestData, label: string): string {
  return `You are writing a short footer description for ${input.restaurantName}'s website, a ${label}.

${context(input, label)}
${jsonOnly(`{
  "description": "string, 1-2 sentences summarizing the business for the site footer"
}`)}`;
}

export function buildSeoPrompt(input: IngestData, label: string, pageName: string): string {
  return `You are writing SEO metadata for the "${pageName}" page of ${input.restaurantName}'s website, a ${label}.

${context(input, label)}
${jsonOnly(`{
  "pageTitle": "string, <=70 characters, include the business name",
  "metaDescription": "string, <=160 characters, compelling and specific",
  "keywords": ["string array, 3-10 relevant search terms, lowercase"],
  "ogTitle": "string, <=70 characters, can match pageTitle or be a more social-friendly variant",
  "ogDescription": "string, <=200 characters, can match metaDescription or be a more social-friendly variant"
}`)}`;
}

export function buildFaqPrompt(input: IngestData, label: string): string {
  return `You are writing a Frequently Asked Questions section for ${input.restaurantName}'s website, a ${label}.

${context(input, label)}
${jsonOnly(`{
  "items": [
    { "question": "string", "answer": "string, 1-3 sentences" }
  ]
}
Provide at least 5 questions. Cover, where relevant to a ${label}: ordering, delivery or pickup,
payment methods, opening hours, and (for a retail-style business) returns/exchanges. Write general,
policy-shaped answers since exact hours/prices are shown elsewhere on the site — do not invent a
specific phone number, address, or price.`)}`;
}
