import type { Prisma, Site, SiteVersion } from "@prisma/client";
import { getStringEnv } from "../../config/env";
import { prisma } from "../../lib/prisma";
import { releaseStorage } from "../../lib/release-storage";
import { getAssetSummary } from "./asset-summary";
import { renderOgImageSvg } from "./renderer/og-image";
import { renderAllPages } from "./renderer/render-site";
import { renderRobotsTxt, renderSitemapXml } from "./renderer/sitemap";
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

const PLATFORM_DOMAIN = getStringEnv("SITE_PLATFORM_DOMAIN", "sites.ordervora.example");

/** §20 — a verified, primary custom domain wins; otherwise the platform subdomain. */
export async function resolveSiteUrl(site: Site): Promise<string> {
  const primaryDomain = await prisma.domain.findFirst({
    where: { siteId: site.id, isPrimary: true, verificationStatus: "VERIFIED" },
  });
  const host = primaryDomain ? primaryDomain.hostname : `${site.slug}.${PLATFORM_DOMAIN}`;
  return `https://${host}`;
}

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

export interface PublishIssue {
  code: "BUSINESS_NAME" | "THEME_SELECTED" | "WEBSITE_CONTENT" | "REQUIRED_PAGES" | "MENU" | "NAVIGATION" | "ASSETS";
  message: string;
}

export interface PublishReadiness {
  ready: boolean;
  issues: PublishIssue[];
}

/**
 * Sprint 20A — a read-only version of the pre-publish gate the owner can
 * call *before* clicking Publish, so the Studio's staged workflow can show
 * "helpful guidance" up front instead of only discovering a problem after
 * starting the flow. `publishSite` below runs the same checks again (never
 * trusts the client skipped this) and throws `PrePublishCheckFailedError`
 * if anything is still missing.
 */
export async function validatePublishReadiness(restaurantId: string, siteId: string): Promise<PublishReadiness> {
  const site = await findOwnSiteById(restaurantId, siteId);
  const issues: PublishIssue[] = [];

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant || !restaurant.name.trim()) {
    issues.push({ code: "BUSINESS_NAME", message: "Add your business name in Restaurant settings before publishing." });
  }

  const draft = await prisma.siteVersion.findFirst({ where: { siteId: site.id, status: "DRAFT" }, orderBy: { versionNo: "desc" } });
  if (!draft) {
    issues.push({ code: "THEME_SELECTED", message: "Choose a brand concept/theme before publishing — no draft has been selected yet." });
    // Nothing else below is checkable without a draft.
    return { ready: issues.length === 0, issues };
  }

  const parsedDefinition = siteDefinitionSchema.safeParse(draft.definition);
  if (!parsedDefinition.success) {
    issues.push({ code: "WEBSITE_CONTENT", message: "Your website content is incomplete or invalid — reopen the editor to finish it." });
  } else {
    if (parsedDefinition.data.pages.length === 0) {
      issues.push({ code: "REQUIRED_PAGES", message: "Your website needs at least one page before it can go live." });
    } else if (!parsedDefinition.data.pages.some((page) => page.slug === "/")) {
      issues.push({ code: "REQUIRED_PAGES", message: "Your website needs a home page before it can go live." });
    }
    if (parsedDefinition.data.pages.length < 2) {
      issues.push({ code: "NAVIGATION", message: "Add at least one more page (like Menu or About) so visitors have somewhere to navigate." });
    }
  }

  const menuItemCount = await prisma.menuItem.count({ where: { restaurantId } });
  if (menuItemCount === 0) {
    issues.push({ code: "MENU", message: "Add at least one menu item before publishing — an empty menu isn't ready for customers." });
  }

  const assets = await getAssetSummary(site.id);
  const assetIssues = runPrePublishChecks(assets);
  for (const message of assetIssues) {
    issues.push({ code: "ASSETS", message });
  }

  return { ready: issues.length === 0, issues };
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
 *
 * Sprint 20A: the site's `status` is now a real, persisted signal for the
 * duration of this call — PUBLISHING for a site's first release,
 * REPUBLISHING when one is already live — flipped to PUBLISHED on success
 * or FAILED if anything below throws, so a crashed/interrupted publish
 * never silently leaves the site claiming a status that isn't true. The
 * caller (the Studio's staged publish flow) polls/observes this via the
 * same `GET /api/sites/me` it already fetches.
 */
export async function publishSite(restaurantId: string, siteId: string, publishedById: string): Promise<PublishResult> {
  const site = await findOwnSiteById(restaurantId, siteId);
  const readiness = await validatePublishReadiness(restaurantId, siteId);
  if (!readiness.ready) {
    throw new PrePublishCheckFailedError(readiness.issues.map((issue) => issue.message));
  }

  const wasAlreadyPublished = site.status === "PUBLISHED";
  await prisma.site.update({ where: { id: site.id }, data: { status: wasAlreadyPublished ? "REPUBLISHING" : "PUBLISHING" } });

  try {
    const draft = await getActiveDraft(site.id);
    const definition = siteDefinitionSchema.parse(draft.definition);
    const assets = await getAssetSummary(site.id);

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
      const updated = await tx.siteVersion.update({
        where: { id: draft.id },
        data: { status: "PUBLISHED", publishedAt: new Date(), publishedById },
      });
      await tx.site.update({ where: { id: site.id }, data: { status: "PUBLISHED", publishedVersionId: updated.id } });
      return updated;
    });

    await materializeStaticRelease(site, published.id, definition);
    await pruneOldReleases(site.id);

    return { version: published, scoreDelta, warning };
  } catch (err) {
    await prisma.site.update({ where: { id: site.id }, data: { status: "FAILED" } });
    throw err;
  }
}

