import type { Cart, CartItem, FulfillmentMethod } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { validateCouponForRedemption } from "../coupons/coupons.service";
import { countActiveDriverAssignments } from "../fulfillment/fulfillment.service";
import { getConfig } from "../delivery-rules/delivery-config.service";
import { resolveDeliveryFeeCents, resolveServiceFeeCents } from "../delivery-rules/fee-rules.service";
import { isRestaurantOpenAt } from "../delivery-rules/hours.service";
import { getCapacity, isKitchenAvailable } from "../delivery-rules/kitchen-capacity.service";
import { distanceMilesBetween } from "../delivery-rules/geometry";
import { evaluateRouting } from "../delivery-rules/smart-routing";
import { computeTaxCents } from "./tax";
import { cartSubtotalCents } from "../cart/cart.service";

export interface CheckoutQuote {
  eligible: boolean;
  reason?: string;
  resolvedFulfillmentMethod?: FulfillmentMethod;
  distanceMiles?: number;
  subtotalCents: number;
  taxCents: number;
  tipCents: number;
  deliveryFeeCents: number;
  serviceFeeCents: number;
  discountCents: number;
  totalCents: number;
}

const ACTIVE_ORDER_STATUSES = ["CONFIRMED", "PREPARING"] as const;

/**
 * Computed fresh on every call, never persisted or cached — deliberately
 * simpler than a cached "quote lock with expiry" scheme, and more
 * correct: there is no stale quote to accidentally honor, since
 * placeOrder always recomputes this same function immediately before
 * charging the customer.
 */
export async function computeCheckoutQuote(
  cart: Cart & { items: CartItem[] },
  tipCents: number,
): Promise<CheckoutQuote> {
  const restaurant = await prisma.restaurant.findUnique({ where: { id: cart.restaurantId } });
  if (!restaurant) {
    return { eligible: false, reason: "Restaurant not found", subtotalCents: 0, taxCents: 0, tipCents: 0, deliveryFeeCents: 0, serviceFeeCents: 0, discountCents: 0, totalCents: 0 };
  }

  const subtotalCents = cartSubtotalCents(cart.items);

  const [hours, capacity, deliveryConfig, deliveryZones, deliveryRules, activeDriverCount, activeOrderCount, taxRules, deliveryFeeRules, serviceFeeRules] =
    await Promise.all([
      prisma.restaurantHours.findMany({ where: { restaurantId: cart.restaurantId } }),
      getCapacity(cart.restaurantId),
      getConfig(cart.restaurantId),
      prisma.deliveryZone.findMany({ where: { restaurantId: cart.restaurantId } }),
      prisma.deliveryRule.findMany({ where: { restaurantId: cart.restaurantId } }),
      countActiveDriverAssignments(cart.restaurantId),
      prisma.order.count({ where: { restaurantId: cart.restaurantId, status: { in: [...ACTIVE_ORDER_STATUSES] } } }),
      prisma.tax.findMany({ where: { restaurantId: cart.restaurantId } }),
      prisma.deliveryFeeRule.findMany({ where: { restaurantId: cart.restaurantId } }),
      prisma.serviceFeeRule.findMany({ where: { restaurantId: cart.restaurantId } }),
    ]);

  let distanceMiles: number | undefined;
  if (cart.fulfillmentType === "DELIVERY") {
    const address = cart.deliveryAddressId
      ? await prisma.customerAddress.findUnique({ where: { id: cart.deliveryAddressId } })
      : null;
    if (!address?.lat || !address.lng || restaurant.lat === null || restaurant.lng === null) {
      return {
        eligible: false,
        reason: "A deliverable address with a valid location is required",
        subtotalCents,
        taxCents: 0,
        tipCents,
        deliveryFeeCents: 0,
        serviceFeeCents: 0,
        discountCents: 0,
        totalCents: 0,
      };
    }
    distanceMiles = distanceMilesBetween(restaurant.lat, restaurant.lng, address.lat, address.lng);
  }

  const routing = evaluateRouting({
    restaurantId: cart.restaurantId,
    isOpen: isRestaurantOpenAt(hours, cart.scheduledFor ?? new Date()),
    kitchenAvailable: isKitchenAvailable(capacity, activeOrderCount),
    activeDriverCount,
    deliveryConfig,
    deliveryZones,
    deliveryRules,
    distanceMiles,
    subtotalCents,
    fulfillmentType: cart.fulfillmentType,
    enabledPaymentMethodTypes: [],
  });

  if (!routing.eligible) {
    return {
      eligible: false,
      reason: routing.reason,
      subtotalCents,
      taxCents: 0,
      tipCents,
      deliveryFeeCents: 0,
      serviceFeeCents: 0,
      discountCents: 0,
      totalCents: 0,
    };
  }

  const deliveryFeeCents =
    cart.fulfillmentType === "DELIVERY" ? resolveDeliveryFeeCents(deliveryFeeRules, distanceMiles ?? 0, subtotalCents) : 0;
  const serviceFeeCents = resolveServiceFeeCents(serviceFeeRules, cart.fulfillmentType, subtotalCents);
  const taxCents = computeTaxCents(taxRules, subtotalCents, deliveryFeeCents);

  let discountCents = 0;
  let effectiveDeliveryFeeCents = deliveryFeeCents;
  if (cart.couponCode) {
    try {
      const validation = await validateCouponForRedemption(cart.restaurantId, cart.couponCode, subtotalCents, cart.customerId ?? undefined);
      if (validation.coupon.type === "FREE_DELIVERY") {
        effectiveDeliveryFeeCents = 0;
      } else {
        discountCents = validation.discountCents;
      }
    } catch {
      // An expired/invalid coupon at quote time simply stops applying —
      // it does not block checkout; placeOrder re-validates independently.
      discountCents = 0;
    }
  }

  const totalCents = Math.max(
    0,
    subtotalCents + taxCents + tipCents + effectiveDeliveryFeeCents + serviceFeeCents - discountCents,
  );

  return {
    eligible: true,
    resolvedFulfillmentMethod: routing.resolvedFulfillmentMethod,
    distanceMiles,
    subtotalCents,
    taxCents,
    tipCents,
    deliveryFeeCents: effectiveDeliveryFeeCents,
    serviceFeeCents,
    discountCents,
    totalCents,
  };
}
