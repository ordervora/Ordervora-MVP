import { ImportSourceType } from "@prisma/client";
import { NotImplementedError } from "../import.errors";
import type { ExtractedMenuData, ImportAdapter, ImportSourceInput } from "../types";

/**
 * Stub — real implementation (fetch + scrape a restaurant's menu page)
 * is deferred. Registered now so the sourceType is a real, selectable
 * option end-to-end; only extract() needs to be filled in later.
 */
export class WebsiteImportAdapter implements ImportAdapter {
  readonly sourceType = ImportSourceType.WEBSITE;
  readonly implemented = false;

  async extract(_input: ImportSourceInput): Promise<ExtractedMenuData> {
    throw new NotImplementedError(this.sourceType);
  }
}
