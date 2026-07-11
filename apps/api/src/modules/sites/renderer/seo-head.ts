import { escapeHtml, safeJsonLd } from "./html-escape";
import type { JsonLdInput } from "./json-ld";
import { buildBreadcrumbJsonLd, buildRestaurantJsonLd } from "./json-ld";
import type { SitePage } from "../types";

export interface SeoHeadInput extends JsonLdInput {
  page: SitePage;
  noindex?: boolean;
  faviconUrl?: string;
}

/**
 * §9 SEO Generation + §10 Open Graph — every public page gets a real
 * title/meta description/canonical, OG + Twitter card tags with a
 * generated share image, and JSON-LD (Restaurant + BreadcrumbList),
 * inlined as an escaped <script type="application/ld+json"> (§27: no raw
 * HTML from any owner-editable/LLM-generated field).
 */
export function renderSeoHead(input: SeoHeadInput): string {
  const canonical = `${input.siteUrl}${input.page.slug === "/" ? "" : input.page.slug}`;
  const ogImageUrl = `${input.siteUrl}/og-image.svg`;
  const restaurantJsonLd = buildRestaurantJsonLd(input);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd(input);

  const robotsTag = input.noindex ? `<meta name="robots" content="noindex, nofollow" />` : "";
  const faviconTag = input.faviconUrl ? `<link rel="icon" href="${escapeHtml(input.faviconUrl)}" />` : "";
  // Sprint 20A Task 6 SEO Generator — ogTitle/ogDescription/keywords are
  // optional, generated fields; falling back to title/metaDescription
  // keeps every page persisted before this task rendering identically.
  const ogTitle = input.page.ogTitle ?? input.page.title;
  const ogDescription = input.page.ogDescription ?? input.page.metaDescription;
  const keywordsTag = input.page.keywords?.length ? `<meta name="keywords" content="${escapeHtml(input.page.keywords.join(", "))}" />` : "";

  return `<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(input.page.title)}</title>
<meta name="description" content="${escapeHtml(input.page.metaDescription)}" />
${keywordsTag}
<link rel="canonical" href="${escapeHtml(canonical)}" />
${faviconTag}
${robotsTag}
<meta property="og:title" content="${escapeHtml(ogTitle)}" />
<meta property="og:description" content="${escapeHtml(ogDescription)}" />
<meta property="og:type" content="restaurant.restaurant" />
<meta property="og:url" content="${escapeHtml(canonical)}" />
<meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
<meta name="twitter:description" content="${escapeHtml(ogDescription)}" />
<meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
<script type="application/ld+json">${safeJsonLd(restaurantJsonLd)}</script>
<script type="application/ld+json">${safeJsonLd(breadcrumbJsonLd)}</script>`;
}
