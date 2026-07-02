import { Router } from "express";
import { publicCommerceRateLimiter } from "../../../middleware/rate-limit";
import {
  addCartItemHandler,
  applyCouponHandler,
  createCartHandler,
  getCartHandler,
  removeCartItemHandler,
  removeCouponHandler,
  setFulfillmentHandler,
  updateCartItemHandler,
} from "./cart.controller";

// Mounted at "/api/public" myself — public, unauthenticated (guest or
// customer identity resolved from cookies, never requireAuth/requireCustomerAuth).
export const publicCartRouter = Router();

publicCartRouter.post("/restaurants/:restaurantId/cart", publicCommerceRateLimiter, createCartHandler);
publicCartRouter.get("/cart/:cartId", getCartHandler);
publicCartRouter.post("/cart/:cartId/items", publicCommerceRateLimiter, addCartItemHandler);
publicCartRouter.patch("/cart/:cartId/items/:itemId", publicCommerceRateLimiter, updateCartItemHandler);
publicCartRouter.delete("/cart/:cartId/items/:itemId", removeCartItemHandler);
publicCartRouter.patch("/cart/:cartId/fulfillment", publicCommerceRateLimiter, setFulfillmentHandler);
publicCartRouter.post("/cart/:cartId/coupon", publicCommerceRateLimiter, applyCouponHandler);
publicCartRouter.delete("/cart/:cartId/coupon", removeCouponHandler);
