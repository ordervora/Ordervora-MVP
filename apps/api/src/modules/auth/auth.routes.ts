import { Router } from "express";
import { authRateLimiter } from "../../middleware/rate-limit";
import { requireAuth } from "../../middleware/require-auth";
import { requireRole } from "../../middleware/require-role";
import { Role } from "@prisma/client";
import { inviteStaff, login, logout, me, refresh, register } from "./auth.controller";

export const authRouter = Router();

authRouter.post("/register", authRateLimiter, register);
authRouter.post("/login", authRateLimiter, login);
authRouter.post("/refresh", refresh);
authRouter.post("/logout", logout);
authRouter.get("/me", requireAuth, me);
authRouter.post("/staff", requireAuth, requireRole(Role.RESTAURANT_OWNER), inviteStaff);
