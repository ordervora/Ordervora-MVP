import path from "node:path";

/**
 * Maps a SiteAsset's storageKey (a filesystem path from fileStorage.save)
 * to a publicly servable URL. Paired with the `/assets` static route in
 * app.ts. Deliberately just the basename — fileStorage already generates
 * random UUID filenames, so no path traversal / enumeration risk in
 * practice, but this function is the one seam to swap if storage moves
 * to a real CDN with content-hashed keys later.
 */
export function assetUrl(storageKey: string): string {
  return `/assets/${path.basename(storageKey)}`;
}
