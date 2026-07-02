import { beforeEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "./encryption";

describe("encryption", () => {
  beforeEach(() => {
    process.env.COMMERCE_ENCRYPTION_KEY = "a".repeat(64);
  });

  it("round-trips a secret", () => {
    const encoded = encryptSecret("sk_test_super_secret_value");
    expect(encoded).not.toContain("sk_test_super_secret_value");
    expect(decryptSecret(encoded)).toBe("sk_test_super_secret_value");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    const a = encryptSecret("same-plaintext");
    const b = encryptSecret("same-plaintext");
    expect(a).not.toBe(b);
  });

  it("rejects a malformed encoded value", () => {
    expect(() => decryptSecret("not-the-right-shape")).toThrow();
  });

  it("rejects a tampered ciphertext (auth tag mismatch)", () => {
    const encoded = encryptSecret("secret");
    const [iv, tag, ciphertext] = encoded.split(":");
    const tampered = `${iv}:${tag}:${ciphertext.slice(0, -2)}ff`;
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws if COMMERCE_ENCRYPTION_KEY is missing", () => {
    delete process.env.COMMERCE_ENCRYPTION_KEY;
    expect(() => encryptSecret("x")).toThrow(/COMMERCE_ENCRYPTION_KEY/);
  });
});
