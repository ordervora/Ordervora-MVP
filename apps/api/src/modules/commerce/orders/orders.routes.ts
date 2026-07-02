import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../../../middleware/require-auth";
import { requireRole } from "../../../middleware/require-role";
import {
  cancelHandler,
  completeHandler,
  getOrderEventsHandler,
  getOrderHandler,
  listOrdersHandler,
  markOutForDeliveryHandler,
  markPaidHandler,
  markReadyHandler,
  publicGetOrderHandler,
  publicGetOrderTimelineHandler,
  refundHandler,
  startPreparingHandler,
} from "./orders.controller";

// Owner/staff-facing — mounted at "/api/restaurants" myself, so internal
// paths resolve to e.g. "/api/restaurants/me/orders".
export const ordersRouter = Router();

const staffOrOwner = requireRole(Role.RESTAURANT_OWNER, Role.RESTAURANT_STAFF);

ordersRouter.get("/me/orders", requireAuth, staffOrOwner, listOrdersHandler);
ordersRouter.get("/me/orders/:id", requireAuth, staffOrOwner, getOrderHandler);
ordersRouter.get("/me/orders/:id/events", requireAuth, staffOrOwner, getOrderEventsHandler);
ordersRouter.patch("/me/orders/:id/start-preparing", requireAuth, staffOrOwner, startPreparingHandler);
ordersRouter.patch("/me/orders/:id/mark-ready", requireAuth, staffOrOwner, markReadyHandler);
ordersRouter.patch("/me/orders/:id/mark-out-for-delivery", requireAuth, staffOrOwner, markOutForDeliveryHandler);
ordersRouter.patch("/me/orders/:id/complete", requireAuth, staffOrOwner, completeHandler);
ordersRouter.patch("/me/orders/:id/cancel", requireAuth, staffOrOwner, cancelHandler);
ordersRouter.patch("/me/orders/:id/mark-paid", requireAuth, staffOrOwner, markPaidHandler);
ordersRouter.post("/me/orders/:id/refund", requireAuth, staffOrOwner, refundHandler);

// Public order tracking — mounted at "/api/public" myself.
export const publicOrdersRouter = Router();
publicOrdersRouter.get("/orders/:id", publicGetOrderHandler);
publicOrdersRouter.get("/orders/:id/timeline", publicGetOrderTimelineHandler);
