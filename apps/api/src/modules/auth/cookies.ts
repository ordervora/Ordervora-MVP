import type { CookieOptions, Response } from "express";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

const isProduction = process.env.NODE_ENV === "production";

const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: "lax",
};

export function setAccessTokenCookie(res: Response, token: string): void {
  res.cookie(ACCESS_TOKEN_COOKIE, token, { ...baseOptions, path: "/" });
}

export function setRefreshTokenCookie(res: Response, token: string, expiresAt: Date): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    ...baseOptions,
    path: "/api/auth",
    expires: expiresAt,
  });
}

export function clearAuthCookies(res: Response): void {
  res.clearCookie(ACCESS_TOKEN_COOKIE, { ...baseOptions, path: "/" });
  res.clearCookie(REFRESH_TOKEN_COOKIE, { ...baseOptions, path: "/api/auth" });
}
