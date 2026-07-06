import type { Request, Response } from "express";
import { REFRESH_TOKEN_COOKIE, clearAuthCookies, setAccessTokenCookie, setRefreshTokenCookie } from "./cookies";
import {
  AccountDeactivatedError,
  EmailInUseError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  StaffNotFoundError,
} from "./auth.errors";
import {
  createStaff,
  getUserById,
  issueTokenPair,
  listStaff,
  registerOwner,
  rotateRefreshToken,
  revokeRefreshToken,
  setStaffActive,
  toPublicUser,
  validateCredentials,
} from "./auth.service";
import { createStaffSchema, loginSchema, registerSchema, setStaffActiveSchema } from "./auth.validation";

function issueAndSetCookies(res: Response, user: Parameters<typeof issueTokenPair>[0]) {
  return issueTokenPair(user).then((tokens) => {
    setAccessTokenCookie(res, tokens.accessToken);
    setRefreshTokenCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
  });
}

export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const user = await registerOwner(parsed.data);
    await issueAndSetCookies(res, user);
    res.status(201).json({ user: toPublicUser(user) });
  } catch (err) {
    if (err instanceof EmailInUseError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const user = await validateCredentials(parsed.data);
    await issueAndSetCookies(res, user);
    res.status(200).json({ user: toPublicUser(user) });
  } catch (err) {
    if (err instanceof InvalidCredentialsError) {
      res.status(401).json({ error: err.message });
      return;
    }
    if (err instanceof AccountDeactivatedError) {
      res.status(403).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function refresh(req: Request, res: Response): Promise<void> {
  const presentedToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (!presentedToken) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const { tokens } = await rotateRefreshToken(presentedToken);
    setAccessTokenCookie(res, tokens.accessToken);
    setRefreshTokenCookie(res, tokens.refreshToken, tokens.refreshExpiresAt);
    res.status(200).json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidRefreshTokenError || err instanceof AccountDeactivatedError) {
      clearAuthCookies(res);
      res.status(401).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function logout(req: Request, res: Response): Promise<void> {
  const presentedToken = req.cookies?.[REFRESH_TOKEN_COOKIE];
  if (presentedToken) {
    await revokeRefreshToken(presentedToken);
  }
  clearAuthCookies(res);
  res.status(200).json({ ok: true });
}

export async function me(req: Request, res: Response): Promise<void> {
  const user = await getUserById(req.user!.id);
  if (!user) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.status(200).json({ user: toPublicUser(user) });
}

export async function inviteStaff(req: Request, res: Response): Promise<void> {
  const parsed = createStaffSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const staff = await createStaff(req.user!.id, parsed.data);
    res.status(201).json({ user: toPublicUser(staff) });
  } catch (err) {
    if (err instanceof EmailInUseError) {
      res.status(409).json({ error: err.message });
      return;
    }
    throw err;
  }
}

export async function listStaffHandler(req: Request, res: Response): Promise<void> {
  const staff = await listStaff(req.user!.id);
  res.status(200).json({ staff });
}

export async function setStaffActiveHandler(req: Request, res: Response): Promise<void> {
  const parsed = setStaffActiveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const staff = await setStaffActive(req.user!.id, req.params.id as string, parsed.data.isActive);
    res.status(200).json({ staff });
  } catch (err) {
    if (err instanceof StaffNotFoundError) {
      res.status(404).json({ error: err.message });
      return;
    }
    throw err;
  }
}
