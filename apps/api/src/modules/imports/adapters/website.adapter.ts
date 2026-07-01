import { ImportSourceType } from "@prisma/client";
import type { Base64ImageSource } from "@anthropic-ai/sdk/resources/messages";
import { safeFetch } from "../../../lib/safe-fetch";
import { mergeExtractedMenuData } from "../merge-extracted-data";
import type { ExtractedMenuData, ImportAdapter, ImportSourceInput } from "../types";
import { extractMenuFromImages, extractMenuFromText } from "../vision-extractor";
import { parsePage } from "./website/parse-page";
import { rankMenuImages } from "./website/rank-menu-images";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const IMAGE_MIME_BY_EXTENSION: Record<string, Base64ImageSource["media_type"]> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function guessMediaType(url: string): Base64ImageSource["media_type"] | undefined {
  const path = new URL(url).pathname.toLowerCase();
  const extension = Object.keys(IMAGE_MIME_BY_EXTENSION).find((ext) => path.endsWith(ext));
  return extension ? IMAGE_MIME_BY_EXTENSION[extension] : undefined;
}

function maxWebsiteImages(): number {
  return Number(process.env.IMPORT_WEBSITE_MAX_IMAGES ?? 5);
}

export class WebsiteImportAdapter implements ImportAdapter {
  readonly sourceType = ImportSourceType.WEBSITE;
  readonly implemented = true;
  readonly inputKind = "url" as const;

  async extract(input: ImportSourceInput): Promise<ExtractedMenuData> {
    if (input.kind !== "url") {
      throw new Error("Website import requires a source URL");
    }

    const page = await safeFetch(input.url);
    const html = page.buffer.toString("utf-8");
    const { text, images } = parsePage(html, page.finalUrl);
    const rankedImages = rankMenuImages(images).slice(0, maxWebsiteImages());

    const results: ExtractedMenuData[] = [];

    if (text.length > 0) {
      results.push(...(await this.tryExtractText(text)));
    }

    for (const image of rankedImages) {
      results.push(...(await this.tryExtractImage(image.src)));
    }

    return mergeExtractedMenuData(results);
  }

  private async tryExtractText(text: string): Promise<ExtractedMenuData[]> {
    try {
      return [await extractMenuFromText(text)];
    } catch {
      // Text extraction failing shouldn't sink the whole import if any
      // images still succeed.
      return [];
    }
  }

  private async tryExtractImage(src: string): Promise<ExtractedMenuData[]> {
    const mediaType = guessMediaType(src);
    if (!mediaType) return [];

    try {
      const fetched = await safeFetch(src, { maxBytes: MAX_IMAGE_BYTES });
      return [await extractMenuFromImages([fetched.buffer], mediaType)];
    } catch {
      // A single bad image (fetch failure, disallowed host, unsupported
      // content, etc.) shouldn't fail the whole import — skip it.
      return [];
    }
  }
}
