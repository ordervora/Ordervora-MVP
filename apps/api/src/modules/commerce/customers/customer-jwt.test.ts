import { beforeEach, describe, expect, it } from "vitest";
import {
  signCustomerAccessToken,
  signCustomerRefreshToken,
  verifyCustomerAccessToken,
  verifyCustomerRefreshToken,
} from "./customer-jwt";

beforeEach(() => {
  process.env.JWT_ACCESS_SECRET = "test-secret-value-not-real";
  process.env.JWT_ACCESS_TTL = "15m";
});

describe("customer access tokens", () => {
  it("round-trips a customer id", () => {
    const token = signCustomerAccessToken("cust-1");
    expect(verifyCustomerAccessToken(token)).toBe("cust-1");
  });

  it("rejects a refresh token presented as an access token", () => {
    const refreshToken = signCustomerRefreshToken("cust-1");
    expect(() => verifyCustomerAccessToken(refreshToken)).toThrow();
  });
});

describe("customer refresh tokens", () => {
  it("round-trips a customer id", () => {
    const token = signCustomerRefreshToken("cust-1");
    expect(verifyCustomerRefreshToken(token)).toBe("cust-1");
  });

  it("rejects an access token presented as a refresh token", () => {
    const accessToken = signCustomerAccessToken("cust-1");
    expect(() => verifyCustomerRefreshToken(accessToken)).toThrow();
  });
});
