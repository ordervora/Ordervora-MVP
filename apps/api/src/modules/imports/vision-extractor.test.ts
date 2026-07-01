import { beforeEach, describe, expect, it, vi } from "vitest";

const mockCreate = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

import { extractMenuFromImages } from "./vision-extractor";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractMenuFromImages", () => {
  it("parses a valid AI response into ExtractedMenuData", async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            categories: [{ name: "Mains", items: [{ name: "Burger", priceCents: 1200 }] }],
          }),
        },
      ],
    });

    const result = await extractMenuFromImages([Buffer.from("fake-image")], "image/png");

    expect(result.categories[0]?.name).toBe("Mains");
    expect(result.categories[0]?.items[0]).toEqual({ name: "Burger", priceCents: 1200 });
  });

  it("rejects a malformed AI response that doesn't match the expected schema", async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify({ notCategories: [] }) }],
    });

    await expect(extractMenuFromImages([Buffer.from("fake-image")], "image/png")).rejects.toThrow();
  });

  it("rejects when the AI response contains no text block", async () => {
    mockCreate.mockResolvedValue({ content: [] });

    await expect(extractMenuFromImages([Buffer.from("fake-image")], "image/png")).rejects.toThrow();
  });
});
