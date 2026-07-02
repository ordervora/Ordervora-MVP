import rateLimit from "express-rate-limit";

export const authRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

export const importRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Generation is the most expensive operation in the app (multiple LLM
// calls per request) — a tighter limit than the general import limiter.
export const siteGenerationRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Public, unauthenticated contact form — keyed by IP, tighter limit to
// blunt basic spam alongside the honeypot check (§27).
export const contactFormRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Commerce & Fulfillment Engine (Sprint 07) — customer (end-diner)
// register/login, same limit as staff auth.
export const customerAuthRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Order placement — the highest-value abuse target in the commerce
// engine (each request can trigger a real payment authorization).
export const checkoutRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});

// Public, unauthenticated table-QR resolution — keyed by IP.
export const publicCommerceRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later" },
});
