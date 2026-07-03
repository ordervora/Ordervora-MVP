import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import multer from "multer";
import { getEnv, getStringEnv } from "./config/env";
import { prisma } from "./lib/prisma";
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
    helmet({
      // Published restaurant sites (renderer/render-page.ts) embed an
      // inline <style> block (theme-css.ts) and two inline
      // <script type="application/ld+json"> tags (seo-head.ts) — both are
      // escaped/validated at generation time (html-escape.ts, safeJsonLd),
      // not attacker-controllable raw HTML, but CSP's script-src/style-src
      // apply to inline tags regardless of content type. A nonce-based
      // policy isn't viable here without breaking the renderer's documented
      // "same definition + theme version -> identical output" determinism
      // (publishSite writes static HTML once; a nonce is per-request
      // random), so 'unsafe-inline' is used for both instead of disabling
      // CSP outright — default-src/object-src/frame-ancestors stay strict.
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'self'"],
        },
      },
      // Not needed for this app's same-origin asset-proxy architecture
      // (apps/web rewrites every /api, /assets, /preview call server-side —
      // the browser never makes a cross-origin request to apps/api
      // directly), and risks breaking the dashboard's preview iframe.
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    cors({
      origin: getEnv().FRONTEND_URL,
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
  app.use("/assets", express.static(path.resolve(getStringEnv("IMPORT_UPLOAD_DIR", "uploads"))));

  // Liveness — reports the process is up; does not touch the database.
  // Used by container orchestration to decide whether to restart a stuck
  // instance, not whether to route it traffic (see /ready below).
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // Readiness (Production Hardening Phase 4) — verifies live DB
  // connectivity before a load balancer/orchestrator sends traffic to a
  // new instance. Distinct from /health: a process can be alive (healthy)
  // while its database connection is down (not ready) during startup or a
  // transient outage.
  app.get("/ready", async (_req: Request, res: Response) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.status(200).json({ status: "ready" });
    } catch {
      res.status(503).json({ status: "not ready" });
    }
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
