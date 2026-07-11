import type { ContentGeneration, Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import {
  applyCta,
  applyFaq,
  applyFooter,
  applyFullContent,
  applyHero,
  applyAbout,
  applyContact,
  applyFeatured,
  applySeo,
  applyWhyChooseUs,
  defaultPageSlugForScope,
} from "./ai-content/apply-content";
import { generateAbout, generateContact, generateCta, generateFaq, generateFeatured, generateFooter, generateFullContent, generateHero, generateSeo, generateWhyChooseUs } from "./ai-content/content-engine";
import type { ContentGenerationScopeValue, FullGeneratedContent } from "./ai-content/types";
import { ingestRestaurantData } from "./ingest";
import { ContentGenerationNotFoundError } from "./site.errors";
import { getDraftDefinition, getOwnSiteById, patchDraft } from "./site.service";
import type { SiteDefinition } from "./types";

function toJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

const PAGE_NAME_BY_SLUG: Record<string, string> = { "/": "Home", "/menu": "Menu", "/about": "About", "/contact": "Contact", "/gallery": "Gallery" };

export interface GenerateContentInput {
  scope: ContentGenerationScopeValue;
  pageSlug?: string;
}

export interface ContentGenerationSummary {
  id: string;
  siteId: string;
  versionNo: number;
  scope: ContentGenerationScopeValue;
  pageSlug: string | null;
  status: ContentGeneration["status"];
  provider: string | null;
  restoredFromId: string | null;
  createdAt: Date;
}

function toSummary(row: ContentGeneration): ContentGenerationSummary {
  return {
    id: row.id,
    siteId: row.siteId,
    versionNo: row.versionNo,
    scope: row.scope,
    pageSlug: row.pageSlug,
    status: row.status,
    provider: row.provider,
    restoredFromId: row.restoredFromId,
    createdAt: row.createdAt,
  };
}

async function nextVersionNo(siteId: string): Promise<number> {
  const last = await prisma.contentGeneration.findFirst({ where: { siteId }, orderBy: { versionNo: "desc" } });
  return (last?.versionNo ?? 0) + 1;
}

/**
 * Sprint 20A Task 6 — generate (scope "FULL") or regenerate (any other
 * scope) AI content for a site's current draft. Reuses `patchDraft` for
 * persistence (never a parallel mutation path — the same re-validated-
 * whole-object guarantee applies here as every other draft edit) and
 * records an immutable `ContentGeneration` row first, so "never overwrite
 * previous generated content" holds even though the draft itself gets
 * overwritten by design (that's what a draft is).
 */
export async function generateContent(restaurantId: string, siteId: string, userId: string, input: GenerateContentInput): Promise<{ generation: ContentGenerationSummary; definition: SiteDefinition }> {
  const { site, definition } = await getDraftDefinition(restaurantId, siteId);
  const ingest = await ingestRestaurantData(site.restaurantId);
  const pageSlug = input.pageSlug ?? defaultPageSlugForScope(input.scope, definition);
  const pageName = PAGE_NAME_BY_SLUG[pageSlug] ?? "Home";

  let content: unknown;
  let provider: string | null;
  let patch: Partial<SiteDefinition>;

  switch (input.scope) {
    case "FULL": {
      const aboutSlug = defaultPageSlugForScope("ABOUT", definition);
      const contactSlug = defaultPageSlugForScope("CONTACT", definition);
      const result = await generateFullContent(ingest, definition.facts, pageName);
      content = result.content;
      provider = result.provider;
      patch = applyFullContent(definition, result.content as FullGeneratedContent, pageSlug, aboutSlug, contactSlug);
      break;
    }
    case "HERO": {
      const result = await generateHero(ingest);
      content = result.content;
      provider = result.provider;
      patch = applyHero(definition, result.content, pageSlug);
      break;
    }
    case "ABOUT": {
      const result = await generateAbout(ingest);
      content = result.content;
      provider = result.provider;
      patch = applyAbout(definition, result.content, pageSlug);
      break;
    }
    case "WHY_CHOOSE_US": {
      const result = await generateWhyChooseUs(ingest);
      content = result.content;
      provider = result.provider;
      patch = applyWhyChooseUs(definition, result.content, pageSlug);
      break;
    }
    case "FEATURED": {
      const result = await generateFeatured(ingest);
      content = result.content;
      provider = result.provider;
      patch = applyFeatured(definition, result.content, pageSlug);
      break;
    }
    case "CONTACT": {
      const result = await generateContact(ingest);
      content = result.content;
      provider = result.provider;
      patch = applyContact(definition, result.content, pageSlug);
      break;
    }
    case "FOOTER": {
      const result = await generateFooter(ingest);
      content = result.content;
      provider = result.provider;
      patch = applyFooter(definition, result.content);
      break;
    }
    case "SEO": {
      const result = await generateSeo(ingest, pageName);
      content = result.content;
      provider = result.provider;
      patch = applySeo(definition, result.content, pageSlug);
      break;
    }
    case "CTA": {
      const result = generateCta(ingest, definition.facts);
      content = result.content;
      provider = result.provider;
      patch = applyCta(definition, result.content, pageSlug);
      break;
    }
    case "FAQ": {
      const result = await generateFaq(ingest);
      content = result.content;
      provider = result.provider;
      patch = applyFaq(definition, result.content, pageSlug);
      break;
    }
  }

  const versionNo = await nextVersionNo(site.id);
  const row = await prisma.contentGeneration.create({
    data: {
      siteId: site.id,
      versionNo,
      scope: input.scope,
      pageSlug: input.scope === "FOOTER" ? null : pageSlug,
      content: toJson(content),
      status: "COMPLETED",
      provider,
      createdById: userId,
    },
  });

  const updatedVersion = await patchDraft(restaurantId, siteId, patch);
  const updatedDefinition = updatedVersion.definition as unknown as SiteDefinition;

  return { generation: toSummary(row), definition: updatedDefinition };
}

/**
 * GET .../content/generations — full history, most recent first. Uses the
 * plain tenant-checked site lookup (not `getDraftDefinition`) since
 * history should stay listable even in the unlikely case a site has no
 * active draft right now.
 */
export async function listContentGenerations(restaurantId: string, siteId: string): Promise<ContentGenerationSummary[]> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const rows = await prisma.contentGeneration.findMany({ where: { siteId: site.id }, orderBy: { versionNo: "desc" } });
  return rows.map(toSummary);
}

