import { createHash, randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Deliberately not imported from lib/jwt.ts: that module's top-level
 * requireEnv() calls for staff-only env vars (JWT_REFRESH_TTL,
 * JWT_ACCESS_TTL) would otherwise become a load-time requirement for
 * every customer-auth caller too, just to reuse this one pure hash
 * function. Identical implementation (createHash("sha256")...digest("hex")).
 */
export function hashCustomerRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

interface CustomerAccessPayload {
  sub: string;
  kind: "customer";
}

function requireSecret(): string {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) {
    throw new Error("Missing required environment variable: JWT_ACCESS_SECRET");
  }
  return secret;
}

/**
 * Separate end-diner identity, sharing JWT_ACCESS_SECRET with staff auth
 * (no new secret to manage) but a distinct `kind` discriminator — mirrors
 * modules/sites/preview-token.ts's pattern — so a customer access token
 * can never be mistaken for or reused as a staff access token.
 */
export function signCustomerAccessToken(customerId: string): string {
  const payload: CustomerAccessPayload = { sub: customerId, kind: "customer" };
  return jwt.sign(payload, requireSecret(), { expiresIn: ACCESS_TTL as jwt.SignOptions["expiresIn"] });
}

export function verifyCustomerAccessToken(token: string): string {
  const decoded = jwt.verify(token, requireSecret()) as Partial<CustomerAccessPayload>;
  if (decoded.kind !== "customer" || typeof decoded.sub !== "string") {
    throw new Error("Not a valid customer access token");
  }
  return decoded.sub;
}

/**
 * Opaque, DB-backed refresh token (Sprint 07.7 H-7) — mirrors staff
 * auth's RefreshToken pattern (lib/jwt.ts's generateRefreshToken),
 * replacing the prior self-contained-JWT design that had no server-side
 * revocation and survived logout. The raw token is only ever held by the
 * client (as the cookie value); customers.service.ts stores only its
 * hash, alongside customerId/expiresAt/revokedAt, in CustomerRefreshToken.
 */
export function generateCustomerRefreshToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = randomBytes(48).toString("hex");
  return {
    token,
    tokenHash: hashCustomerRefreshToken(token),
    expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
  };
}
