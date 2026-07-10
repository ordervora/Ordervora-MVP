# OrderVora Roadmap

## Completed

### Core Platform
- Authentication
- Restaurant/business foundation
- Menu system
- Ordering flow
- Checkout
- Payments foundation
- Dashboard foundation
- KDS foundation

### Sprint 18 — Owner Experience Foundation (complete)
- Part 1: Owner auth foundation (password reset, email verification, Remember Me, logout-all, profile) — completed
- Part 2: Business Setup Wizard — completed
- Part 3: Launch Center — completed
- Part 4: Test Order Flow — completed
- Part 5: Import Processing UX (bulk review actions, multi-photo upload, named progress stages, business-profile retheme) — completed
- Part 6: Website Preview UX (preview/publish chain retheme, real generation progress) — completed
- Part 7: Final Mobile UX Review (mobile "More" navigation, page-shell spacing/overflow fixes, Orders page mobile polish) — completed

See `RELEASE_NOTES.md` for full detail on each part and `PROJECT_MEMORY.md` for current-state context.

## Current Focus

Sprint 18 is complete. Next up, in priority order per `CLAUDE.md`
(production stability > existing feature completion > UX > new
features):

- Retheme the remaining dashboard pages still on the pre-Sprint-18
  dark/zinc styling (Orders, Menu, Kitchen, Staff, Payments, Coupons,
  Loyalty, Referrals, Tables, Delivery, Driver, Kitchen Capacity, POS,
  Restaurant, Profile, and the manual Website Hub's Editor/Messages/Score
  pages) onto the warm cream/gold system — Sprint 18 fixed these pages'
  mobile *structure* (nav reachability, bottom-nav clearance, overflow)
  but explicitly left their visual redesign for later, larger work.
- Fix `live-build-screen.test.tsx`'s 3 pre-existing failing tests (a
  caption-timing assertion issue in the AI Builder flow, unrelated to
  Sprint 18's work).
- Decide whether `/dashboard/website/*` (manual Website Hub) and
  `/dashboard/builder/*` (orchestrated AI Builder) should be
  consolidated into one flow, or kept as primary/secondary paths.

## After Sprint 18

### Product Design Upgrade

- Owner dashboard redesign
- Business Control Center
- Premium mobile experience
- Figma to React implementation

### Monetization

Subscription plans:

Starter
$99/month

Growth
$189/month

Pro
$295/month

Enterprise
Custom pricing

## Future Platform Expansion

- AI Restaurant Assistant
- AI Menu Builder
- AI Marketing
- Customer mobile app
- Owner mobile app
- POS integrations
- Delivery integrations
- Multi-location management

## Launch Goal

Move from beta platform to production-ready SaaS with pilot restaurants.
