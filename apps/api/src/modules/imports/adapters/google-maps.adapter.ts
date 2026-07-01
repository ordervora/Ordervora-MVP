import { ImportSourceType } from "@prisma/client";
import { mergeExtractedMenuData } from "../merge-extracted-data";
import type { ExtractedMenuData, ImportAdapter, ImportSourceInput } from "../types";
import { extractMenuFromImages } from "../vision-extractor";
import { getPlaceDetails, getPlacePhoto } from "./google-maps/places-client";
import { resolvePlaceId } from "./google-maps/resolve-place-id";

const MAX_PHOTOS = 3;

export class GoogleMapsImportAdapter implements ImportAdapter {
  readonly sourceType = ImportSourceType.GOOGLE_MAPS;
  readonly implemented = true;
  readonly inputKind = "url" as const;

  async extract(input: ImportSourceInput): Promise<ExtractedMenuData> {
    if (input.kind !== "url") {
      throw new Error("Google Maps import requires a place URL or Place ID");
    }

    const placeId = await resolvePlaceId(input.url);
    const details = await getPlaceDetails(placeId);

    const results: ExtractedMenuData[] = [];

    if (details.name ?? details.address ?? details.phone) {
      results.push({
        categories: [],
        businessProfile: { name: details.name, address: details.address, phone: details.phone },
      });
    }

    for (const photoName of details.photoNames.slice(0, MAX_PHOTOS)) {
      results.push(...(await this.tryExtractPhoto(photoName)));
    }

    return mergeExtractedMenuData(results);
  }

  private async tryExtractPhoto(photoName: string): Promise<ExtractedMenuData[]> {
    try {
      const photoBuffer = await getPlacePhoto(photoName);
      return [await extractMenuFromImages([photoBuffer], "image/jpeg")];
    } catch {
      // A single bad/unavailable photo shouldn't fail the whole import.
      return [];
    }
  }
}
