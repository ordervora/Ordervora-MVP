import { ImportSourceType } from "@prisma/client";
import { NotImplementedError } from "../import.errors";
import type { ExtractedMenuData, ImportAdapter, ImportSourceInput } from "../types";

/**
 * Stub — real implementation (Google Places API lookup) is deferred.
 */
export class GoogleMapsImportAdapter implements ImportAdapter {
  readonly sourceType = ImportSourceType.GOOGLE_MAPS;
  readonly implemented = false;

  async extract(_input: ImportSourceInput): Promise<ExtractedMenuData> {
    throw new NotImplementedError(this.sourceType);
  }
}
