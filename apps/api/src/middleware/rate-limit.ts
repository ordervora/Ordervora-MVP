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
});
