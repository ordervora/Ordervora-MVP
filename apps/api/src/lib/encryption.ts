import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Envelope encryption for provider credentials (PaymentProvider,
 * FulfillmentProvider, POSProvider .credentialsEncrypted /
 * .webhookSecretEncrypted). Deliberately a separate key from
 * JWT_ACCESS_SECRET — these secrets, if leaked, could authorize real
 * charges against a restaurant's live merchant account (Sprint 07 spec §14).
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH_BYTES = 12;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getKey(): Buffer {
  const hex = requireEnv("COMMERCE_ENCRYPTION_KEY");
  const key = Buffer.from(hex, "hex");
  if (key.length !== 32) {
    throw new Error("COMMERCE_ENCRYPTION_KEY must be a 32-byte (64 hex character) value");
  }
  return key;
}

/** Returns `${iv}:${authTag}:${ciphertext}`, each hex-encoded. */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${ciphertext.toString("hex")}`;
}

export function decryptSecret(encoded: string): string {
  const parts = encoded.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted secret");
  }
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, "hex")), decipher.final()]);
  return plaintext.toString("utf8");
}
