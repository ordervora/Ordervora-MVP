# Sprint 07 Master Specification — Commerce & Fulfillment Engine

**Status: PLANNING ONLY.** No branch created, no code written, no repository changes made as part of producing this document. This spec builds directly on the Sprint 06.5 audit findings (unindexed status columns, no pagination, no cascade deletes, no caching layer, single-instance-only storage/rate-limiting) and on the existing codebase conventions confirmed by inspection: the `routes → controller → service` layering with per-module `validation.ts`/`errors.ts`, the `getOwnRestaurantId` / 404-not-403 tenant-isolation pattern, the `ImportAdapter`-style registry-with-`implemented`-flag pattern proven twice already (Sprint 04 import sources), and the fire-and-forget controller-level event hook pattern proven in Sprint 06's `revalidatePublishedSite`.

One grounding fact worth stating up front: `SiteFacts.hasOnlineOrdering` already exists in the schema/types and every CTA in the public renderer already ranks "Order Now" as the top-priority action — but it is currently hardcoded `false` in `assemble.ts`, and every rendered CTA link points at `#primary-action`, a same-page anchor with nothing behind it. Sprint 07 is what makes that flag true and that link real.

---

## 1. Commerce Engine Architecture

New domain: `apps/api/src/modules/commerce/`, following the existing per-module layering, subdivided by responsibility rather than left flat (justified by size, same rationale as `sites/scoring/` and `sites/renderer/`):

