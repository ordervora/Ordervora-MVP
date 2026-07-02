import type { CustomerFavorite } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { CustomerFavoriteNotFoundError } from "./customers.errors";
import type { CreateFavoriteInput } from "./customers.validation";

export async function listFavorites(customerId: string): Promise<CustomerFavorite[]> {
  return prisma.customerFavorite.findMany({ where: { customerId } });
}

export async function createFavorite(customerId: string, input: CreateFavoriteInput): Promise<CustomerFavorite> {
  return prisma.customerFavorite.create({ data: { customerId, ...input } });
}

export async function deleteFavorite(customerId: string, id: string): Promise<void> {
  const favorite = await prisma.customerFavorite.findUnique({ where: { id } });
  if (!favorite || favorite.customerId !== customerId) {
    throw new CustomerFavoriteNotFoundError();
  }
  await prisma.customerFavorite.delete({ where: { id: favorite.id } });
}
