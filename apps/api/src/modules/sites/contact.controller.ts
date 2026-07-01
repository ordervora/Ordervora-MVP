import type { Request, Response } from "express";
import { mapSiteError, paramId, requireOwnRestaurantId } from "./controller-helpers";
import { listContactMessages, submitContactMessage } from "./contact.service";
import { contactMessageSchema } from "./site.validation";

/** POST /public/sites/:id/contact — unauthenticated, rate-limited at the route layer. */
export async function submit(req: Request, res: Response): Promise<void> {
  const parsed = contactMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const result = await submitContactMessage(paramId(req), req.ip ?? "unknown", parsed.data);
    res.status(202).json(result);
  } catch (err) {
    if (!mapSiteError(err, res)) throw err;
  }
}

/** GET /api/sites/:id/messages — the dashboard inbox. */
export async function list(req: Request, res: Response): Promise<void> {
  const restaurantId = await requireOwnRestaurantId(req, res);
  if (!restaurantId) return;

  try {
    const messages = await listContactMessages(restaurantId, paramId(req));
    res.status(200).json({ messages });
  } catch (err) {
    if (!mapSiteError(err, res)) throw err;
  }
}
