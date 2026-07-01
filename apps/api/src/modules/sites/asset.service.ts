import type { AssetKind, SiteAsset } from "@prisma/client";
import { fileStorage } from "../../lib/file-storage";
import { prisma } from "../../lib/prisma";
import { getOwnSiteById } from "./site.service";
import { AssetNotFoundError } from "./site.errors";

export interface UploadedAssetFile {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
}

/**
 * §23 describes a presigned-upload-URL flow direct to object storage;
 * there's no live S3-compatible bucket in this environment, so this MVP
 * substitutes a server-side multipart upload through the same swappable
 * `fileStorage` abstraction the Import Engine already uses (Sprint 04) —
 * functionally equivalent for the owner's UX, and swapping in presigned
 * URLs later only touches this function, not its callers. Real image
 * processing (WebP/AVIF renditions, LQIP placeholders, EXIF/GPS stripping)
 * is NOT implemented — `renditions` stays null until a future pipeline
 * exists; see Known Limitations. Because that's genuinely unprocessed,
 * every asset created here correctly reports as "unprocessed" to the
 * Performance score and pre-publish check, rather than faking readiness.
 */
export async function uploadAsset(
  restaurantId: string,
  siteId: string,
  kind: AssetKind,
  file: UploadedAssetFile,
): Promise<SiteAsset> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const saved = await fileStorage.save(file.buffer, file.originalName);
  const sortOrder = await prisma.siteAsset.count({ where: { siteId: site.id, kind } });
  return prisma.siteAsset.create({ data: { siteId: site.id, kind, storageKey: saved.path, sortOrder } });
}

export async function listAssets(restaurantId: string, siteId: string): Promise<SiteAsset[]> {
  const site = await getOwnSiteById(restaurantId, siteId);
  return prisma.siteAsset.findMany({ where: { siteId: site.id }, orderBy: [{ kind: "asc" }, { sortOrder: "asc" }] });
}

async function findOwnAsset(siteId: string, assetId: string): Promise<SiteAsset> {
  const asset = await prisma.siteAsset.findUnique({ where: { id: assetId } });
  if (!asset || asset.siteId !== siteId) {
    throw new AssetNotFoundError();
  }
  return asset;
}

export interface UpdateAssetInput {
  altText?: string;
  sortOrder?: number;
}

export async function updateAsset(restaurantId: string, siteId: string, assetId: string, input: UpdateAssetInput): Promise<SiteAsset> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const asset = await findOwnAsset(site.id, assetId);
  return prisma.siteAsset.update({ where: { id: asset.id }, data: input });
}

export async function deleteAsset(restaurantId: string, siteId: string, assetId: string): Promise<void> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const asset = await findOwnAsset(site.id, assetId);
  await prisma.siteAsset.delete({ where: { id: asset.id } });
}

const ASSET_KIND_LABEL: Record<AssetKind, string> = {
  HERO: "Hero photo",
  GALLERY: "Gallery photo",
  LOGO: "Logo",
  OG: "Share image",
};

function autoGenerateAltText(kind: AssetKind, restaurantName: string, index: number): string {
  const label = ASSET_KIND_LABEL[kind];
  return index > 0 ? `${label} of ${restaurantName} (${index + 1})` : `${label} of ${restaurantName}`;
}

/**
 * autoFixKind: "missingAltText" (§2c). Alt text lives on SiteAsset rows,
 * not inside the SiteDefinition JSON, so this fix runs at the asset layer
 * rather than through apply-suggestion.ts's definition mutators.
 */
export async function autoFillMissingAltText(restaurantId: string, siteId: string): Promise<number> {
  const site = await getOwnSiteById(restaurantId, siteId);
  const restaurant = await prisma.restaurant.findUniqueOrThrow({ where: { id: site.restaurantId }, select: { name: true } });
  const missing = await prisma.siteAsset.findMany({ where: { siteId: site.id, altText: null }, orderBy: { sortOrder: "asc" } });

  await Promise.all(
    missing.map((asset, index) =>
      prisma.siteAsset.update({ where: { id: asset.id }, data: { altText: autoGenerateAltText(asset.kind, restaurant.name, index) } }),
    ),
  );

  return missing.length;
}
