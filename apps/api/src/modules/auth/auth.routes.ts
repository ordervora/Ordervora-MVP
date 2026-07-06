import { Router } from "express";
import { authRateLimiter } from "../../middleware/rate-limit";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { Role } from "@prisma/client";
import { inviteStaff, listStaffHandler, login, logout, me, refresh, register, setStaffActiveHandler } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, register);
authRouter.post("/login", authRateLimiter, login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
authRouter.post("/staff", requireAuth, requireRole(Role.RESTAURANT_OWNER), inviteStaff);
authRouter.get("/staff", requireAuth, requireRole(Role.RESTAURANT_OWNER), listStaffHandler);
authRouter.patch("/staff/:id", requireAuth, requireRole(Role.RESTAURANT_OWNER), setStaffActiveHandler);
