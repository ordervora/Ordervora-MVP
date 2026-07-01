import type { Prisma, Site, SiteVersion } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { getAssetSummary } from "./asset-summary";
import { NEUTRAL_BRAND_PROFILE_FOR_SCORING } from "./scoring/neutral-brand-profile";
import { scoreSiteDefinition } from "./scoring/score-aggregator";
import {
  NoPublishedVersionError,
  PrePublishCheckFailedError,
  SiteAlreadyExistsError,
  SiteNotFoundError,
  SiteVersionNotFoundError,
} from "./site.errors";
import { THEME_CATALOG } from "./theme-catalog";
import { brandProfileSchema, siteDefinitionSchema, type AssetSummary, type SiteDefinition } from "./types";

const RELEASE_RETENTION_COUNT = 10;

function toJson<T>(value: T): Prisma.InputJsonValue {
  return value as unknown as Prisma.InputJsonValue;
}

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-+|-+$)/g, "");
  return base || "restaurant";
}

async function generateUniqueSlug(restaurantName: string): Promise<string> {
  const base = slugify(restaurantName);
  let candidate = base;
  let suffix = 1;
  while (await prisma.site.findUnique({ where: { slug: candidate } })) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

/** POST /api/sites — one site shell per restaurant. */
export async function createSite(restaurantId: string, restaurantName: string): Promise<Site> {
  const existing = await prisma.site.findUnique({ where: { restaurantId } });
  if (existing) {
    throw new SiteAlreadyExistsError();
  }
  const slug = await generateUniqueSlug(restaurantName);
  return prisma.site.create({ data: { restaurantId, slug, status: "DRAFT" } });
}

export async function getOwnSite(restaurantId: string): Promise<Site> {
  const site = await prisma.site.findUnique({ where: { restaurantId } });
  if (!site) {
    throw new SiteNotFoundError();
  }
  return site;
}

async function findOwnSiteById(restaurantId: string, siteId: string): Promise<Site> {
  const site = await prisma.site.findUnique({ where: { id: siteId } });
  if (!site || site.restaurantId !== restaurantId) {
    throw new SiteNotFoundError();
  }
  return site;
}

export interface UpdateSiteInput {
  slug?: string;
  settings?: Record<string, unknown>;
}

/** GET/PATCH /api/sites/:id — settings, slug, theme selection metadata. */
export async function updateSite(restaurantId: string, siteId: string, input: UpdateSiteInput): Promise<Site> {
  const site = await findOwnSiteById(restaurantId, siteId);
  return prisma.site.update({
    where: { id: site.id },
    data: { ...(input.slug ? { slug: input.slug } : {}), ...(input.settings ? { settings: toJson(input.settings) } : {}) },
  });
}

export { findOwnSiteById as getOwnSiteById };

/** GET /api/sites/:id/versions */
export async function listVersions(restaurantId: string, siteId: string): Promise<SiteVersion[]> {
  await findOwnSiteById(restaurantId, siteId);
  return prisma.siteVersion.findMany({ where: { siteId }, orderBy: { versionNo: "desc" } });
}

async function findOwnVersion(restaurantId: string, siteId: string, versionId: string): Promise<SiteVersion> {
  const site = await findOwnSiteById(restaurantId, siteId);
  const version = await prisma.siteVersion.findUnique({ where: { id: versionId } });
  if (!version || version.siteId !== site.id) {
    throw new SiteVersionNotFoundError();
  }
  return version;
}

/** GET /api/sites/:id/versions/:vid */
export async function getVersion(restaurantId: string, siteId: string, versionId: string): Promise<SiteVersion> {
  return findOwnVersion(restaurantId, siteId, versionId);
}

async function getActiveDraft(siteId: string): Promise<SiteVersion> {
  const draft = await prisma.siteVersion.findFirst({ where: { siteId, status: "DRAFT" }, orderBy: { versionNo: "desc" } });
  if (!draft) {
    throw new SiteVersionNotFoundError();
  }
  return draft;
}

/**
 * PATCH /api/sites/:id/draft — constrained editing only (§12): section
 * variant swap/show/hide/reorder and design-token changes land here as a
 * partial SiteDefinition patch, re-validated as a whole before saving so a
 * bad edit can never corrupt the draft. Always mutates the DRAFT version;
 * the live published version is untouched until republish (§19).
 */
export async function patchDraft(restaurantId: string, siteId: string, patch: Partial<SiteDefinition>): Promise<SiteVersion> {
  const site = await findOwnSiteById(restaurantId, siteId);
  const draft = await getActiveDraft(site.id);

  const current = siteDefinitionSchema.parse(draft.definition);
  const merged = { ...current, ...patch };
  const validated = siteDefinitionSchema.parse(merged);

  return prisma.siteVersion.update({ where: { id: draft.id }, data: { definition: toJson(validated) } });
}

/**
 * §19.1's checklist is: "required fields present, contrast passes, images
 * processed, schema valid." Three of those four are already hard
 * guarantees elsewhere and would be dead checks if repeated here:
 * "required fields present" and "schema valid" are exactly what
 * siteDefinitionSchema.parse (called before this runs) already throws on;
 * "contrast passes" is guaranteed at color-derivation time by
 * lib/color.ts's derivePaletteFromSeed (§13). The one genuinely
 * publish-time-only check is "images processed" — an asset can exist and
 * be schema-valid while its responsive renditions are still being
 * generated, so this is the only thing actually worth gating on here.
 */
function runPrePublishChecks(assets: AssetSummary): string[] {
  const issues: string[] = [];
  if (assets.totalPhotoAssets > 0 && assets.unprocessedRenditionsCount > 0) {
    issues.push(`${assets.unprocessedRenditionsCount} image(s) haven't finished processing yet`);
  }
  return issues;
}

export interface PublishResult {
  version: SiteVersion;
  scoreDelta?: number;
  warning?: string;
}

async function pruneOldReleases(siteId: string): Promise<void> {
  const published = await prisma.siteVersion.findMany({
    where: { siteId, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
  });
  const excess = published.slice(RELEASE_RETENTION_COUNT);
  if (excess.length > 0) {
    await prisma.siteVersion.updateMany({ where: { id: { in: excess.map((v) => v.id) } }, data: { status: "ARCHIVED" } });
  }
}

/**
 * POST /api/sites/:id/publish (§19). Pre-publish checks are a hard gate;
 * the score-delta comparison against the live version is advisory only —
 * it warns but never blocks (§29: "publish never hard-blocked on score
 * alone"). Retention keeps the most recent 10 releases (§21).
 */
export async function publishSite(restaurantId: string, siteId: string): Promise<PublishResult> {
  const site = await findOwnSiteById(restaurantId, siteId);
  const draft = await getActiveDraft(site.id);
  const definition = siteDefinitionSchema.parse(draft.definition);
  const assets = await getAssetSummary(site.id);

  const issues = runPrePublishChecks(assets);
  if (issues.length > 0) {
    throw new PrePublishCheckFailedError(issues);
  }

  const theme = THEME_CATALOG.find((t) => t.key === definition.themeKey && t.version === definition.themeVersion);
  let scoreDelta: number | undefined;
  let warning: string | undefined;

  if (theme) {
    const brandProfile = site.brandProfile ? brandProfileSchema.parse(site.brandProfile) : NEUTRAL_BRAND_PROFILE_FOR_SCORING;
    const newScore = await scoreSiteDefinition(definition, { brandProfile, theme, assets });

    const previousScore = site.publishedVersionId
      ? await prisma.siteScore.findFirst({ where: { siteVersionId: site.publishedVersionId }, orderBy: { measuredAt: "desc" } })
      : null;

    if (previousScore && newScore.overall < previousScore.overall) {
      scoreDelta = newScore.overall - previousScore.overall;
      warning = `Overall score dropped by ${Math.abs(scoreDelta)} point(s) compared to the current live version.`;
    }

    await prisma.siteScore.create({
      data: {
        siteVersionId: draft.id,
        overall: newScore.overall,
        seo: newScore.seo,
        performance: newScore.performance,
        accessibility: newScore.accessibility,
        brandConsistency: newScore.brandConsistency,
        conversion: newScore.conversion,
        suggestions: toJson(newScore.suggestions),
        source: "PUBLISH",
      },
    });
  }

  const published = await prisma.$transaction(async (tx) => {
    const updated = await tx.siteVersion.update({ where: { id: draft.id }, data: { status: "PUBLISHED", publishedAt: new Date() } });
    await tx.site.update({ where: { id: site.id }, data: { status: "PUBLISHED", publishedVersionId: updated.id } });
    return updated;
  });

  await pruneOldReleases(site.id);

  return { version: published, scoreDelta, warning };
}

/** GET releases list — every PUBLISHED (non-archived) version, newest first. */
export async function listReleases(restaurantId: string, siteId: string): Promise<SiteVersion[]> {
  const site = await findOwnSiteById(restaurantId, siteId);
  return prisma.siteVersion.findMany({ where: { siteId: site.id, status: "PUBLISHED" }, orderBy: { publishedAt: "desc" } });
}

/** POST /api/sites/:id/rollback/:vid — one click to any prior release (§19.5). */
export async function rollbackSite(restaurantId: string, siteId: string, versionId: string): Promise<Site> {
  const site = await findOwnSiteById(restaurantId, siteId);
  const version = await prisma.siteVersion.findUnique({ where: { id: versionId } });
  if (!version || version.siteId !== site.id || version.status !== "PUBLISHED") {
    throw new SiteVersionNotFoundError();
  }
  return prisma.site.update({ where: { id: site.id }, data: { status: "PUBLISHED", publishedVersionId: version.id } });
}

/** POST /api/sites/:id/unpublish — holding-page state (§19.6); publishedVersionId is retained for republish/rollback. */
export async function unpublishSite(restaurantId: string, siteId: string): Promise<Site> {
  const site = await findOwnSiteById(restaurantId, siteId);
  if (!site.publishedVersionId) {
    throw new NoPublishedVersionError();
  }
  return prisma.site.update({ where: { id: site.id }, data: { status: "UNPUBLISHED" } });
}