/**
 * POST .../content/generations/:id/restore — re-applies a past
 * generation's stored content onto the CURRENT draft (which may have
 * moved on since), via the same apply-content mapping a fresh generation
 * uses, and records the restore as a new ContentGeneration row pointing
 * back at the original (`restoredFromId`) — restoring never deletes or
 * mutates the row being restored from.
 */
export async function restoreContentGeneration(restaurantId: string, siteId: string, generationId: string, userId: string): Promise<{ generation: ContentGenerationSummary; definition: SiteDefinition }> {
  const { site, definition } = await getDraftDefinition(restaurantId, siteId);
  const original = await prisma.contentGeneration.findUnique({ where: { id: generationId } });
  if (!original || original.siteId !== site.id) {
    throw new ContentGenerationNotFoundError();
  }

  const pageSlug = original.pageSlug ?? defaultPageSlugForScope(original.scope, definition);

  let patch: Partial<SiteDefinition>;
  const content = original.content;
  switch (original.scope) {
    case "FULL": {
      const aboutSlug = defaultPageSlugForScope("ABOUT", definition);
      const contactSlug = defaultPageSlugForScope("CONTACT", definition);
      patch = applyFullContent(definition, content as unknown as FullGeneratedContent, pageSlug, aboutSlug, contactSlug);
      break;
    }
    case "HERO":
      patch = applyHero(definition, content as never, pageSlug);
      break;
    case "ABOUT":
      patch = applyAbout(definition, content as never, pageSlug);
      break;
    case "WHY_CHOOSE_US":
      patch = applyWhyChooseUs(definition, content as never, pageSlug);
      break;
    case "FEATURED":
      patch = applyFeatured(definition, content as never, pageSlug);
      break;
    case "CONTACT":
      patch = applyContact(definition, content as never, pageSlug);
      break;
    case "FOOTER":
      patch = applyFooter(definition, content as never);
      break;
    case "SEO":
      patch = applySeo(definition, content as never, pageSlug);
      break;
    case "CTA":
      patch = applyCta(definition, content as never, pageSlug);
      break;
    case "FAQ":
      patch = applyFaq(definition, content as never, pageSlug);
      break;
  }

  const versionNo = await nextVersionNo(site.id);
  const row = await prisma.contentGeneration.create({
    data: {
      siteId: site.id,
      versionNo,
      scope: original.scope,
      pageSlug: original.pageSlug,
      content: original.content as Prisma.InputJsonValue,
      status: "COMPLETED",
      provider: original.provider,
      restoredFromId: original.id,
      createdById: userId,
    },
  });

  const updatedVersion = await patchDraft(restaurantId, siteId, patch);
  const updatedDefinition = updatedVersion.definition as unknown as SiteDefinition;

  return { generation: toSummary(row), definition: updatedDefinition };
}
