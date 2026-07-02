import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../../middleware/require-auth";
import { requireRole } from "../../../middleware/require-role";
import {
  assignDriverHandler,
  connectProviderHandler,
  disconnectProviderHandler,
  listProvidersHandler,
  locationPingHandler,
  updateFulfillmentStatusHandler,
} from "./fulfillment.controller";

// Mounted at "/api/restaurants" alongside restaurantRouter, so these
// routes resolve to e.g. "/api/restaurants/me/fulfillment-providers".
export const fulfillmentRouter = Router();

const staffOrOwner = requireRole(Role.RESTAURANT_OWNER, Role.RESTAURANT_STAFF);

fulfillmentRouter.get("/me/fulfillment-providers", requireAuth, staffOrOwner, listProvidersHandler);
fulfillmentRouter.post("/me/fulfillment-providers/:type/connect", requireAuth, staffOrOwner, connectProviderHandler);
fulfillmentRouter.delete("/me/fulfillment-providers/:type", requireAuth, staffOrOwner, disconnectProviderHandler);

fulfillmentRouter.post("/me/fulfillment/:id/assign-driver", requireAuth, staffOrOwner, assignDriverHandler);
fulfillmentRouter.patch("/me/fulfillment/:id/status", requireAuth, staffOrOwner, updateFulfillmentStatusHandler);
fulfillmentRouter.post("/me/fulfillment/:id/location-ping", requireAuth, staffOrOwner, locationPingHandler);
