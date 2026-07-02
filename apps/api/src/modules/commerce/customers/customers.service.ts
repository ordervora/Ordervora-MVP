import type { Customer } from "@prisma/client";
import { hashPassword, verifyPassword } from "../../../lib/password";
import { prisma } from "../../../lib/prisma";
import { CustomerEmailInUseError, InvalidCustomerCredentialsError } from "./customers.errors";
import type { LoginCustomerInput, RegisterCustomerInput } from "./customers.validation";

export type PublicCustomer = Pick<Customer, "id" | "email" | "name" | "phone">;

export function toPublicCustomer(customer: Customer): PublicCustomer {
  return { id: customer.id, email: customer.email, name: customer.name, phone: customer.phone };
}

export async function registerCustomer(input: RegisterCustomerInput): Promise<Customer> {
  const existing = await prisma.customer.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new CustomerEmailInUseError();
  }
  const passwordHash = await hashPassword(input.password);
  return prisma.customer.create({
    data: { email: input.email, name: input.name, phone: input.phone, passwordHash },
  });
}

export async function validateCustomerCredentials(input: LoginCustomerInput): Promise<Customer> {
  const customer = await prisma.customer.findUnique({ where: { email: input.email } });
  if (!customer?.passwordHash || !(await verifyPassword(customer.passwordHash, input.password))) {
    throw new InvalidCustomerCredentialsError();
  }
  return customer;
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  return prisma.customer.findUnique({ where: { id } });
}
