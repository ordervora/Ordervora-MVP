import type { ImportSourceType } from "@prisma/client";
import { z } from "zod";

export interface FileImportInput {
  kind: "file";
  buffer: Buffer;
  mimeType: string;
}

export interface UrlImportInput {
  kind: "url";
  url: string;
}

/**
 * What an adapter receives. File-based sources (PDF, Image) get a buffer;
 * URL-based sources (Website, Google Maps, DoorDash, Uber Eats, Grubhub)
 * get a URL. Each adapter owns however it turns this into ExtractedMenuData.
 */
export type ImportSourceInput = FileImportInput | UrlImportInput;

export const extractedMenuDataSchema = z.object({
  categories: z.array(
    z.object({
      name: z.string().min(1),
      items: z.array(
        z.object({
          name: z.string().min(1),
          description: z.string().optional(),
          priceCents: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});

export type ExtractedMenuData = z.infer<typeof extractedMenuDataSchema>;

/**
 * The single extensibility seam: every import source, present or future,
 * implements this interface. The registry looks adapters up by sourceType;
 * nothing else in the request path branches on source type.
 *
 * `implemented` lets the controller return a synchronous 501 for
 * not-yet-built sources without ever hardcoding a list of which ones —
 * it just checks the flag the registered adapter reports.
 */
export interface ImportAdapter {
  readonly sourceType: ImportSourceType;
  readonly implemented: boolean;
  extract(input: ImportSourceInput): Promise<ExtractedMenuData>;
}
