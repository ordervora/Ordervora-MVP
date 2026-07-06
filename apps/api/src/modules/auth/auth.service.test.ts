import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn() },
    refreshToken: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
}));

vi.mock("../../lib/password", () => ({
  hashPassword: vi.fn(),
  verifyPassword: vi.fn(),
}));

import { prisma } from "../../lib/prisma";
import { verifyPassword } from "../../lib/password";
import { AccountDeactivatedError, InvalidCredentialsError, StaffNotFoundError } from "./auth.errors";
import { listStaff, rotateRefreshToken, setStaffActive, validateCredentials } from "./auth.service";

const mockPrisma = vi.mocked(prisma, { deep: true });
const mockVerifyPassword = vi.mocked(verifyPassword);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("validateCredentials", () => {
  it("throws InvalidCredentialsError when the password is wrong", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      passwordHash: "hash",
      isActive: true,
    } as never);
    mockVerifyPassword.mockResolvedValue(false);

    await expect(validateCredentials({ email: "a@b.com", password: "wrong" })).rejects.toThrow(
      InvalidCredentialsError,
    );
  });

  it("throws AccountDeactivatedError for a correct password on a deactivated account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: "u1",
      passwordHash: "hash",
      isActive: false,
    } as never);
    mockVerifyPassword.mockResolvedValue(true);

    await expect(validateCredentials({ email: "a@b.com", password: "correct" })).rejects.toThrow(
      AccountDeactivatedError,
    );
  });

  it("returns the user when the password is correct and the account is active", async () => {
    const user = { id: "u1", passwordHash: "hash", isActive: true };
    mockPrisma.user.findUnique.mockResolvedValue(user as never);
    mockVerifyPassword.mockResolvedValue(true);

    await expect(validateCredentials({ email: "a@b.com", password: "correct" })).resolves.toEqual(user);
  });
});

describe("rotateRefreshToken", () => {
  it("revokes all sessions and throws AccountDeactivatedError when the owning user is deactivated", async () => {
    mockPrisma.refreshToken.findUnique.mockResolvedValue({
      id: "rt1",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 100_000),
      user: { id: "u1", isActive: false },
    } as never);

    await expect(rotateRefreshToken("presented-token")).rejects.toThrow(AccountDeactivatedError);
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "u1", revokedAt: null } }),
    );
  });
});

describe("listStaff", () => {
  it("returns an empty list when the owner has no restaurant", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ restaurantId: null } as never);

    await expect(listStaff("owner1")).resolves.toEqual([]);
    expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
  });

  it("lists staff scoped to the owner's restaurant", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ restaurantId: "rest1" } as never);
    const staff = [{ id: "s1", name: "Jo", email: "jo@x.com", phone: null, isActive: true, createdAt: new Date() }];
    mockPrisma.user.findMany.mockResolvedValue(staff as never);

    await expect(listStaff("owner1")).resolves.toEqual(staff);
    expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ restaurantId: "rest1" }) }),
    );
  });
});

describe("setStaffActive", () => {
  it("throws StaffNotFoundError when the target belongs to a different restaurant", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ restaurantId: "rest1" } as never)
      .mockResolvedValueOnce({ id: "s1", role: "RESTAURANT_STAFF", restaurantId: "rest2" } as never);

    await expect(setStaffActive("owner1", "s1", false)).rejects.toThrow(StaffNotFoundError);
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("throws StaffNotFoundError when the target is the owner themselves (not RESTAURANT_STAFF)", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ restaurantId: "rest1" } as never)
      .mockResolvedValueOnce({ id: "owner1", role: "RESTAURANT_OWNER", restaurantId: "rest1" } as never);

    await expect(setStaffActive("owner1", "owner1", false)).rejects.toThrow(StaffNotFoundError);
  });

  it("deactivates a valid staff member and revokes all their sessions", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ restaurantId: "rest1" } as never)
      .mockResolvedValueOnce({ id: "s1", role: "RESTAURANT_STAFF", restaurantId: "rest1" } as never);
    mockPrisma.user.update.mockResolvedValue({
      id: "s1",
      name: "Jo",
      email: "jo@x.com",
      phone: null,
      isActive: false,
      createdAt: new Date(),
    } as never);

    const result = await setStaffActive("owner1", "s1", false);

    expect(result.isActive).toBe(false);
    expect(mockPrisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "s1", revokedAt: null } }),
    );
  });

  it("reactivates a staff member without revoking sessions", async () => {
    mockPrisma.user.findUnique
      .mockResolvedValueOnce({ restaurantId: "rest1" } as never)
      .mockResolvedValueOnce({ id: "s1", role: "RESTAURANT_STAFF", restaurantId: "rest1" } as never);
    mockPrisma.user.update.mockResolvedValue({
      id: "s1",
      name: "Jo",
      email: "jo@x.com",
      phone: null,
      isActive: true,
      createdAt: new Date(),
    } as never);

    await setStaffActive("owner1", "s1", true);

    expect(mockPrisma.refreshToken.updateMany).not.toHaveBeenCalled();
  });
});
