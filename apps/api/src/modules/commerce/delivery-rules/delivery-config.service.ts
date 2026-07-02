import type { DeliveryConfig } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import type { UpdateDeliveryConfigInput } from "./delivery-config.validation";

/**
 * Sensible defaults for a brand-new restaurant: pickup enabled, delivery
 * and dine-in disabled until the owner opts in and configures the
 * economics (radius/fees/min order) that make delivery/dine-in safe to
 * turn on.
 */
const DEFAULT_CONFIG = {
  isDeliveryEnabled: false,
  isPickupEnabled: true,
  isDineInEnabled: false,
  minOrderCentsForDelivery: 0,
  minOrderCentsForPickup: 0,
} as const;

/**
 * Lazily creates the restaurant's DeliveryConfig singleton on first access
 * — mirrors the find-then-create pattern used elsewhere in this codebase
 * for per-restaurant settings singletons.
 */
export async function getConfig(restaurantId: string): Promise<DeliveryConfig> {
  const existing = await prisma.deliveryConfig.findFirst({ where: { restaurantId } });
  if (existing) return existing;
  return prisma.deliveryConfig.create({ data: { restaurantId, ...DEFAULT_CONFIG } });
}

export async function updateConfig(restaurantId: string, input: UpdateDeliveryConfigInput): Promise<DeliveryConfig> {
  await getConfig(restaurantId);
  return prisma.deliveryConfig.update({ where: { restaurantId }, data: input });
}
