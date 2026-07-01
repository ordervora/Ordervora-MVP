import { describe, expect, it } from "vitest";
import { assetUrl } from "./asset-url";

describe("assetUrl", () => {
  it("maps a storage path to /assets/<basename>", () => {
    expect(assetUrl("/uploads/abc123.png")).toBe("/assets/abc123.png");
  });

  it("strips any directory prefix, however nested", () => {
    expect(assetUrl("/var/data/uploads/sites/xyz/hero.jpg")).toBe("/assets/hero.jpg");
  });

  it("handles a bare filename with no directory", () => {
    expect(assetUrl("hero.png")).toBe("/assets/hero.png");
  });
});
