import type { Restaurant } from "@prisma/client";
import { prisma } from "../../lib/prisma";
import { NoRestaurantError, RestaurantAlreadyExistsError } from "./restaurant.errors";
import type { CreateRestaurantInput, UpdateRestaurantInput } from "./restaurant.validation";

/**
 * Single source of truth for mapping an authenticated user to the
 * restaurant they're scoped to. Every restaurant/menu controller resolves
 * tenant scope through this function rather than trusting client input.
 */
export async function getOwnRestaurantId(userId: string): Promise<string | null> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { restaurantId: true } });
  return user?.restaurantId ?? null;
}

export async function createRestaurant(ownerId: string, input: CreateRestaurantInput): Promise<Restaurant> {
  const existingRestaurantId = await getOwnRestaurantId(ownerId);
  if (existingRestaurantId) {
    throw new RestaurantAlreadyExistsError();
  }

  return prisma.$transaction(async (tx) => {
    const restaurant = await tx.restaurant.create({
      data: { ownerId, ...input },
    });
    await tx.user.update({ where: { id: ownerId }, data: { restaurantId: restaurant.id } });
    return restaurant;
  });
}

export async function getOwnRestaurant(userId: string): Promise<Restaurant> {
  const restaurantId = await getOwnRestaurantId(userId);
  if (!restaurantId) {
    throw new NoRestaurantError();
  }
  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  if (!restaurant) {
    throw new NoRestaurantError();
  }
  return restaurant;
}

export async function updateOwnRestaurant(userId: string, input: UpdateRestaurantInput): Promise<Restaurant> {
  const restaurant = await getOwnRestaurant(userId);
  return prisma.restaurant.update({ where: { id: restaurant.id }, data: input });
}

export async function listAllRestaurants(): Promise<Restaurant[]> {
  return prisma.restaurant.findMany({ orderBy: { createdAt: "desc" } });
}
