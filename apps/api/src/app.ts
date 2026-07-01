import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import { authRouter } from "./modules/auth/auth.routes";
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
  app.use(express.json());
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
  app.use("/api/admin/restaurants", adminRestaurantRouter);
  app.use("/api/menu", menuRouter);
  app.use("/api/imports", importRouter);
  app.use("/api/sites", siteRouter);
  app.use("/public/sites", publicSiteRouter);

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