/**
 * §19.3 Static generation: renders every page once via the shared
 * renderer and writes it to release storage (this environment's stand-in
 * for "uploaded to object storage; CDN cache invalidated" — see Known
 * Limitations for what a real CDN swap would replace). Also emits
 * sitemap.xml, robots.txt, and the OG share image once per release (§9-10).
 */
async function materializeStaticRelease(site: Site, versionId: string, definition: SiteDefinition): Promise<void> {
  const siteUrl = await resolveSiteUrl(site);
  const pages = await renderAllPages({ siteId: site.id, restaurantId: site.restaurantId, definition, siteUrl });

  await Promise.all([
    ...Array.from(pages.entries()).map(([slug, html]) => releaseStorage.savePage(site.id, versionId, slug, html)),
    releaseStorage.saveAsset(site.id, versionId, "sitemap.xml", renderSitemapXml(siteUrl, definition.pages)),
    releaseStorage.saveAsset(site.id, versionId, "robots.txt", renderRobotsTxt(siteUrl)),
    releaseStorage.saveAsset(
      site.id,
      versionId,
      "og-image.svg",
      renderOgImageSvg({ restaurantName: definition.restaurantName, cuisine: definition.cuisine, colorSeed: definition.colorSeed }),
    ),
  ]);
}

/**
 * §19.4 Menu revalidation: re-renders and overwrites the currently
 * published release's pages using live menu/profile data — called after
 * any menu or restaurant-profile mutation (see menu.service.ts /
 * restaurant.service.ts) so a price change appears on the live site
 * without a full republish (acceptance criterion #8). A no-op if the
 * restaurant has no published site.
 */
export async function revalidatePublishedSite(restaurantId: string): Promise<void> {
  const site = await prisma.site.findUnique({ where: { restaurantId } });
  if (!site || site.status !== "PUBLISHED" || !site.publishedVersionId) {
    return;
  }

  const version = await prisma.siteVersion.findUnique({ where: { id: site.publishedVersionId } });
  if (!version) return;

  const definition = siteDefinitionSchema.parse(version.definition);
  await materializeStaticRelease(site, version.id, definition);
}

/** GET releases list — every PUBLISHED (non-archived) version, newest first. */
export interface ReleaseWithPublisher extends SiteVersion {
  publishedBy: { name: string } | null;
}

export async function listReleases(restaurantId: string, siteId: string): Promise<ReleaseWithPublisher[]> {
  const site = await findOwnSiteById(restaurantId, siteId);
  return prisma.siteVersion.findMany({
    where: { siteId: site.id, status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: { publishedBy: { select: { name: true } } },
  });
}

/** POST /api/sites/:id/rollback/:vid — one click to any prior release (§19.5). */
export async function rollbackSite(restaurantId: string, siteId: string, versionId: string): Promise<Site> {
  const site = await findOwnSiteById(restaurantId, siteId);
  const version = await prisma.siteVersion.findUnique({ where: { id: versionId } });
  if (!version || version.siteId !== site.id || version.status !== "PUBLISHED") {
    throw new SiteVersionNotFoundError();
  }
  const updated = await prisma.site.update({ where: { id: site.id }, data: { status: "PUBLISHED", publishedVersionId: version.id } });

  // Re-materialize with current live menu/profile data so a rollback never
  // resurrects stale prices from whenever this release was first published.
  const definition = siteDefinitionSchema.parse(version.definition);
  await materializeStaticRelease(updated, version.id, definition);

  return updated;
}

/** POST /api/sites/:id/unpublish — holding-page state (§19.6); publishedVersionId is retained for republish/rollback. */
export async function unpublishSite(restaurantId: string, siteId: string): Promise<Site> {
  const site = await findOwnSiteById(restaurantId, siteId);
  if (!site.publishedVersionId) {
    throw new NoPublishedVersionError();
  }
  return prisma.site.update({ where: { id: site.id }, data: { status: "UNPUBLISHED" } });
}
