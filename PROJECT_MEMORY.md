# OrderVora Project Memory

> Official long-term context file. Update after every major sprint.

## Project Identity

**Name:** OrderVora

**Purpose:** AI-powered restaurant operating system and direct ordering platform.

Goal: help restaurants own their ordering channel instead of depending on high commission marketplaces.

## Official Repository

Repository: `ordervora/Ordervora-MVP`

Main branch: `main`

This repository is the source of truth for product code.

## Architecture

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Mobile-first UX

### Backend
- Node.js / Express
- TypeScript
- Prisma ORM

### Database
- PostgreSQL
- Supabase

### Deployment
- Frontend: Vercel
- Backend: separate API deployment

## Product Areas

### Customer Experience
- Restaurant storefront
- Menu browsing
- Cart
- Checkout
- Customer accounts
- Order tracking
- QR ordering

### Restaurant Owner Platform
- Business Control Center
- Orders
- Menu Management
- Customers CRM
- Analytics
- Marketing
- Website Builder
- AI Import
- Settings

### Operations
- Kitchen Display System
- Staff management
- Delivery management
- Notifications

### Platform Admin
- Restaurants management
- Subscription plans
- Global analytics
- Audit logs

## Design System Rules

Official design direction:

- Premium SaaS quality
- Mobile first
- Warm cream backgrounds
- Soft black typography
- Gold / bronze accents
- Clean Apple-like spacing
- Smooth animations
- Avoid generic templates

Figma is the design source of truth.

## AI Roadmap

Planned:

- AI Menu Import
- AI Website Builder
- AI SEO content
- AI Marketing Assistant
- AI Analytics Assistant
- AI Restaurant Agent

## Current Development Direction

Sprint 18 (Owner Experience Foundation): **complete**, all 7 parts —
owner auth foundation, Business Setup Wizard, Launch Center, Test Order
Flow, Import Processing UX, Website Preview UX, Final Mobile UX Review.
Full detail per part is in `RELEASE_NOTES.md`.

Focus carried through the sprint:
- Improve existing screens
- Connect Figma designs to real React components
- Preserve backend functionality
- Improve mobile experience

Do not rewrite the system unnecessarily.

**What Sprint 18 did and did not cover:** the warm cream/gold design
system now covers the primary owner flows built or touched this sprint
(setup wizard, launch center, test order flow, import review, the AI
Builder path, and the manual Website Hub's preview/publish pages). It
does **not** yet cover the rest of the pre-existing owner dashboard
(Orders, Menu, Kitchen, Staff, Payments, Coupons, Loyalty, Referrals,
Tables, Delivery, Driver, Kitchen Capacity, POS, Restaurant, Profile) —
those pages had their mobile *structure* fixed in Part 7 (bottom-nav
clearance, horizontal-overflow guards, reachable navigation) but keep
their pre-Sprint-18 dark/zinc visual styling. Retheming them is real,
scoped follow-up work, not something to redo from scratch — see
`ROADMAP.md`.

**Mobile navigation:** `DashboardNav` (`apps/web/src/components/dashboard-nav.tsx`)
is the shared nav used by most dashboard pages — desktop pill nav +
mobile bottom tab bar with a "More" sheet for sections without their own
tab. `dashboard-overview.tsx` (the `/dashboard` Overview page) has its
own separate hand-rolled desktop-sidebar + mobile-bottom-nav layout,
not `DashboardNav` — a pre-existing duplication (not consolidated this
sprint; both got the same "More" sheet fix independently in Part 7).
Check which layout a new owner-facing page should use before building
it — don't assume `DashboardNav` covers every case.

## Important Decisions

1. Keep existing backend/core.
2. Improve UI layer first.
3. Avoid random feature expansion before launch.
4. Production stability is priority.

## Known Future Work

- Complete billing/subscriptions
- More integrations
- Real-time improvements
- POS providers
- Mobile applications

## Rule For Future Developers/AI Agents

Before changing architecture:
1. Read this file.
2. Check existing implementation.
3. Do not remove working features.
4. Explain major decisions.
