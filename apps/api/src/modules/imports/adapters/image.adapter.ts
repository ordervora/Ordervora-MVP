import { ImportSourceType } from "@prisma/client";
import type { Base64ImageSource } from "@anthropic-ai/sdk/resources/messages";
import { extractMenuFromImages } from "../vision-extractor";
import type { ExtractedMenuData, ImportAdapter, ImportSourceInput } from "../types";

const SUPPORTED_MIME_TYPES: Base64ImageSource["media_type"][] = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
];

export class ImageImportAdapter implements ImportAdapter {
  readonly sourceType = ImportSourceType.IMAGE;
  readonly implemented = true;

  async extract(input: ImportSourceInput): Promise<ExtractedMenuData> {
    if (input.kind !== "file") {
      throw new Error("Image import requires a file upload");
    }

    const mediaType = SUPPORTED_MIME_TYPES.find((type) => type === input.mimeType);
    if (!mediaType) {
      throw new Error(`Unsupported image type: ${input.mimeType}`);
    }

    return extractMenuFromImages([input.buffer], mediaType);
  }
}
