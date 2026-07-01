import { describe, expect, it } from "vitest";
import { mergeExtractedMenuData } from "./merge-extracted-data";

describe("mergeExtractedMenuData", () => {
  it("concatenates categories across results in order", () => {
    const result = mergeExtractedMenuData([
      { categories: [{ name: "Appetizers", items: [] }] },
      { categories: [{ name: "Mains", items: [] }] },
    ]);

    expect(result.categories.map((c) => c.name)).toEqual(["Appetizers", "Mains"]);
  });

  it("fills businessProfile fields from the first result that has each one", () => {
    const result = mergeExtractedMenuData([
      { categories: [], businessProfile: { name: "Joe's Diner" } },
      { categories: [], businessProfile: { name: "Ignored", address: "123 Main St" } },
      { categories: [], businessProfile: { phone: "555-0100" } },
    ]);

    expect(result.businessProfile).toEqual({
      name: "Joe's Diner",
      address: "123 Main St",
      phone: "555-0100",
    });
  });

  it("omits businessProfile entirely when no result has one", () => {
    const result = mergeExtractedMenuData([
      { categories: [{ name: "Mains", items: [] }] },
      { categories: [] },
    ]);

    expect(result.businessProfile).toBeUndefined();
  });

  it("handles empty-categories results without erroring", () => {
    const result = mergeExtractedMenuData([{ categories: [] }, { categories: [] }]);

    expect(result.categories).toEqual([]);
    expect(result.businessProfile).toBeUndefined();
  });

  it("handles an empty results array", () => {
    const result = mergeExtractedMenuData([]);

    expect(result.categories).toEqual([]);
  });
});
