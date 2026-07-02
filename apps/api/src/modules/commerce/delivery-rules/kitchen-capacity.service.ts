import type { KitchenCapacity } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { UpdateKitchenCapacityInput } from "./kitchen-capacity.validation";

/** Lazily creates the restaurant's KitchenCapacity singleton — defaults to accepting orders, no caps configured. */
export async function getCapacity(restaurantId: string): Promise<KitchenCapacity> {
  const existing = await prisma.kitchenCapacity.findFirst({ where: { restaurantId } });
  if (existing) return existing;
  return prisma.kitchenCapacity.create({ data: { restaurantId, isAcceptingOrders: true } });
}

export async function updateCapacity(
  restaurantId: string,
  input: UpdateKitchenCapacityInput,
): Promise<KitchenCapacity> {
  await getCapacity(restaurantId);
  return prisma.kitchenCapacity.update({ where: { restaurantId }, data: input });
}

/**
 * PURE — no DB access. `currentActiveOrderCount` is supplied by the
 * caller (the orders module counts CONFIRMED/PREPARING orders; this
 * module has no access to the Order table). False if manually paused,
 * false if a configured concurrent-order cap is reached, else true.
 */
export function isKitchenAvailable(capacity: KitchenCapacity, currentActiveOrderCount: number): boolean {
  if (!capacity.isAcceptingOrders) return false;
  if (capacity.maxConcurrentOrders !== null && currentActiveOrderCount >= capacity.maxConcurrentOrders) return false;
  return true;
}
