import { z } from "zod";

const name = z.string().min(1).max(128);
const optionalText = z.string().max(512).optional();

export const createRestaurantSchema = z.object({
  name,
  description: optionalText,
  address: optionalText,
  phone: z.string().max(32).optional(),
});

export const updateRestaurantSchema = z.object({
  name: name.optional(),
  description: optionalText,
  address: optionalText,
  phone: z.string().max(32).optional(),
  isPublished: z.boolean().optional(),
});

export const suspendRestaurantSchema = z.object({
  reason: z.string().max(500).optional(),
});

export type CreateRestaurantInput = z.infer<typeof createRestaurantSchema>;
export type UpdateRestaurantInput = z.infer<typeof updateRestaurantSchema>;
export type SuspendRestaurantInput = z.infer<typeof suspendRestaurantSchema>;
