import { z } from "zod";

const email = z.email();
const password = z.string().min(8).max(128);
const name = z.string().min(1).max(128);

export const registerSchema = z.object({ email, password, name });
export const loginSchema = z.object({ email, password });
export const createStaffSchema = z.object({ email, password, name });

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
