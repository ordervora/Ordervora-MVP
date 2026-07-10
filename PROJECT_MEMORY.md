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

Sprint 18:
Premium UI integration.

Focus:
- Improve existing screens
- Connect Figma designs to real React components
- Preserve backend functionality
- Improve mobile experience

Do not rewrite the system unnecessarily.

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
