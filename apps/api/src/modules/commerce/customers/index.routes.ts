import { Router } from "express";
import { customerAuthRateLimiter } from "../../../middleware/rate-limit";
import { createAddressHandler, deleteAddressHandler, listAddressesHandler, updateAddressHandler } from "./addresses.controller";
import { loginHandler, logoutHandler, meHandler, refreshHandler, registerHandler } from "./customers.controller";
import { createFavoriteHandler, deleteFavoriteHandler, listFavoritesHandler } from "./favorites.controller";
import { createPaymentMethodHandler, deletePaymentMethodHandler, listPaymentMethodsHandler } from "./payment-methods.controller";
import { requireCustomerAuth } from "./require-customer-auth";

const authRouter = Router();
authRouter.post("/register", customerAuthRateLimiter, registerHandler);
authRouter.post("/login", customerAuthRateLimiter, loginHandler);
authRouter.post("/refresh", refreshHandler);
authRouter.post("/logout", logoutHandler);
authRouter.get("/me", requireCustomerAuth, meHandler);

const addressesRouter = Router();
addressesRouter.get("/", requireCustomerAuth, listAddressesHandler);
addressesRouter.post("/", requireCustomerAuth, createAddressHandler);
addressesRouter.patch("/:id", requireCustomerAuth, updateAddressHandler);
addressesRouter.delete("/:id", requireCustomerAuth, deleteAddressHandler);

const favoritesRouter = Router();
favoritesRouter.get("/", requireCustomerAuth, listFavoritesHandler);
favoritesRouter.post("/", requireCustomerAuth, createFavoriteHandler);
favoritesRouter.delete("/:id", requireCustomerAuth, deleteFavoriteHandler);

const paymentMethodsRouter = Router();
paymentMethodsRouter.get("/", requireCustomerAuth, listPaymentMethodsHandler);
paymentMethodsRouter.post("/", requireCustomerAuth, createPaymentMethodHandler);
paymentMethodsRouter.delete("/:id", requireCustomerAuth, deletePaymentMethodHandler);

// Mounted at "/api/customer" myself.
export const customerRouter = Router();
customerRouter.use("/auth", authRouter);
customerRouter.use("/addresses", addressesRouter);
customerRouter.use("/favorites", favoritesRouter);
customerRouter.use("/payment-methods", paymentMethodsRouter);
