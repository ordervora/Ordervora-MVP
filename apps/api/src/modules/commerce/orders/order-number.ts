import type { Prisma } from "@prisma/client";

/**
 * Sequential per-restaurant order number (not global) — must run inside
 * the same transaction that creates the Order row to avoid a race between
 * reading the max and inserting.
 */
export async function nextOrderNumber(tx: Prisma.TransactionClient, restaurantId: string): Promise<number> {
  const last = await tx.order.findFirst({
    where: { restaurantId },
    orderBy: { orderNumber: "desc" },
    select: { orderNumber: true },
  });
  return (last?.orderNumber ?? 0) + 1;
}
