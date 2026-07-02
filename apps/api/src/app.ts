import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { authRouter } from "./modules/auth/auth.routes";
import { publicCartRouter } from "./modules/commerce/cart/cart.routes";
import { checkoutRouter } from "./modules/commerce/checkout/checkout.routes";
import { couponsRouter } from "./modules/commerce/coupons/coupons.routes";
import { customerRouter } from "./modules/commerce/customers/index.routes";
import { deliveryRulesRouter } from "./modules/commerce/delivery-rules/delivery-rules.routes";
import { fulfillmentRouter } from "./modules/commerce/fulfillment/fulfillment.routes";
import { menuCommerceRouter } from "./modules/commerce/menu-commerce/menu-commerce.routes";
import { publicMenuRouter } from "./modules/commerce/menu-commerce/public-menu.routes";
import { ordersRouter, publicOrdersRouter } from "./modules/commerce/orders/orders.routes";
import { paymentsRouter, paymentWebhookRouter, publicPaymentConfigRouter } from "./modules/commerce/payments/payments.routes";
import { posRouter } from "./modules/commerce/pos/pos.routes";
import { publicTablesRouter, tablesRouter } from "./modules/commerce/qr-ordering/tables.routes";
import { importRouter } from "./modules/imports/import.routes";
import { menuRouter } from "./modules/menu/menu.routes";
import { adminRestaurantRouter, restaurantRouter } from "./modules/restaurants/restaurant.routes";
import { previewRouter, siteEdgeMiddleware } from "./modules/sites/public-render.routes";
import { publicSiteRouter, siteRouter } from "./modules/sites/site.routes";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: process.env.FRONTEND_URL,
      credentials: true,
    }),
  );
  // The `verify` callback stashes the raw request bytes on `req.rawBody`
  // before JSON parsing — payment webhook signature verification (BYOP,
  // one webhook secret per connected PaymentProvider) must hash the exact
  // bytes the provider signed, not a re-serialized `req.body`.
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        (req as Request & { rawBody?: Buffer }).rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  // Serves uploaded images (site assets, import files) by basename — see
  // renderer/asset-url.ts. Public/unauthenticated by design: these are
  // meant to be embedded in public site pages.
  app.use("/assets", express.static(path.resolve(process.env.IMPORT_UPLOAD_DIR ?? "uploads")));

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // §20 edge routing substitute — resolves Host header to a published site
  // and serves it; falls through (next()) for any hostname that isn't a
  // known site's domain, so /api/*, /public/*, /preview/*, /health, and
  // /assets below are unaffected for the platform's own host.
  app.use(siteEdgeMiddleware);

  app.use("/preview", previewRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/restaurants", restaurantRouter);
  app.use("/api/restaurants", fulfillmentRouter);
  app.use("/api/restaurants", deliveryRulesRouter);
  app.use("/api/restaurants", menuCommerceRouter);
  app.use("/api/restaurants", paymentsRouter);
  app.use("/api/restaurants", posRouter);
  app.use("/api/restaurants", couponsRouter);
  app.use("/api/restaurants", ordersRouter);
  app.use("/api/restaurants", tablesRouter);
  app.use("/api/admin/restaurants", adminRestaurantRouter);
  app.use("/api/menu", menuRouter);
  app.use("/api/imports", importRouter);
  app.use("/api/sites", siteRouter);
  app.use("/public/sites", publicSiteRouter);

  // Commerce & Fulfillment Engine (Sprint 07) — customer-facing, public
  // (guest/customer identity resolved from cookies, not requireAuth).
  app.use("/api/public", publicMenuRouter);
  app.use("/api/public", publicCartRouter);
  app.use("/api/public", publicPaymentConfigRouter);
  app.use("/api/public", checkoutRouter);
  app.use("/api/public", publicOrdersRouter);
  app.use("/api/public", publicTablesRouter);

  // Customer (end-diner) account auth — separate identity from staff auth.
  app.use("/api/customer", customerRouter);

  // BYOP webhooks — no requireAuth, signature-verified per-provider instead.
  app.use("/api/webhooks/payments", paymentWebhookRouter);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.message });
      return;
    }
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return app;
}
