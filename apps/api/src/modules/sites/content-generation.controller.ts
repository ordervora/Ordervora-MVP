import type { Request, Response } from "express";
import { mapSiteError, paramId, requireOwnRestaurantId } from "./controller-helpers";
import { generateContent, listContentGenerations, restoreContentGeneration } from "./content-generation.service";
import { generateContentSchema } from "./site.validation";

/**
 * POST /api/sites/:id/content/generate — "Generate Website Content"
 * (scope "FULL") and "Regenerate Section" (any other scope) both go
 * through this one endpoint; see generateContentSchema's doc comment.
 */
export async function generate(req: Request, res: Response): Promise<void> {
  const restaurantId = await requireOwnRestaurantId(req, res);
  if (!restaurantId) return;

  const parsed = generateContentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
    return;
  }

  try {
    const result = await generateContent(restaurantId, paramId(req), req.user!.id, parsed.data);
    res.status(200).json(result);
  } catch (err) {
    if (!mapSiteError(err, res)) throw err;
  }
}

/** GET /api/sites/:id/content/generations — "Get Generated Content" (full version history, most recent first). */
export async function listGenerations(req: Request, res: Response): Promise<void> {
  const restaurantId = await requireOwnRestaurantId(req, res);
  if (!restaurantId) return;

  try {
    const generations = await listContentGenerations(restaurantId, paramId(req));
    res.status(200).json({ generations });
  } catch (err) {
    if (!mapSiteError(err, res)) throw err;
  }
}

/** POST /api/sites/:id/content/generations/:generationId/restore — "Restore Previous Version". */
export async function restore(req: Request, res: Response): Promise<void> {
  const restaurantId = await requireOwnRestaurantId(req, res);
  if (!restaurantId) return;

  try {
    const result = await restoreContentGeneration(restaurantId, paramId(req), paramId(req, "generationId"), req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    if (!mapSiteError(err, res)) throw err;
  }
}
