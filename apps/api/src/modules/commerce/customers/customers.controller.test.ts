import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./customer-cookies", () => ({
  CUSTOMER_REFRESH_TOKEN_COOKIE: "customer_refresh_token",
  clearCustomerAuthCookies: vi.fn(),
  setCustomerAccessTokenCookie: vi.fn(),
  setCustomerRefreshTokenCookie: vi.fn(),
}));

vi.mock("./customer-jwt", () => ({
  signCustomerAccessToken: vi.fn(() => "access-token"),
  signCustomerRefreshToken: vi.fn(() => "refresh-token"),
  verifyCustomerRefreshToken: vi.fn(),
}));

vi.mock("./customers.service", () => ({
  getCustomerById: vi.fn(),
  registerCustomer: vi.fn(),
  toPublicCustomer: vi.fn((c: unknown) => c),
  validateCustomerCredentials: vi.fn(),
}));

import type { Request, Response } from "express";
import { clearCustomerAuthCookies, setCustomerAccessTokenCookie, setCustomerRefreshTokenCookie } from "./customer-cookies";
import { verifyCustomerRefreshToken } from "./customer-jwt";
import { loginHandler, logoutHandler, refreshHandler, registerHandler } from "./customers.controller";
import { CustomerEmailInUseError, InvalidCustomerCredentialsError } from "./customers.errors";
import { registerCustomer, validateCustomerCredentials } from "./customers.service";

function mockRes() {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  return res as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerHandler", () => {
  it("sets access + refresh cookies and returns 201 on success", async () => {
    vi.mocked(registerCustomer).mockResolvedValue({ id: "c1", email: "a@b.com" } as never);

    const req = { body: { email: "a@b.com", password: "password123", name: "Alex" } } as unknown as Request;
    const res = mockRes();

    await registerHandler(req, res);

    expect(setCustomerAccessTokenCookie).toHaveBeenCalledWith(res, "access-token");
    expect(setCustomerRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token");
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it("maps CustomerEmailInUseError to 409 without setting cookies", async () => {
    vi.mocked(registerCustomer).mockRejectedValue(new CustomerEmailInUseError());

    const req = { body: { email: "a@b.com", password: "password123", name: "Alex" } } as unknown as Request;
    const res = mockRes();

    await registerHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(setCustomerAccessTokenCookie).not.toHaveBeenCalled();
  });
});

describe("loginHandler", () => {
  it("maps InvalidCustomerCredentialsError to 401", async () => {
    vi.mocked(validateCustomerCredentials).mockRejectedValue(new InvalidCustomerCredentialsError());

    const req = { body: { email: "a@b.com", password: "password123" } } as unknown as Request;
    const res = mockRes();

    await loginHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe("refreshHandler", () => {
  it("returns 401 without verifying when there is no refresh cookie", async () => {
    const req = { cookies: {} } as unknown as Request;
    const res = mockRes();

    await refreshHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(verifyCustomerRefreshToken).not.toHaveBeenCalled();
  });

  it("clears cookies and returns 401 when the refresh token is invalid/expired", async () => {
    vi.mocked(verifyCustomerRefreshToken).mockImplementation(() => {
      throw new Error("jwt expired");
    });

    const req = { cookies: { customer_refresh_token: "stale" } } as unknown as Request;
    const res = mockRes();

    await refreshHandler(req, res);

    expect(clearCustomerAuthCookies).toHaveBeenCalledWith(res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it("rotates both cookies and returns 200 on a valid refresh token", async () => {
    vi.mocked(verifyCustomerRefreshToken).mockReturnValue("c1");

    const req = { cookies: { customer_refresh_token: "valid" } } as unknown as Request;
    const res = mockRes();

    await refreshHandler(req, res);

    expect(setCustomerAccessTokenCookie).toHaveBeenCalledWith(res, "access-token");
    expect(setCustomerRefreshTokenCookie).toHaveBeenCalledWith(res, "refresh-token");
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe("logoutHandler", () => {
  it("clears cookies and returns 200 regardless of auth state", async () => {
    const req = {} as unknown as Request;
    const res = mockRes();

    await logoutHandler(req, res);

    expect(clearCustomerAuthCookies).toHaveBeenCalledWith(res);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
