import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { getStringEnv } from "../config/env";

export interface ReleaseStorage {
  savePage(siteId: string, versionId: string, slug: string, html: string): Promise<void>;
  readPage(siteId: string, versionId: string, slug: string): Promise<string | null>;
  saveAsset(siteId: string, versionId: string, filename: string, content: string): Promise<void>;
  readAsset(siteId: string, versionId: string, filename: string): Promise<string | null>;
}

function slugToFilename(slug: string): string {
  return slug === "/" ? "index.html" : `${slug.replace(/^\//, "").replace(/\//g, "-")}.html`;
}

/**
 * §19.3/§21 — the "static generation → object storage" step, substituted
 * with local disk (same swappable-interface pattern as fileStorage.ts and
 * safeFetch's design elsewhere in this codebase): publishSite renders
 * every page once and writes it here; production serving reads these
 * files back rather than re-rendering on every request. Deterministic
 * paths (siteId/versionId/page) rather than fileStorage's random UUID
 * naming, since these need to be looked up by known key, not by a
 * returned path.
 */
class LocalDiskReleaseStorage implements ReleaseStorage {
  // Read lazily (not cached at construction) so it reflects the current
  // env at call time — this module is a singleton created once at import.
  private get baseDir(): string {
    return path.resolve(getStringEnv("SITE_RELEASE_DIR", "uploads/site-releases"));
  }

  private versionDir(siteId: string, versionId: string): string {
    return path.join(this.baseDir, siteId, versionId);
  }

  async savePage(siteId: string, versionId: string, slug: string, html: string): Promise<void> {
    const dir = this.versionDir(siteId, versionId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, slugToFilename(slug)), html, "utf-8");
  }

  async readPage(siteId: string, versionId: string, slug: string): Promise<string | null> {
    try {
      return await readFile(path.join(this.versionDir(siteId, versionId), slugToFilename(slug)), "utf-8");
    } catch {
      return null;
    }
  }

  async saveAsset(siteId: string, versionId: string, filename: string, content: string): Promise<void> {
    const dir = this.versionDir(siteId, versionId);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), content, "utf-8");
  }

  async readAsset(siteId: string, versionId: string, filename: string): Promise<string | null> {
    try {
      return await readFile(path.join(this.versionDir(siteId, versionId), filename), "utf-8");
    } catch {
      return null;
    }
  }
}

export const releaseStorage: ReleaseStorage = new LocalDiskReleaseStorage();
