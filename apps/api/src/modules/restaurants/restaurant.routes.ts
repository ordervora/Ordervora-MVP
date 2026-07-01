import { Router } from "express";
import { Role } from "@prisma/client";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { create, getMine, listAll, updateMine } from "./restaurant.controller";

export const restaurantRouter = Router();

restaurantRouter.post("/", requireAuth, requireRole(Role.RESTAURANT_OWNER), create);
restaurantRouter.get("/me", requireAuth, requireRole(Role.RESTAURANT_OWNER, Role.RESTAURANT_STAFF), getMine);
restaurantRouter.patch("/me", requireAuth, requireRole(Role.RESTAURANT_OWNER), updateMine);

export const adminRestaurantRouter = Router();

adminRestaurantRouter.get("/", requireAuth, requireRole(Role.ADMIN), listAll);
