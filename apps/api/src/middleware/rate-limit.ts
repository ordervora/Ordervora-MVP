import rateLimit from "express-rate-limit";
import { RedisRateLimitStore } from "../lib/redis-rate-limit-store";

// Production Hardening Phase 5 — every limiter below gets a Redis-backed
// store instead of express-rate-limit's default in-memory Map, so a
// limit is enforced across every instance sharing one Redis, not
// per-instance (PR-4). Purely additive: no limit's threshold changes.
// Each store fails open (see redis-rate-limit-store.ts) if REDIS_URL is
// unset or Redis is unreachable — a rate-limiter outage degrades to
// "not enforced," never to blocking legitimate traffic.
export const authRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("auth"),
});

export const importRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("import"),
});

// Generation is the most expensive operation in the app (multiple LLM
// calls per request) — a tighter limit than the general import limiter.
export const siteGenerationRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("site-generation"),
});

// Public, unauthenticated contact form — keyed by IP, tighter limit to
// blunt basic spam alongside the honeypot check (§27).
export const contactFormRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("contact-form"),
});

// Commerce & Fulfillment Engine (Sprint 07) — customer (end-diner)
// register/login, same limit as staff auth.
export const customerAuthRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("customer-auth"),
});

// Order placement — the highest-value abuse target in the commerce
// engine (each request can trigger a real payment authorization).
export const checkoutRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("checkout"),
});

// Public, unauthenticated table-QR resolution — keyed by IP.
export const publicCommerceRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("public-commerce"),
});

// Payment provider webhooks (Sprint 07.7 H-13) — no caller identity exists
// pre-signature-verification, so this is IP-keyed like the other public
// limiters, but tuned looser: real webhook traffic can legitimately burst
// (e.g. a batch of retried events after an outage), unlike checkout.
export const webhookRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("webhook"),
});

// Defense-in-depth for the authenticated staff-facing commerce surface
// (Sprint 07.7 H-14) — looser than the public-facing limiters since staff
// are already authenticated and legitimate dashboard usage can burst, but
// present as a throttle on a compromised/leaked session.
export const staffActionRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
  store: new RedisRateLimitStore("staff-action"),
});
