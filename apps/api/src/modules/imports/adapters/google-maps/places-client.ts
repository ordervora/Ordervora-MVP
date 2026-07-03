import { getStringEnv } from "../../../../config/env";

export interface PlaceDetails {
  name?: string;
  address?: string;
  phone?: string;
  photoNames: string[];
}

const FIELD_MASK = "displayName,formattedAddress,internationalPhoneNumber,photos";

interface PlaceDetailsResponse {
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  photos?: { name: string }[];
}

/**
 * Google Places API (New) has no itemized-menu endpoint — this returns
 * profile fields plus photo references only; any menu content comes
 * from running those photos through the existing vision extractor.
 */
export async function getPlaceDetails(placeId: string): Promise<PlaceDetails> {
  const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "X-Goog-Api-Key": getStringEnv("GOOGLE_MAPS_API_KEY", ""),
      "X-Goog-FieldMask": FIELD_MASK,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Places API request failed with status ${response.status}`);
  }

  const data = (await response.json()) as PlaceDetailsResponse;

  return {
    name: data.displayName?.text,
    address: data.formattedAddress,
    phone: data.internationalPhoneNumber,
    photoNames: (data.photos ?? []).map((photo) => photo.name),
  };
}

export async function getPlacePhoto(photoName: string, maxWidthPx = 1024): Promise<Buffer> {
  const response = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=${maxWidthPx}&key=${getStringEnv("GOOGLE_MAPS_API_KEY", "")}`,
  );

  if (!response.ok) {
    throw new Error(`Google Places photo request failed with status ${response.status}`);
  }

  return Buffer.from(await response.arrayBuffer());
}
