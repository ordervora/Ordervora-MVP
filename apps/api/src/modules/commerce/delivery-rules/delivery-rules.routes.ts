import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../../middleware/require-auth";
import { requireRole } from "../../../middleware/require-role";
import { getDeliveryConfigHandler, updateDeliveryConfigHandler } from "./delivery-config.controller";
import {
  createDeliveryFeeRuleHandler,
  createServiceFeeRuleHandler,
  deleteDeliveryFeeRuleHandler,
  deleteServiceFeeRuleHandler,
  listDeliveryFeeRulesHandler,
  listServiceFeeRulesHandler,
  updateDeliveryFeeRuleHandler,
  updateServiceFeeRuleHandler,
} from "./fee-rules.controller";
import { listHoursHandler, setHoursHandler } from "./hours.controller";
import { getKitchenCapacityHandler, updateKitchenCapacityHandler } from "./kitchen-capacity.controller";
import {
  createRuleHandler,
  createZoneHandler,
  deleteRuleHandler,
  deleteZoneHandler,
  listRulesHandler,
  listZonesHandler,
  updateRuleHandler,
  updateZoneHandler,
} from "./zones.controller";

// Mounted at "/api/restaurants" myself, so internal paths resolve to
// e.g. "/api/restaurants/me/hours".
export const deliveryRulesRouter = Router();

const staffOrOwner = requireRole(Role.RESTAURANT_OWNER, Role.RESTAURANT_STAFF);

deliveryRulesRouter.get("/me/hours", requireAuth, staffOrOwner, listHoursHandler);
deliveryRulesRouter.put("/me/hours", requireAuth, staffOrOwner, setHoursHandler);

deliveryRulesRouter.get("/me/delivery-config", requireAuth, staffOrOwner, getDeliveryConfigHandler);
deliveryRulesRouter.patch("/me/delivery-config", requireAuth, staffOrOwner, updateDeliveryConfigHandler);

deliveryRulesRouter.get("/me/delivery-fee-rules", requireAuth, staffOrOwner, listDeliveryFeeRulesHandler);
deliveryRulesRouter.post("/me/delivery-fee-rules", requireAuth, staffOrOwner, createDeliveryFeeRuleHandler);
deliveryRulesRouter.patch("/me/delivery-fee-rules/:id", requireAuth, staffOrOwner, updateDeliveryFeeRuleHandler);
deliveryRulesRouter.delete("/me/delivery-fee-rules/:id", requireAuth, staffOrOwner, deleteDeliveryFeeRuleHandler);

deliveryRulesRouter.get("/me/service-fee-rules", requireAuth, staffOrOwner, listServiceFeeRulesHandler);
deliveryRulesRouter.post("/me/service-fee-rules", requireAuth, staffOrOwner, createServiceFeeRuleHandler);
deliveryRulesRouter.patch("/me/service-fee-rules/:id", requireAuth, staffOrOwner, updateServiceFeeRuleHandler);
deliveryRulesRouter.delete("/me/service-fee-rules/:id", requireAuth, staffOrOwner, deleteServiceFeeRuleHandler);

deliveryRulesRouter.get("/me/kitchen-capacity", requireAuth, staffOrOwner, getKitchenCapacityHandler);
deliveryRulesRouter.patch("/me/kitchen-capacity", requireAuth, staffOrOwner, updateKitchenCapacityHandler);

deliveryRulesRouter.get("/me/delivery-zones", requireAuth, staffOrOwner, listZonesHandler);
deliveryRulesRouter.post("/me/delivery-zones", requireAuth, staffOrOwner, createZoneHandler);
deliveryRulesRouter.patch("/me/delivery-zones/:id", requireAuth, staffOrOwner, updateZoneHandler);
deliveryRulesRouter.delete("/me/delivery-zones/:id", requireAuth, staffOrOwner, deleteZoneHandler);

deliveryRulesRouter.get("/me/delivery-rules", requireAuth, staffOrOwner, listRulesHandler);
deliveryRulesRouter.post("/me/delivery-rules", requireAuth, staffOrOwner, createRuleHandler);
deliveryRulesRouter.patch("/me/delivery-rules/:id", requireAuth, staffOrOwner, updateRuleHandler);
deliveryRulesRouter.delete("/me/delivery-rules/:id", requireAuth, staffOrOwner, deleteRuleHandler);
