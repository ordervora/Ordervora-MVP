import { z } from "zod";

export const createCartSchema = z.object({
  fulfillmentType: z.enum(["PICKUP", "DELIVERY", "DINE_IN"]).default("PICKUP"),
  tableId: z.uuid().optional(),
});

export const addCartItemSchema = z.object({
  menuItemId: z.uuid(),
  variantId: z.uuid().optional(),
  quantity: z.number().int().positive().default(1),
  modifierOptionIds: z.array(z.uuid()).default([]),
  notes: z.string().max(256).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().positive(),
});

export const setFulfillmentSchema = z.object({
  fulfillmentType: z.enum(["PICKUP", "DELIVERY", "DINE_IN"]),
  scheduledFor: z.coerce.date().optional(),
  deliveryAddressId: z.uuid().optional(),
  tableId: z.uuid().optional(),
});

export const applyCouponSchema = z.object({
  code: z.string().min(1).max(32),
});

export type CreateCartInput = z.infer<typeof createCartSchema>;
export type AddCartItemInput = z.infer<typeof addCartItemSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
export type SetFulfillmentInput = z.infer<typeof setFulfillmentSchema>;
export type ApplyCouponInput = z.infer<typeof applyCouponSchema>;
