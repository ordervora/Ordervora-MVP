import type { CookieOptions, Response } from "express";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

const isProduction = process.env.NODE_ENV === "production";

/**
 * apps/web and apps/api are deployed as two separate Vercel projects on
 * two separate domains (RC-1 M3) — cross-site for cookie purposes, since
 * vercel.app is a public suffix. Browsers never attach a SameSite=Lax
 * cookie to a cross-site fetch/XHR request, so every API call after
 * login would look unauthenticated. SameSite=None (which requires
 * Secure, already true in production) is what makes the auth cookie
 * actually reach the API from a different origin.
 */
const baseOptions: CookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "lax",
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
