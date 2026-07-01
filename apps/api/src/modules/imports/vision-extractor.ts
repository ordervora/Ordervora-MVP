import Anthropic from "@anthropic-ai/sdk";
import type { Base64ImageSource } from "@anthropic-ai/sdk/resources/messages";
import { extractedMenuDataSchema, type ExtractedMenuData } from "./types";

const MODEL = "claude-sonnet-5";

const EXTRACTION_PROMPT = `You are extracting a restaurant menu from the attached image(s).
Return ONLY a JSON object (no prose, no markdown fences) matching this shape:

{
  "categories": [
    {
      "name": "string",
      "items": [
        { "name": "string", "description": "string (optional)", "priceCents": integer }
      ]
    }
  ]
}

Prices must be integer cents (e.g. $12.50 -> 1250). If a price is unclear, make your best estimate.
Group items under the categories shown in the menu; if none are visible, use a single "Menu" category.`;

function toBase64ImageBlock(image: Buffer, mediaType: Base64ImageSource["media_type"]) {
  return {
    type: "image" as const,
    source: {
      type: "base64" as const,
      media_type: mediaType,
      data: image.toString("base64"),
    },
  };
}

/**
 * Shared extraction core used by both the PDF adapter (which renders
 * pages to images first) and the Image adapter (which passes the
 * uploaded image straight through) — the one concrete code-reuse point
 * the two MVP adapters have in common.
 */
export async function extractMenuFromImages(
  images: Buffer[],
  mediaType: Base64ImageSource["media_type"],
): Promise<ExtractedMenuData> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [...images.map((image) => toBase64ImageBlock(image, mediaType)), { type: "text", text: EXTRACTION_PROMPT }],
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("AI response contained no text content");
  }

  const parsed: unknown = JSON.parse(textBlock.text);
  return extractedMenuDataSchema.parse(parsed);
}
