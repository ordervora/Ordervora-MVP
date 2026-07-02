import jwt from "jsonwebtoken";

const ACCESS_TTL = process.env.JWT_ACCESS_TTL ?? "15m";
const REFRESH_TTL = "30d";

interface CustomerAccessPayload {
  sub: string;
  kind: "customer";
}

interface CustomerRefreshPayload {
  sub: string;
  kind: "customer-refresh";
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
 * (no new secret to manage) but a distinct `kind` discriminator per token
 * type — mirrors modules/sites/preview-token.ts's pattern — so a customer
 * token can never be mistaken for or reused as a staff access token, and
 * a customer access token can never be replayed as a refresh token.
 *
 * There is no CustomerRefreshToken table in the approved Sprint 07 schema
 * (unlike staff auth's opaque-hashed-token-in-DB RefreshToken model), so
 * refresh tokens here are self-contained signed JWTs instead — a
 * pragmatic divergence documented for a future migration that would add
 * reuse-detection/revocation parity with staff auth.
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

export function signCustomerRefreshToken(customerId: string): string {
  const payload: CustomerRefreshPayload = { sub: customerId, kind: "customer-refresh" };
  return jwt.sign(payload, requireSecret(), { expiresIn: REFRESH_TTL });
}

export function verifyCustomerRefreshToken(token: string): string {
  const decoded = jwt.verify(token, requireSecret()) as Partial<CustomerRefreshPayload>;
  if (decoded.kind !== "customer-refresh" || typeof decoded.sub !== "string") {
    throw new Error("Not a valid customer refresh token");
  }
  return decoded.sub;
}
