import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    customer: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { prisma } from "../../../lib/prisma";
import { CustomerEmailInUseError, InvalidCustomerCredentialsError } from "./customers.errors";
import { registerCustomer, toPublicCustomer, validateCustomerCredentials } from "./customers.service";

const mockPrisma = vi.mocked(prisma, { deep: true });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("registerCustomer", () => {
  it("rejects a duplicate email", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", email: "a@b.com" } as never);

    await expect(
      registerCustomer({ email: "a@b.com", password: "password123", name: "Alex" }),
    ).rejects.toBeInstanceOf(CustomerEmailInUseError);
    expect(mockPrisma.customer.create).not.toHaveBeenCalled();
  });

  it("creates a customer with a hashed password", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(null as never);
    mockPrisma.customer.create.mockResolvedValue({ id: "c1", email: "a@b.com" } as never);

    await registerCustomer({ email: "a@b.com", password: "password123", name: "Alex" });

    const call = mockPrisma.customer.create.mock.calls[0][0];
    expect(call.data.passwordHash).not.toBe("password123");
    expect(typeof call.data.passwordHash).toBe("string");
  });
});

describe("validateCustomerCredentials", () => {
  it("rejects a nonexistent email", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue(null as never);
    await expect(
      validateCustomerCredentials({ email: "nope@b.com", password: "password123" }),
    ).rejects.toBeInstanceOf(InvalidCustomerCredentialsError);
  });

  it("rejects a customer with no password set (guest-only record)", async () => {
    mockPrisma.customer.findUnique.mockResolvedValue({ id: "c1", passwordHash: null } as never);
    await expect(
      validateCustomerCredentials({ email: "a@b.com", password: "password123" }),
    ).rejects.toBeInstanceOf(InvalidCustomerCredentialsError);
  });
});

describe("toPublicCustomer", () => {
  it("strips passwordHash", () => {
    const publicCustomer = toPublicCustomer({
      id: "c1",
      email: "a@b.com",
      name: "Alex",
      phone: null,
      passwordHash: "secret-hash",
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    expect(publicCustomer).not.toHaveProperty("passwordHash");
  });
});
