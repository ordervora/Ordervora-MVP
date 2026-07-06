import { Role, type User } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { generateRefreshToken, hashToken, signAccessToken } from "../../lib/jwt";
import { hashPassword, verifyPassword } from "../../lib/password";
import {
  AccountDeactivatedError,
  EmailInUseError,
  InvalidCredentialsError,
  InvalidRefreshTokenError,
  StaffNotFoundError,
} from "./auth.errors";
import type { CreateStaffInput, LoginInput, RegisterInput } from "./auth.validation";

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

export type PublicUser = Pick<User, "id" | "email" | "name" | "role" | "isActive">;

function toPublicUser(user: User): PublicUser {
  return { id: user.id, email: user.email, name: user.name, role: user.role, isActive: user.isActive };
}

export interface StaffSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
}

async function assertEmailAvailable(email: string): Promise<void> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new EmailInUseError();
  }
}

export async function registerOwner(input: RegisterInput): Promise<User> {
  await assertEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: Role.RESTAURANT_OWNER,
    },
  });
}

export async function createStaff(ownerId: string, input: CreateStaffInput): Promise<User> {
  await assertEmailAvailable(input.email);
  const passwordHash = await hashPassword(input.password);
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { restaurantId: true } });
  return prisma.user.create({
    data: {
      email: input.email,
      name: input.name,
      passwordHash,
      role: Role.RESTAURANT_STAFF,
      invitedById: ownerId,
      restaurantId: owner?.restaurantId ?? null,
    },
  });
}

export async function listStaff(ownerId: string): Promise<StaffSummary[]> {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { restaurantId: true } });
  if (!owner?.restaurantId) {
    return [];
  }
  const staff = await prisma.user.findMany({
    where: { restaurantId: owner.restaurantId, role: Role.RESTAURANT_STAFF },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true, email: true, phone: true, isActive: true, createdAt: true },
  });
  return staff;
}

export async function setStaffActive(ownerId: string, staffId: string, isActive: boolean): Promise<StaffSummary> {
  const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { restaurantId: true } });
  const staff = await prisma.user.findUnique({ where: { id: staffId } });
  if (!staff || staff.role !== Role.RESTAURANT_STAFF || staff.restaurantId !== owner?.restaurantId) {
    throw new StaffNotFoundError();
  }

  const updated = await prisma.user.update({ where: { id: staffId }, data: { isActive } });
  if (!isActive) {
    await revokeAllRefreshTokensForUser(staffId);
  }
  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    isActive: updated.isActive,
    createdAt: updated.createdAt,
  };
}

export async function validateCredentials(input: LoginInput): Promise<User> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !(await verifyPassword(user.passwordHash, input.password))) {
    throw new InvalidCredentialsError();
  }
  if (!user.isActive) {
    throw new AccountDeactivatedError();
  }
  return user;
}

export async function issueTokenPair(user: User): Promise<TokenPair> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { token, tokenHash, expiresAt } = generateRefreshToken();
  await prisma.refreshToken.create({
    data: { userId: user.id, tokenHash, expiresAt },
  });
  return { accessToken, refreshToken: token, refreshExpiresAt: expiresAt };
}

async function revokeAllRefreshTokensForUser(userId: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function rotateRefreshToken(presentedToken: string): Promise<{ user: User; tokens: TokenPair }> {
  const tokenHash = hashToken(presentedToken);
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!stored) {
    throw new InvalidRefreshTokenError();
  }

  if (stored.revokedAt) {
    // Reuse of an already-rotated token is treated as possible theft:
    // invalidate every active session for this user.
    await revokeAllRefreshTokensForUser(stored.userId);
    throw new InvalidRefreshTokenError();
  }

  if (stored.expiresAt < new Date()) {
    throw new InvalidRefreshTokenError();
  }

  if (!stored.user.isActive) {
    await revokeAllRefreshTokensForUser(stored.userId);
    throw new AccountDeactivatedError();
  }

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  const tokens = await issueTokenPair(stored.user);
  return { user: stored.user, tokens };
}

export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  const tokenHash = hashToken(presentedToken);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function getUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}

export { toPublicUser };
