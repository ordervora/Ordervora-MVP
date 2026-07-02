import type { Request, Response } from "express";
import { NoRestaurantError } from "../../restaurants/restaurant.errors";
import { getOwnRestaurantId } from "../../restaurants/restaurant.service";
import { revalidatePublishedSite } from "../../sites/site.service";

export async function requireOwnRestaurantId(req: Request, res: Response): Promise<string | null> {
  const restaurantId = await getOwnRestaurantId(req.user!.id);
  if (!restaurantId) {
    res.status(404).json({ error: new NoRestaurantError().message });
    return null;
  }
  return restaurantId;
}

/**
 * Fire-and-forget so menu-commerce edits never wait on re-rendering a
 * published site — mirrors menu.controller.ts's revalidateInBackground
 * exactly (Sprint 06 acceptance criterion #8: change live within 60s).
 */
export function revalidateInBackground(restaurantId: string): void {
  void revalidatePublishedSite(restaurantId).catch(() => undefined);
}
