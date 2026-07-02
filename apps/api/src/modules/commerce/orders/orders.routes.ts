import { Role } from "@prisma/client";
import { Router } from "express";
import { staffActionRateLimiter } from "../../../middleware/rate-limit";
import { requireAuth } from "../../../middleware/require-auth";
import { requireIdempotencyKey } from "../../../middleware/require-idempotency-key";
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

ordersRouter.get("/me/orders", requireAuth, staffOrOwner, staffActionRateLimiter, listOrdersHandler);
ordersRouter.get("/me/orders/:id", requireAuth, staffOrOwner, staffActionRateLimiter, getOrderHandler);
ordersRouter.get("/me/orders/:id/events", requireAuth, staffOrOwner, staffActionRateLimiter, getOrderEventsHandler);
ordersRouter.patch("/me/orders/:id/start-preparing", requireAuth, staffOrOwner, staffActionRateLimiter, startPreparingHandler);
ordersRouter.patch("/me/orders/:id/mark-ready", requireAuth, staffOrOwner, staffActionRateLimiter, markReadyHandler);
ordersRouter.patch(
  "/me/orders/:id/mark-out-for-delivery",
  requireAuth,
  staffOrOwner,
  staffActionRateLimiter,
  markOutForDeliveryHandler,
);
ordersRouter.patch("/me/orders/:id/complete", requireAuth, staffOrOwner, staffActionRateLimiter, completeHandler);
ordersRouter.patch("/me/orders/:id/cancel", requireAuth, staffOrOwner, staffActionRateLimiter, cancelHandler);
ordersRouter.patch(
  "/me/orders/:id/mark-paid",
  requireAuth,
  staffOrOwner,
  staffActionRateLimiter,
  requireIdempotencyKey,
  markPaidHandler,
);
ordersRouter.post(
  "/me/orders/:id/refund",
  requireAuth,
  staffOrOwner,
  staffActionRateLimiter,
  requireIdempotencyKey,
  refundHandler,
);

// Public order tracking — mounted at "/api/public" myself.
export const publicOrdersRouter = Router();
publicOrdersRouter.get("/orders/:id", publicGetOrderHandler);
publicOrdersRouter.get("/orders/:id/timeline", publicGetOrderTimelineHandler);
