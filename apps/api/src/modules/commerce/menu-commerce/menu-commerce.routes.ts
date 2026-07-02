import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../../middleware/require-auth";
import { requireRole } from "../../../middleware/require-role";
import { getInventoryHandler, toggleOutOfStockHandler, updateInventoryHandler } from "./inventory.controller";
import {
  attachModifierGroupHandler,
  createModifierGroupHandler,
  createModifierOptionHandler,
  deleteModifierGroupHandler,
  deleteModifierOptionHandler,
  detachModifierGroupHandler,
  listModifierGroupsHandler,
  updateModifierGroupHandler,
  updateModifierOptionHandler,
} from "./modifiers.controller";
import { createVariantHandler, deleteVariantHandler, listVariantsHandler, updateVariantHandler } from "./variants.controller";

// Mounted at "/api/restaurants" myself, so internal paths resolve to
// e.g. "/api/restaurants/me/menu-items/:itemId/variants".
export const menuCommerceRouter = Router();

const staffOrOwner = requireRole(Role.RESTAURANT_OWNER, Role.RESTAURANT_STAFF);

menuCommerceRouter.get("/me/menu-items/:itemId/variants", requireAuth, staffOrOwner, listVariantsHandler);
menuCommerceRouter.post("/me/menu-items/:itemId/variants", requireAuth, staffOrOwner, createVariantHandler);
menuCommerceRouter.patch("/me/menu-items/:itemId/variants/:variantId", requireAuth, staffOrOwner, updateVariantHandler);
menuCommerceRouter.delete("/me/menu-items/:itemId/variants/:variantId", requireAuth, staffOrOwner, deleteVariantHandler);

menuCommerceRouter.get("/me/modifier-groups", requireAuth, staffOrOwner, listModifierGroupsHandler);
menuCommerceRouter.post("/me/modifier-groups", requireAuth, staffOrOwner, createModifierGroupHandler);
menuCommerceRouter.patch("/me/modifier-groups/:id", requireAuth, staffOrOwner, updateModifierGroupHandler);
menuCommerceRouter.delete("/me/modifier-groups/:id", requireAuth, staffOrOwner, deleteModifierGroupHandler);

menuCommerceRouter.post("/me/modifier-groups/:id/options", requireAuth, staffOrOwner, createModifierOptionHandler);
menuCommerceRouter.patch("/me/modifier-groups/:id/options/:optionId", requireAuth, staffOrOwner, updateModifierOptionHandler);
menuCommerceRouter.delete("/me/modifier-groups/:id/options/:optionId", requireAuth, staffOrOwner, deleteModifierOptionHandler);

menuCommerceRouter.post("/me/menu-items/:itemId/modifier-groups", requireAuth, staffOrOwner, attachModifierGroupHandler);
menuCommerceRouter.delete(
  "/me/menu-items/:itemId/modifier-groups/:modifierGroupId",
  requireAuth,
  staffOrOwner,
  detachModifierGroupHandler,
);

menuCommerceRouter.get("/me/menu-items/:itemId/inventory", requireAuth, staffOrOwner, getInventoryHandler);
menuCommerceRouter.patch("/me/menu-items/:itemId/inventory", requireAuth, staffOrOwner, updateInventoryHandler);
menuCommerceRouter.patch("/me/menu-items/:itemId/86", requireAuth, staffOrOwner, toggleOutOfStockHandler);