- `commerce/cart/` — cart CRUD, item/modifier management
- `commerce/checkout/` — quote computation, fulfillment/payment eligibility, order placement orchestration
- `commerce/orders/` — order lifecycle, status transitions, staff-facing management
- `commerce/payments/` — `PaymentProviderAdapter` interface + `providers/` (stripe, clover, square, authorize-net, adyen, fiserv) + registry
- `commerce/fulfillment/` — `FulfillmentProviderAdapter` interface + `providers/` (pickup, restaurant-driver, uber-direct, doordash-drive, local-courier) + registry
- `commerce/delivery-rules/` — zone/rule storage + the Smart Routing Engine
- `commerce/menu-commerce/` — variants, modifiers, inventory (extends, does not fork, the existing `menu` module's data)
- `commerce/coupons/`
- `commerce/customers/` — the new end-diner identity (Customer/GuestCustomer), separate from staff `User`
- `commerce/events/` — the in-process event emitter and event catalog
- `commerce/notifications/` — channel-abstracted dispatch

**Dependency direction is strictly one-way and acyclic by design**, learning directly from the one architectural crack the 06.5 audit found in Sprint 06 (the menu→sites circular-import workaround): `checkout` depends on `cart`, `menu-commerce`, `delivery-rules`, and `payments`; `orders` depends on `checkout`'s output only; `fulfillment` depends on `orders` and `delivery-rules`; `events`, `notifications`, and the future `analytics` consumer are pure subscribers that nothing in the core flow imports back. No module in this domain will ever need to reach back into a module that depends on it — if that need arises, it's a signal the boundary is wrong, not a case for another controller-layer workaround.

**Core principles enforced structurally, not just by convention:**
- **BYOP / bring-your-own-delivery** is enforced by construction: `PaymentProvider` and `FulfillmentProvider` are always rows scoped to a `restaurantId` holding *that restaurant's* credentials — there is no platform-wide payment account a restaurant is funneled into.
- **Adapter-behind-interface** is enforced by construction: nothing outside `payments/providers/*.ts` or `fulfillment/providers/*.ts` may reference a specific provider's SDK or API shape. Orchestration code only ever calls the interface.
- **Idempotency is a platform-wide requirement, not a per-endpoint choice**: every mutating commerce endpoint that can plausibly be double-submitted (place-order, refund, coupon-redeem) requires an `Idempotency-Key` header, checked against a dedicated dedupe table before the handler runs.
- **State machines, not booleans**: `Order.status`, `Order.paymentStatus`, `Order.fulfillmentStatus` are each enums with an explicit, centrally-enforced valid-transition table — no code outside one `order-state-machine.ts`-equivalent service function is permitted to write these columns directly, mirroring how error-mapping is already centralized per module today.

---

## 2. Database Design

Every model below follows the existing schema's conventions (UUID `id`, `createdAt`/`updatedAt` unless the model is genuinely immutable, explicit `@@index` on every FK/status/date column — directly addressing the indexing gap the 06.5 audit found in the current schema). Presented as field specifications, not literal Prisma syntax.

### Identity & Addresses
- **Customer** — `id`, `email` (unique), `passwordHash?` (nullable — guest-created customers may never set one), `name`, `phone?`. Deliberately a *separate* identity from the existing staff `User`/`Role` model, not an extension of it — diners and restaurant staff are different trust domains and must never share an auth table or a JWT audience.
- **GuestCustomer** — `id`, `email`, `phone?`, `name`. No password, ever. One-to-one with an `Order` for guest checkouts.
- **CustomerAddress** — `id`, `customerId`(FK), `label?`, `line1`, `line2?`, `city`, `state`, `postalCode`, `country`, `lat?`, `lng?` (geocoded once at save time, cached — never re-geocoded per checkout), `isDefault`. Index: `[customerId]`.
- **CustomerFavorite** — `id`, `customerId`(FK), `restaurantId`(FK), `menuItemId`(FK). Unique on `[customerId, menuItemId]`.
- **CustomerPaymentMethod** — `id`, `customerId`(FK), `providerId`(FK → PaymentProvider), `providerToken`, `brand?`, `last4?`, `expMonth?`, `expYear?`, `isDefault`. Index: `[customerId]`. **Design callout requiring explicit acknowledgment:** because BYOP means every restaurant has its own merchant account, a saved card is only valid against the specific `PaymentProvider` it was tokenized under — it is *not* a platform-wide wallet. The customer UX (§11) must present this as "save this card for [Restaurant]," never implying cross-restaurant reuse.

### Cart & Checkout
- **Cart** — `id`, `restaurantId`(FK — a cart never spans restaurants, consistent with tenant isolation), `customerId?`(FK), `guestSessionId?` (anonymous cookie token), `fulfillmentType` (PICKUP|DELIVERY), `status` (ACTIVE|CONVERTED|ABANDONED|EXPIRED), `scheduledFor?`, `deliveryAddressId?`(FK), `notes?`, `expiresAt`. Indexes: `[restaurantId, status]`, `[customerId]`, `[guestSessionId]`.
- **CartItem** — `id`, `cartId`(FK), `menuItemId`(FK), `variantId?`(FK), `quantity`, `unitPriceCents` (computed and **frozen** at add-time — see §9 pricing rule), `modifiersSnapshot` (JSON), `notes?`. Index: `[cartId]`.

Checkout itself is deliberately **not** a persisted entity — it's a stateless orchestration pipeline over an `ACTIVE` `Cart` (detailed in §3), avoiding schema bloat for what is fundamentally a computed, ephemeral quote.

### Orders (the durable financial record)
- **Order** — `id`, `orderNumber` (sequential per restaurant, human-readable), `restaurantId`(FK), `customerId?`(FK), `guestCustomerId?`(FK), `cartId?`(FK), `fulfillmentType`, `status`, `paymentStatus`, `fulfillmentStatus`, `subtotalCents`, `taxCents`, `tipCents`, `deliveryFeeCents`, `discountCents`, `totalCents`, `currency`, `scheduledFor?`, `deliveryAddressId?`(FK), `deliveryInstructions?`, `notes?`, `placedAt`, `confirmedAt?`, `readyAt?`, `completedAt?`, `cancelledAt?`, `cancellationReason?`. Indexes: `[restaurantId, status]`, `[restaurantId, createdAt]`, `[customerId]`; unique `[restaurantId, orderNumber]`.
- **OrderItem** — `id`, `orderId`(FK), `menuItemId`(FK — reference only), `nameSnapshot`, `variantNameSnapshot?`, `unitPriceCents`, `quantity`, `modifiersSnapshot`(JSON), `lineTotalCents`. Index: `[orderId]`. **Explicit, deliberate divergence from Sprint 06's "menu always renders live" principle**: that principle governs *display*; a financial record must be the opposite — frozen at the instant of purchase and never recomputed even if the menu changes later.
- **OrderEvent** — append-only, no `updatedAt`. `id`, `orderId`(FK), `type` (full catalog in §12), `payload`(JSON), `actorType` (SYSTEM|STAFF|CUSTOMER|PROVIDER_WEBHOOK), `actorId?`, `createdAt`. Index: `[orderId, createdAt]`. This is the single source of truth for everything that happened to an order — the backbone of §12's event architecture and §14's audit trail.
- **OrderTimeline** — `id`, `orderId`(FK), `milestone` (a curated customer-facing subset: PLACED, CONFIRMED, PREPARING, READY, OUT_FOR_DELIVERY, DELIVERED/PICKED_UP, COMPLETED, CANCELLED), `occurredAt`. Index: `[orderId]`. **Why both OrderEvent and OrderTimeline exist as separate models**, since the brief lists both: `OrderEvent` is the complete internal log, including noisy/internal events (`PAYMENT_RETRY_ATTEMPTED`, `FRAUD_SIGNAL_RAISED`) that must never reach a customer-facing tracking page. `OrderTimeline` is a small, curated projection written alongside select events specifically for that tracking UI, so the customer-facing query never has to filter or interpret a large heterogeneous log.

### Payments (BYOP)
- **PaymentProvider** — a restaurant's connected merchant account. `id`, `restaurantId`(FK), `providerType` (STRIPE|CLOVER|SQUARE|AUTHORIZE_NET|ADYEN|FISERV), `status` (PENDING_CONNECTION|CONNECTED|DISCONNECTED|ERROR), `credentialsEncrypted`, `externalAccountId`, `webhookSecretEncrypted`, `implemented` (mirrors `ImportAdapter.implemented` exactly), `connectedAt?`. Unique `[restaurantId, providerType]`; index `[restaurantId]`.
- **PaymentMethod** — the per-restaurant enable/disable toggle. `id`, `restaurantId`(FK), `providerId`(FK), `methodType` (APPLE_PAY|GOOGLE_PAY|VISA|MASTERCARD|AMEX|DISCOVER|CASH_ON_DELIVERY|CASH_AT_PICKUP), `isEnabled`. Unique `[restaurantId, methodType]`.
- **PaymentAttempt** — one row per authorization try (supports retry). `id`, `orderId`(FK), `providerId`(FK), `methodType`, `attemptNumber`, `status` (PENDING|AUTHORIZED|FAILED|CAPTURED|VOIDED), `providerPaymentIntentId`, `failureCode?`, `failureMessage?`, `amountCents`. Index: `[orderId]`.
- **Payment** — the settled record for an order, aggregating across attempts. `id`, `orderId`(FK, unique), `providerId`(FK), `successfulAttemptId?`(FK), `status` (PENDING|AUTHORIZED|CAPTURED|PARTIALLY_REFUNDED|REFUNDED|FAILED|VOIDED), `authorizedAmountCents`, `capturedAmountCents`, `refundedAmountCents` (default 0), `capturedAt?`.
- **Refund** — `id`, `paymentId`(FK), `orderId`(FK, denormalized), `amountCents`, `reason` (CUSTOMER_REQUEST|ORDER_CANCELLED|ITEM_UNAVAILABLE|QUALITY_ISSUE|OTHER), `status` (PENDING|PROCESSING|COMPLETED|FAILED), `providerRefundId`, `initiatedById?` (staff `User`, nullable for system-initiated).
- **Transaction** — append-only ledger, the reconciliation backbone. `id`, `orderId`(FK), `restaurantId`(FK, denormalized), `type` (CHARGE|REFUND|TIP|PLATFORM_FEE|ADJUSTMENT), `amountCents` (signed), `providerTransactionId?`. Index: `[restaurantId, createdAt]`. **The `restaurantId`/`orderId` denormalization here is a deliberate, explicit divergence from the transitive-FK pattern the 06.5 audit flagged as a risk in Sprint 06** — financial audit records must remain directly queryable regardless of how intermediate join paths evolve.
- **Tip** — `id`, `orderId`(FK, unique), `amountCents`, `percentage?`, `recipientType` (RESTAURANT_POOL|DRIVER). `Order.tipCents` remains the fast-read denormalized total; `Tip` is the attribution detail, which matters once driver tips need separate reporting from restaurant tips.
- **Tax** — `id`, `restaurantId`(FK), `jurisdiction`, `rateBasisPoints`, `appliesTo` (FOOD|DELIVERY_FEE|ALL), `isActive`. `Order.taxCents` is a frozen snapshot computed at order time, never retroactively recalculated if a `Tax` row changes later — same freeze-the-money-math principle as `OrderItem`.
- **Coupon** — `id`, `restaurantId`(FK), `code`, `type` (PERCENTAGE|FIXED_AMOUNT|FREE_DELIVERY), `value`, `minOrderCents?`, `maxDiscountCents?`, `startsAt?`, `expiresAt?`, `maxRedemptions?`, `maxRedemptionsPerCustomer?`, `isActive`. Unique `[restaurantId, code]`.
- **CouponRedemption** — a necessary supporting model not in the brief's example list but required to correctly enforce `maxRedemptionsPerCustomer`. `id`, `couponId`(FK), `orderId`(FK, unique — one coupon per order in v1), `customerId?`(FK), `guestCustomerId?`(FK), `discountAppliedCents`.
- **GiftCard** / **GiftCardTransaction** — modeled now per the "future-ready" instruction, but **schema-only in Sprint 07**: no checkout UI wiring. `GiftCard`: `id`, `restaurantId`(FK), `code` (unique), `initialBalanceCents`, `currentBalanceCents`, `status` (ACTIVE|REDEEMED|EXPIRED|CANCELLED), `issuedToEmail?`, `expiresAt?`. `GiftCardTransaction` mirrors `Transaction`'s ledger pattern. Explicitly deferred activation avoids shipping a half-built payment-adjacent feature.

### Fulfillment
- **Fulfillment** — one per order, tracks *execution* (distinct from `Order.fulfillmentType`, the customer's *choice*). `id`, `orderId`(FK, unique), `restaurantId`(FK), `method` (PICKUP|RESTAURANT_DRIVER|UBER_DIRECT|DOORDASH_DRIVE|LOCAL_COURIER), `status` (UNASSIGNED|ASSIGNED|EN_ROUTE_TO_RESTAURANT|PICKED_UP|EN_ROUTE_TO_CUSTOMER|DELIVERED|PICKUP_READY|PICKED_UP_BY_CUSTOMER|FAILED|CANCELLED), `estimatedReadyAt?`, `estimatedDeliveryAt?`, `actualPickedUpAt?`, `actualDeliveredAt?`, `providerId?`(FK), `externalDeliveryId?`.
- **FulfillmentProvider** — mirrors `PaymentProvider` exactly (BYO-delivery-provider). `id`, `restaurantId`(FK), `providerType` (UBER_DIRECT|DOORDASH_DRIVE|LOCAL_COURIER), `status`, `credentialsEncrypted`, `implemented`. Unique `[restaurantId, providerType]`.
- **DriverAssignment** — for `RESTAURANT_DRIVER` only. `id`, `fulfillmentId`(FK, unique), `driverId`(FK → existing `User`, role `RESTAURANT_STAFF` — deliberately reuses the existing staff identity rather than inventing a parallel Driver model), `assignedAt`, `acceptedAt?`, `status` (OFFERED|ACCEPTED|DECLINED|EN_ROUTE|DELIVERED), `currentLat?`, `currentLng?`, `lastLocationAt?`.
- **DeliveryZone** — `id`, `restaurantId`(FK), `name`, `geometry` (JSON — polygon or radius-based, discriminated by a `shapeType` field), `isActive`.
- **DeliveryRule** — `id`, `restaurantId`(FK), `zoneId?`(FK), `minDistanceMiles?`, `maxDistanceMiles?`, `fulfillmentMethod`, `priority`, `fallbackToRuleId?` (self-relation), `isActive`. Index: `[restaurantId, priority]`. Directly implements the mile-tiered example from the brief as **data**, evaluated by the Smart Routing Engine — never hardcoded logic.

### Menu Commerce (extends, does not fork, `MenuItem`)
- **MenuItemVariant** — `id`, `menuItemId`(FK), `name`, `priceDeltaCents`, `sortOrder`, `isDefault`.
- **ModifierGroup** — `id`, `restaurantId`(FK — reusable across items, e.g. "Choose your sauce"), `name`, `selectionType` (SINGLE|MULTIPLE), `isRequired`, `minSelections`, `maxSelections?`.
- **ModifierOption** — `id`, `modifierGroupId`(FK), `name`, `priceDeltaCents`, `isAvailable`, `sortOrder`.
- **MenuItemModifierGroup** — explicit join table (unique `[menuItemId, modifierGroupId]`), following the schema's existing avoidance of implicit many-to-many.
- **MenuItemInventory** — `id`, `menuItemId`(FK, unique), `trackInventory` (default false — opt-in, most small restaurants won't want formal stock counts), `quantityAvailable?`, `lowStockThreshold?`, `isTemporarilyOutOfStock` (default false — independent of `trackInventory`, the everyday "86 the salmon" action), `outOfStockUntil?`.

### Supporting (not in the brief's example list, but necessary for correctness)
- **NotificationLog** — `id`, `orderId?`(FK), `restaurantId?`(FK), `customerId?`(FK), `channel`, `type`, `status` (QUEUED|SENT|FAILED|SKIPPED_CHANNEL_DISABLED), `providerMessageId?`, `error?`.
- **WebhookEvent** — `id`, `source` (e.g. "stripe", "uber_direct"), `externalEventId`, `payload`(JSON), `signatureVerified`, `status` (RECEIVED|PROCESSED|FAILED|IGNORED_DUPLICATE). Unique `[source, externalEventId]` — this *is* the webhook idempotency mechanism.
- **IdempotencyKey** — `id`, `key` (unique), `restaurantId?`, `endpoint`, `responseSnapshot?`(JSON), `status` (IN_PROGRESS|COMPLETED|FAILED), `expiresAt`. Index: `[expiresAt]` for a cleanup job. **This table must be backed by Postgres, never an in-memory structure** — see §16, this is a correctness requirement, not a performance nicety.
- **FraudSignal** — `id`, `orderId`(FK), `signalType` (DUPLICATE_ORDER_SUSPECTED|VELOCITY_LIMIT_EXCEEDED|CARD_MISMATCH|HIGH_RISK_LOCATION|MANUAL_REVIEW_REQUESTED), `severity`, `details`(JSON), `resolvedAt?`, `resolvedById?`.

### Cascade behavior — an explicit fix for the audit's #1 schema finding
Unlike the current schema (zero `onDelete` clauses anywhere), every relation above should be given a *deliberate* cascade decision at migration time: `Cart`/`CartItem` cascade-delete with their parent (ephemeral data, safe to lose); `Order`/`OrderItem`/`Payment`/`Transaction`/`OrderEvent` **must never cascade-delete** on `Restaurant` deletion — they are financial/legal records requiring `Restrict` plus an explicit archival/anonymization service for any future tenant-offboarding flow (tracked as part of the audit's already-recommended Sprint 09 hardening work, not blocking here, but the schema must not make silent cascade-deletion of financial history *possible* by omission the way it currently does).

---

## 3. Checkout Engine

Checkout is a stateless pipeline over an `ACTIVE` `Cart`, not a persisted entity:

1. **Fulfillment selection** (pickup/delivery) — delivery requires a saved or entered address; triggers `DeliveryRule` evaluation for eligibility and fee.
2. **Scheduling** (ASAP vs. a future time), validated against restaurant open hours. This forces a decision the 06.5 audit already flagged as missing: **Sprint 07 must introduce a structured hours model** (days/open-close times), since scheduled-order validation cannot work against the current free-text `hours` field. This is the first real consumer of structured hours, ahead of the JSON-LD use case noted in the audit.
3. **Item review** — quantities/modifiers editable in place.
4. **Delivery instructions / order notes** — free text, length-capped, sanitized before storage and reused wherever it's later displayed (reusing the `escapeHtml` discipline already established in the renderer).
5. **Coupon application** — validated against `Coupon` rules and `CouponRedemption` limits at *quote* time and re-validated at placement time (coupons can expire or hit their cap between the two).
6. **Tip selection** — percentage presets + custom amount, computed off subtotal (configurable whether tax is included in the tip base).
7. **Tax calculation** — via the `Tax` rules engine, jurisdiction resolved from restaurant location (pickup) or delivery address (delivery), per restaurant configuration.
8. **Quote lock** — a `CheckoutQuote` is computed and returned to the client but **not persisted**; it carries a short expiry (e.g. 10 minutes) enforced at placement time, so a customer can't sit on a stale price and then pay a now-incorrect total.
9. **Payment method selection** — filtered to the intersection of `PaymentMethod.isEnabled` and whatever the Smart Routing Engine (§8) allows for the chosen fulfillment method.
10. **Order placement** — one atomic transaction: re-validate the quote hasn't expired or drifted (current menu prices, current coupon validity), authorize payment, create `Order` + `OrderItem`s + `Fulfillment` + the initial `OrderEvent` together; all downstream effects (notifications, timeline projection) fire asynchronously afterward via the event system (§12), never inside the transaction.

Gift card redemption is schema-ready (§2) but explicitly **not** a Sprint 07 checkout step.

---

## 4. Payment Orchestration Engine

**`PaymentProviderAdapter` interface** (implemented per provider, called only by orchestration code): `authorize(orderId, amountCents, methodToken)`, `capture(paymentAttemptId, amountCents?)`, `void(paymentAttemptId)`, `refund(paymentId, amountCents, reason)`, `getStatus(providerPaymentIntentId)`, `verifyWebhookSignature(rawBody, signatureHeader, secret)`, `parseWebhookEvent(payload)`.

**Registry**, mirroring the `ImportAdapter` registry exactly: one map from `PaymentProviderType` to adapter, each declaring `implemented: boolean`. **Sprint 07 ships Stripe as `implemented: true`** (best-documented REST + webhook model, strong BYOP support since a restaurant connects their own Stripe account rather than being folded into a platform-owned one); **Clover, Square, Authorize.net, Adyen, and Fiserv are registered stub adapters** (`implemented: false`, return a clear "not yet available" error if a restaurant attempts to connect one) — the exact "ship one, prove the abstraction, stub the rest" pattern already validated twice (Sprint 04 PDF/Image vs. DoorDash/UberEats/Grubhub; Sprint 05 Website/Google Maps).

- **Authorize vs. capture**: default is auth+capture together at placement for immediate orders; auth-only-then-capture-on-confirmation is an optional per-restaurant mode for scheduled orders, avoiding holding funds on an order the kitchen might reject.
- **Retry logic**: `PaymentAttempt` supports multiple tries; a declined card lets the customer pick a different method without losing the cart. Distinguish *hard decline* (customer must choose another method) from *provider outage* (5xx/timeout — queued for background retry, never silently marked failed; if the outage persists, checkout surfaces "payment temporarily unavailable" up front rather than stacking failed attempts).
- **Webhooks**: processed asynchronously via a background job, never inline in the HTTP handler (avoids holding the connection and allows retry). Every inbound webhook is written to `WebhookEvent` first; signature verification is mandatory before anything is trusted, reusing the "never trust unvalidated external input" discipline already established for `safeFetch` in Sprint 05; `[source, externalEventId]` uniqueness is the idempotent-replay guard.

---

## 5. Payment Methods

- Card networks (Visa/Mastercard/Amex/Discover) are exposed as individually toggleable `PaymentMethod` rows for restaurant-preference reasons (e.g. avoiding Amex's higher fees is a real, common ask) — honestly noting that most processors don't enforce network-level blocking natively, so the Stripe adapter must validate/reject a disabled network at authorization time rather than assume the toggle alone is enforced upstream.
- Apple Pay / Google Pay are wallet layers, not separate processors — routed through the same `PaymentProvider` via the provider's native payment-request integration (e.g. Stripe Payment Element), just another `PaymentMethodType`.
- Cash on Delivery / Cash at Pickup bypass `PaymentProviderAdapter` entirely: `Order.paymentStatus` starts `UNPAID`, staff mark it `PAID` on delivery/pickup (a dashboard action). No `PaymentAttempt`/`Payment` row is created, but a `Transaction` row still is, so the ledger stays complete regardless of payment method.
- Method × fulfillment interaction (e.g. Cash on Delivery reasonably disabled for Uber Direct/DoorDash Drive, since third-party drivers typically can't reconcile cash) is expressed as configuration evaluated by the Smart Routing Engine, never hardcoded.

---

## 6. Fulfillment Engine

**`FulfillmentProviderAdapter` interface**: `requestDelivery(fulfillmentId, pickupAddress, dropoffAddress, readyTime)`, `cancelDelivery(externalDeliveryId)`, `getDeliveryStatus(externalDeliveryId)`, `parseWebhookEvent(payload)`.

Same registry/`implemented`-flag pattern as payments. **PICKUP and RESTAURANT_DRIVER are implemented in Sprint 07** (no external API required — pickup is a status flow, restaurant-driver is an internal `DriverAssignment` flow). **UBER_DIRECT, DOORDASH_DRIVE, and LOCAL_COURIER are registered stub adapters**, returning a clear "not yet available" error — directly mirroring the proven Import Engine precedent.

Restaurant Drivers in Sprint 07: staff manually assign an order to a `RESTAURANT_STAFF` user flagged as a driver; a minimal mobile-responsive dashboard view shows assigned deliveries with "mark picked up / mark delivered" actions. `DriverAssignment.currentLat/Lng` is schema-ready, but live push-based GPS tracking (websockets) is explicitly out of scope for Sprint 07 — polling only.

---

## 7. Delivery Rules Engine

`DeliveryRule` rows, evaluated by the Smart Routing Engine in `priority` order, directly implement the brief's mile-tiered example as data: distance bands, one `fulfillmentMethod` per band, `fallbackToRuleId` for explicit chains ("try Uber Direct; if unavailable, fall back to Local Courier"), `isActive` for temporarily disabling a tier (e.g. the one restaurant driver called in sick).

**Busy-driver handling** is a routing-time check, not a schema field: the engine compares current in-flight `DriverAssignment` load against a per-restaurant configurable concurrency limit; over the limit, that tier is treated as unavailable and falls through — the same mechanism handles a provider reporting "no drivers available."

Because rules are data, a restaurant (via the owner dashboard, §18) can express custom bands and priorities without any code change — this is the concrete fulfillment of "architecture designed for future expansion without breaking existing code."

---

## 8. Smart Routing Engine

One decision function, evaluated at two points: (a) at checkout, to determine which options to even show; (b) at order-confirmation, to make the real assignment, since availability can change between browsing and placing.

**Inputs**: restaurant open/closed (from the new structured hours model), kitchen-busy signal (a restaurant-togglable "pause new orders" flag plus an optional queue-depth heuristic against `PREPARING`-status order count), driver availability (§7's busy-driver check + external provider queries once real adapters exist), delivery distance (geocoded once at address-save time, never per-checkout), payment-method eligibility (`PaymentMethod.isEnabled` AND `PaymentProvider.status === CONNECTED`), fulfillment-method eligibility (`DeliveryRule` resolution).

**Output**: an ordered, filtered set of valid `(fulfillmentMethod, availablePaymentMethods)` combinations — never a silent degrade. If truly nothing is available (restaurant closed), checkout is blocked with a clear "closed, reopens at X" message. This engine is **deliberately deterministic and rule-based, not AI-driven** — correctly scoped, since the AI pipeline's safe-default-fallback philosophy is right for content generation but wrong for money/logistics decisions, which must be exact and auditable, not probabilistic.

---

## 9. Menu Commerce

Variants, modifiers (required vs. optional via `ModifierGroup.isRequired`/`minSelections`/`maxSelections`), extra pricing, inventory, and temporary-out-of-stock are all specified in §2. The one rule that must be stated precisely because it's easy to get wrong:

> `CartItem.unitPriceCents = MenuItem.priceCents + variant.priceDeltaCents + Σ(selectedModifierOptions.priceDeltaCents)`, computed and **frozen** at add-to-cart time, then **re-validated (never silently recalculated)** at checkout confirmation against current menu data. If a price changed mid-checkout, the customer sees an explicit "price changed, please confirm" prompt rather than a silent charge discrepancy.

This is a deliberate divergence from Sprint 06's "menu always renders live" principle: *display* must always be live; a customer's *cart total*, once they've started checking out, must never silently drift.

---

## 10. Order Lifecycle

Two-tier status modeling, to avoid stuffing every fulfillment sub-state into one primary enum:

- **`Order.status`** (coarse, primary): `PENDING_PAYMENT → CONFIRMED → PREPARING → READY` (pickup) `/ OUT_FOR_DELIVERY` (delivery) `→ COMPLETED`, with `CANCELLED` and `REFUNDED` reachable as terminal off-ramps from any pre-`COMPLETED` state, and `FAILED` for orders whose payment never succeeded (cart preserved for retry, never surfaces to the kitchen).
- **`Order.paymentStatus`** (rollup): `UNPAID → AUTHORIZED → PAID → PARTIALLY_REFUNDED → REFUNDED / FAILED`.
- **`Order.fulfillmentStatus`** (rollup): `UNASSIGNED → ASSIGNED → IN_PROGRESS → COMPLETED / FAILED`, collapsed from `Fulfillment.status`'s finer detail.

Every transition is enforced by a single centralized valid-transition table (no direct writes to these columns anywhere else, mirroring the codebase's existing centralized-error-mapping convention) and always writes one `OrderEvent`, plus an `OrderTimeline` row where customer-visible.

---

## 11. Customer Experience

- **Guest checkout** (default, no account): `GuestCustomer` created at placement; order lookup via order number + email/phone verification, no password.
- **Customer accounts** (optional): the new `Customer` identity, deliberately not sharing the staff `User`/`Role` table; reuses the proven argon2id + rotating-opaque-refresh-token pattern from Sprint 02 rather than reinventing auth.
- **Saved addresses / saved cards** (per-restaurant-provider scoped, per §2's BYOP callout) / **favorites** / **order history** (paginated from day one — directly correcting the audit's "no pagination anywhere" finding) / **reorder** (clones past `OrderItem`s into a new `Cart`, re-validated against current availability/pricing, never blindly trusted — consistent with §9).

---

## 12. Event-Driven Architecture

`OrderEvent` (§2) is the backbone. Sprint 07 uses a **lightweight in-process event emitter**, not a new message-broker dependency — services emit typed events only *after* the originating DB transaction commits (never before, to avoid emitting for writes that get rolled back); subscribers (notification dispatch, timeline projection, fraud-signal evaluation) run as fire-and-forget async handlers, directly reusing the exact pattern already proven by `revalidatePublishedSite` in Sprint 06, rather than inventing a new convention.

**Full event catalog** (superset of the brief's examples): `ORDER_CREATED`, `PAYMENT_AUTHORIZED`, `PAYMENT_CAPTURED`, `PAYMENT_FAILED`, `ORDER_CONFIRMED`, `KITCHEN_STARTED`, `ORDER_READY`, `DRIVER_ASSIGNED`, `DRIVER_EN_ROUTE`, `ORDER_PICKED_UP`, `ORDER_OUT_FOR_DELIVERY`, `ORDER_DELIVERED`, `ORDER_PICKED_UP_BY_CUSTOMER`, `ORDER_COMPLETED`, `ORDER_CANCELLED`, `REFUND_INITIATED`, `REFUND_ISSUED`, `COUPON_REDEEMED`, `FRAUD_SIGNAL_RAISED`.

**Explicit non-goal for Sprint 07**: no external queue/broker (Redis/SQS). That's correctly a Sprint 09 scaling concern (already recommended in the 06.5 audit's roadmap), and the emit/subscribe interface is designed so a real broker can be swapped in later without touching call sites — the same "swap the seam later" pattern already used for `release-storage`/`file-storage`.

---

## 13. Notification Architecture

One `NotificationProviderAdapter` interface per channel, same adapter pattern as payments/fulfillment. **Sprint 07 implements EMAIL only** (`implemented: true`); SMS and Push are registered stub channels (`implemented: false`) so the interface and `NotificationLog` schema are proven now without a future migration.

**Triggers**: order confirmation, ready/out-for-delivery/delivered (customer), payment failed (customer, prompts retry), refund issued (customer), and — closing the exact gap the 06.5 audit flagged for the contact-message inbox, now far more urgent since a missed order is lost revenue — a **new-order staff alert**. Every notification attempt writes a `NotificationLog` row, even when skipped for a disabled channel, so gaps are auditable rather than silently absent.

---

## 14. Security

- **Fraud detection**: rule-based (correctly scoped for Sprint 07, not ML) evaluation via `FraudSignal` — hard blocks at placement time for clear abuse (e.g. velocity limits), soft signals for staff review otherwise, since legitimate duplicate orders do happen.
- **Duplicate orders**: the `Idempotency-Key` requirement (§1) is the primary defense against double-submit; a secondary heuristic (same cart/customer/restaurant within a short window) raises a review-flag rather than silently blocking.
- **Webhook verification**: mandatory signature check before any `WebhookEvent` is trusted to mutate state — reusing the "never trust unvalidated external input" discipline already established for `safeFetch`.
- **Audit trail**: `OrderEvent` + `Transaction` together are the complete, append-only, attributable record of every status change and every money movement.
- **Permissions**: extends the existing `Role` enforcement rather than inventing a new system — owners/staff manage orders for their own restaurant only, under the same 404-not-403 tenant-isolation convention already proven across every other module. A more granular capability system (e.g. "can issue refunds") is recommended for Sprint 08, once real usage patterns exist, rather than over-engineered here.
- **PCI scope**: raw card data must **never** touch OrderVora's servers. All card entry happens via the payment provider's client-side tokenization (Stripe Elements or equivalent); OrderVora only ever stores/handles provider tokens. This keeps PCI scope at SAQ-A and must shape every payment UI decision from the start, not be retrofitted.
- **Secrets**: `PaymentProvider.credentialsEncrypted`/`webhookSecretEncrypted` require application-level envelope encryption with a dedicated key, separate from `JWT_ACCESS_SECRET` — these secrets, if leaked, could authorize real charges against a restaurant's live merchant account.

---

## 15. Performance

- **Caching**: menu-commerce reads (variants/modifiers/inventory) are the first genuine use case for the caching layer the 06.5 audit flagged as globally absent — recommend a simple in-process TTL cache keyed by `restaurantId`, deferring Redis to the already-planned Sprint 09 hardening work rather than introducing new infrastructure prematurely.
- **Indexes**: every model in §2 ships with `@@index` on its `restaurantId`/status/date/FK columns from the start — this is a hard review gate for the Sprint 07 migration, directly correcting the exact gap the audit criticized in the existing schema.
- **Background jobs**: webhook processing, notification dispatch, async fraud evaluation, and `IdempotencyKey`/`WebhookEvent` cleanup reuse the polled-job-row-in-Postgres pattern already proven by `GenerationJob` in Sprint 06, rather than introducing new queue infrastructure before it's needed.
- **Optimized queries**: order list/history endpoints ship with pagination and scoped `select`s from day one — both explicitly missing today per the audit, and non-negotiable here given `Order`/`OrderEvent`/`Transaction` are, by design, the fastest-growing tables in the schema.

---

## 16. Scalability

Every hot commerce table carries `restaurantId` **directly**, not just transitively — a deliberate improvement over the Sprint 06 pattern the audit flagged, and the natural partitioning key if Postgres partitioning or a multi-database split is ever needed. `OrderEvent` and `Transaction` are the fastest-growing tables and are natural candidates for time-based partitioning once volume warrants it (a Sprint 09+ operational concern, not a build item here — but the UUID-PK + `createdAt`-indexed shape is partition-friendly from day one).

**Hard dependency, stated explicitly**: the in-memory rate-limiting and local-disk storage limitations the audit already flagged apply with *more* force to commerce — an in-memory idempotency check would be actively unsafe across multiple instances (two instances could each "not find" the same key and double-charge a customer). `IdempotencyKey` and `WebhookEvent` dedupe **must** be backed by Postgres from day one (already the plan in §2), independent of whether Redis/multi-instance work happens in Sprint 09 — this is a correctness requirement now, not a future nice-to-have.

---

## 17. API Design

**Public/customer-facing** (guest or `Customer` JWT):
`POST /api/public/restaurants/:id/cart` · `GET /api/public/cart/:cartId` · `POST /api/public/cart/:cartId/items` · `PATCH /api/public/cart/:cartId/items/:itemId` · `DELETE /api/public/cart/:cartId/items/:itemId` · `POST /api/public/cart/:cartId/coupon` · `DELETE /api/public/cart/:cartId/coupon` · `GET /api/public/checkout/:cartId/fulfillment-options` · `POST /api/public/checkout/:cartId/quote` · `POST /api/public/checkout/:cartId/place-order` (idempotency-key required) · `GET /api/public/orders/:orderId` · `GET /api/public/orders/:orderId/timeline`

**Customer account**:
`POST /api/customer/register` · `POST /api/customer/login` · `POST /api/customer/logout` · `POST /api/customer/refresh` · `GET /api/customer/me` · `GET /api/customer/orders` (paginated) · `POST /api/customer/orders/:id/reorder` · `GET|POST|PATCH|DELETE /api/customer/addresses[/:id]` · `GET|POST|DELETE /api/customer/payment-methods[/:id]` · `GET|POST|DELETE /api/customer/favorites[/:id]`

**Staff/owner order management** (tenant-scoped, `requireAuth` + `staffOrOwner`):
`GET /api/restaurants/me/orders` (paginated, filterable) · `GET /api/restaurants/me/orders/:id` · `GET /api/restaurants/me/orders/:id/events` · `PATCH /api/restaurants/me/orders/:id/confirm|start-preparing|mark-ready|complete|cancel|mark-paid` · `POST /api/restaurants/me/orders/:id/refund` · `POST /api/restaurants/me/fulfillment/:id/assign-driver` · `PATCH /api/restaurants/me/fulfillment/:id/status`

**Menu commerce management** (owner):
`GET|POST|PATCH|DELETE /api/restaurants/me/menu-items/:id/variants[/:vid]` · `GET|POST|PATCH|DELETE /api/restaurants/me/modifier-groups[/:id]` · `GET|POST|PATCH|DELETE /api/restaurants/me/modifier-groups/:id/options[/:oid]` · `POST /api/restaurants/me/menu-items/:id/modifier-groups` · `PATCH /api/restaurants/me/menu-items/:id/inventory` · `PATCH /api/restaurants/me/menu-items/:id/86`

**Payments config** (owner):
`GET /api/restaurants/me/payment-providers` · `POST /api/restaurants/me/payment-providers/:type/connect` · `DELETE /api/restaurants/me/payment-providers/:type` · `GET|PATCH /api/restaurants/me/payment-methods`

**Delivery config** (owner):
`GET|POST|PATCH|DELETE /api/restaurants/me/delivery-zones[/:id]` · `GET|POST|PATCH|DELETE /api/restaurants/me/delivery-rules[/:id]` · `GET|POST|PATCH|DELETE /api/restaurants/me/fulfillment-providers[/:type]`

**Coupons** (owner): `GET|POST|PATCH|DELETE /api/restaurants/me/coupons[/:id]`

**Webhooks** (provider-initiated, signature-verified instead of user-authed):
`POST /api/webhooks/payments/:providerType` · `POST /api/webhooks/fulfillment/:providerType`

---

## 18. Frontend

**Customer-facing** (new — see scope note below): interactive menu/ordering page (extends the existing static `MenuSection` renderer with real "Add to Cart" behavior — the first time the public site needs client-side interactivity at all), item customization modal, cart drawer, multi-step checkout (fulfillment → schedule/address → review → payment → confirmation), order confirmation page, order tracking page, customer account (login/register, order history, reorder, saved addresses/cards, favorites).

**Owner-facing** (extends `/dashboard`): orders inbox (filterable list), order detail (items, customer, timeline, refund action), menu commerce management (extends `/dashboard/menu`), payment provider connection (`/dashboard/payments`), delivery zones/rules editor (`/dashboard/delivery`), coupon management (`/dashboard/coupons`), a minimal "today's orders/revenue" widget (full analytics remains Sprint 10 per the existing roadmap).

**Staff-facing**: a minimal orders/kitchen view (status queue with "mark ready" actions) and a driver view (assigned deliveries, mark picked up/delivered).

**Scope boundary requiring a decision**: the 06.5 audit recommended a full real-time Kitchen Display System for Sprint 08. Sprint 07 cannot ship a working commerce engine without *some* staff-facing view — orders need somewhere to land — so this spec proposes Sprint 07 includes a bare-bones polling-based orders/kitchen list (no websockets, no sound alerts, no printer integration), with the full real-time KDS remaining Sprint 08 as already planned. Flagging this explicitly since it's a real scope call, not an obvious default.

---

## 19. Testing Strategy

**Unit**: state-machine transition validity (every legal/illegal transition), price computation (variant + modifier + tax + coupon + tip math), Smart Routing Engine decisions across open/closed/busy/distance/payment-eligibility permutations, `DeliveryRule` priority/fallback resolution, and a shared **interface-conformance test suite** run against every `PaymentProviderAdapter` implementation (including stubs), so Stripe and every future provider are held to identical behavioral guarantees. All following the existing vitest-with-fully-mocked-collaborators convention — no live Stripe/DB/network required, consistent with every prior sprint.

**Integration**: full cart → checkout → order-placement flow against a mocked payment provider (authorize + capture succeed, correct `OrderEvent` trail is produced); webhook idempotency (same webhook delivered twice processes exactly once); refund flows (full and partial); coupon-redemption limits under concurrent-ish requests.

**End-to-end**: Sprint 07 is the first sprint where real user-facing interactivity is introduced (cart/checkout), making genuine browser-driven E2E (Playwright) worth introducing for the first time — the guest-checkout happy path (browse → customize → guest checkout → mock payment → confirmation) and the owner order-management happy path (new order → confirm → ready → complete), run against a local test database and Stripe test-mode keys, never live third-party APIs.

**New testing-policy precedent worth naming explicitly**: given money is involved, the price-computation and payment-status-transition suites should be treated as release-blocking with zero tolerance for a "known failing test," a stricter bar than any subsystem has been formally held to before.

---

## 20. Acceptance Criteria

- [ ] Cart CRUD (create/add/update/remove items, apply/remove coupon) works end-to-end with mocked collaborators.
- [ ] Checkout quote correctly computes subtotal, tax, tip, delivery fee, and discount for representative scenarios (pickup, delivery, scheduled, with/without coupon).
- [ ] Order placement is idempotent: two identical requests with the same `Idempotency-Key` never create two orders or two charges.
- [ ] Stripe adapter supports authorize, capture, void, partial refund, and full refund against test-mode credentials; the interface-conformance suite passes for the Stripe implementation.
- [ ] Webhook endpoints reject unsigned or invalid-signature payloads without processing them; a duplicate-delivered webhook is processed exactly once.
- [ ] Smart Routing Engine correctly filters available fulfillment/payment combinations across closed-restaurant, busy-kitchen, no-available-driver, and out-of-range-distance scenarios.
- [ ] `DeliveryRule` priority and fallback chains resolve as configured, including the busy-driver-triggers-fallback case.
- [ ] Cash on Delivery / Cash at Pickup orders bypass the payment provider correctly but still produce a `Transaction` record once marked paid.
- [ ] Guest checkout requires no account; a `Customer` account correctly scopes saved cards per `PaymentProvider`, never cross-restaurant.
- [ ] Staff/owner order actions (confirm/prepare/ready/complete/cancel/refund) are tenant-isolated under the existing 404-not-403 convention — verified against another restaurant's order.
- [ ] Marking an item "86'd" removes it from checkout availability immediately, not just from display.
- [ ] Inventory decrement (where `trackInventory` is enabled) is atomic under concurrent order placement — no overselling under a race condition test.
- [ ] `Order.status`/`paymentStatus`/`fulfillmentStatus` transitions are only reachable through the centralized state-machine service; an illegal transition is rejected with a typed error.
- [ ] Every order-lifecycle transition produces exactly one `OrderEvent`, and customer-visible milestones produce a corresponding `OrderTimeline` row.
- [ ] Clover/Square/Authorize.net/Adyen/Fiserv and Uber Direct/DoorDash Drive/Local Courier remain visibly registered but return a clear "not available" response when selected — proven by re-running the registry pattern's existing test precedent.
- [ ] Full verification suite passes: `pnpm install`, `prisma generate`, `prisma validate`, `lint`, `typecheck`, `test`, `build`.
- [ ] No regression to any Sprint 01–06 functionality (auth, menu, import engine, AI website builder, renderer) — full existing test suite still passes unchanged.

---

## Decisions Requiring Approval

1. **Stripe-first payment provider** (implemented), with Clover/Square/Authorize.net/Adyen/Fiserv as registered stubs — same pattern as prior sprints' source rollouts. Confirm this is acceptable, or specify a different first provider if a design partner already uses one of the others.
2. **Minimal polling-based kitchen/orders view included in Sprint 07** (vs. deferring all staff-facing UI to Sprint 08's full KDS) — proposed because orders need somewhere to land, but this does expand Sprint 07's frontend scope beyond pure commerce.
3. **In-process event emitter, no message broker, in Sprint 07** — Redis/SQS deferred to Sprint 09 per the existing roadmap. Confirm this sequencing still holds given commerce is now in the picture.
4. **Gift cards are schema-only** in Sprint 07 (data model exists, no checkout UI) — confirm this satisfies "future-ready" as intended, or if partial UI is wanted sooner.
5. **Structured hours model** is introduced in Sprint 07 as a checkout-scheduling prerequisite, ahead of its originally-planned Sprint 10 slot (SEO/JSON-LD use case) — confirm this pull-forward is acceptable.

---

Sprint 07 has not been started. Awaiting approval before any implementation begins.
