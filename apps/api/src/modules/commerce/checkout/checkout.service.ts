import type { Order, Prisma } from "@prisma/client";
import { prisma } from "../../../lib/prisma";
import { getCartWithItems } from "../cart/cart.service";
import { isItemOrderable } from "../menu-commerce/inventory.service";
import { authorizeOrderPayment, captureOrderPayment } from "../payments/orchestrator";
import { NoAvailableProviderError, PaymentMethodNotFoundError } from "../payments/payments.errors";
import { validateCouponForRedemption } from "../coupons/coupons.service";
import { CouponInvalidError, CouponNotFoundError } from "../coupons/coupons.errors";
import { emitOrderEvent, writeOrderEvent } from "../events/record-order-event";
import { assertValidOrderTransition } from "../orders/order-state-machine";
import { nextOrderNumber } from "../orders/order-number";
import { sendNewOrderStaffAlert, sendOrderConfirmation, sendPaymentFailedNotification } from "../notifications/notifications.service";
import {
  CheckoutIneligibleError,
  EmptyCartError,
  GuestInfoRequiredError,
  ItemUnavailableAtCheckoutError,
  PaymentFailedError,
  PriceDriftError,
} from "./checkout.errors";
import type { PlaceOrderInput } from "./checkout.validation";
import { computeCheckoutQuote } from "./quote.service";

const CASH_METHOD_TYPES = new Set(["CASH_ON_DELIVERY", "CASH_AT_PICKUP"]);

export interface PlaceOrderResult {
  order: Order;
}

/**
 * The order-placement orchestration engine (Sprint 07 spec §3 step 13,
 * §4). This is the sequential, money-handling core the Sprint 07 approval
 * required be built directly rather than delegated: it (a) re-validates
 * everything fresh against current data — never trusts a client-supplied
 * price, (b) creates the durable Order/OrderItem/Fulfillment rows in one
 * atomic transaction, (c) only THEN calls out to the payment provider
 * (which must reference an existing orderId), and (d) reacts to the
 * payment outcome with the correct state-machine transition.
 */
export async function placeOrder(cartId: string, restaurantId: string, input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const cart = await getCartWithItems(cartId);
  if (cart.restaurantId !== restaurantId) {
    throw new CheckoutIneligibleError("This cart does not belong to this restaurant");
  }
  if (cart.items.length === 0) {
    throw new EmptyCartError();
  }
  if (!cart.customerId && !input.guestEmail) {
    throw new GuestInfoRequiredError();
  }

  // Re-validate every item is still orderable and its base price hasn't
  // drifted since it was added to the cart — the one class of price
  // drift this checks (base MenuItem/variant price); modifier-option-
  // level drift detection is a documented known limitation.
  for (const item of cart.items) {
    const menuItem = await prisma.menuItem.findUnique({ where: { id: item.menuItemId } });
    if (!menuItem) {
      throw new ItemUnavailableAtCheckoutError("An item in your cart");
    }
    const inventory = await prisma.menuItemInventory.findUnique({ where: { menuItemId: menuItem.id } });
    if (!isItemOrderable(menuItem, inventory)) {
      throw new ItemUnavailableAtCheckoutError(menuItem.name);
    }
    let expectedPriceCents = menuItem.priceCents;
    if (item.variantId) {
      const variant = await prisma.menuItemVariant.findUnique({ where: { id: item.variantId } });
      expectedPriceCents += variant?.priceDeltaCents ?? 0;
    }
    const modifiersTotal = (item.modifiersSnapshot as { modifiers?: { priceDeltaCents: number }[] } | null)?.modifiers?.reduce(
      (sum, m) => sum + m.priceDeltaCents,
      0,
    ) ?? 0;
    if (expectedPriceCents + modifiersTotal !== item.unitPriceCents) {
      throw new PriceDriftError();
    }
  }

  const quote = await computeCheckoutQuote(cart, input.tipCents);
  if (!quote.eligible) {
    throw new CheckoutIneligibleError(quote.reason ?? "This order cannot be placed right now");
  }

  const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
  const staffAlertEmail = restaurant ? await resolveStaffAlertEmail(restaurantId) : undefined;

  // Coupon re-validated independently here (not trusting the quote's
  // best-effort pass) since redemption is only ever recorded on a
  // successful order.
  let couponId: string | undefined;
  if (cart.couponCode) {
    try {
      const validation = await validateCouponForRedemption(restaurantId, cart.couponCode, quote.subtotalCents, cart.customerId ?? undefined);
      couponId = validation.coupon.id;
    } catch (err) {
      if (err instanceof CouponInvalidError || err instanceof CouponNotFoundError) {
        throw new CheckoutIneligibleError(err.message);
      }
      throw err;
    }
  }

  // Step A — create the durable Order + OrderItem + Fulfillment rows
  // atomically, PENDING_PAYMENT/UNPAID/UNASSIGNED. Payment authorization
  // happens AFTER this commits, since PaymentAttempt.orderId is a real FK.
  const { order } = await prisma.$transaction(async (tx) => {
    let resolvedGuestCustomerId: string | undefined;
    if (!cart.customerId && input.guestEmail && input.guestName) {
      const guest = await tx.guestCustomer.create({
        data: { email: input.guestEmail, name: input.guestName, phone: input.guestPhone },
      });
      resolvedGuestCustomerId = guest.id;
    }

    const orderNumber = await nextOrderNumber(tx, restaurantId);
    const created = await tx.order.create({
      data: {
        orderNumber,
        restaurantId,
        customerId: cart.customerId,
        guestCustomerId: resolvedGuestCustomerId,
        cartId: cart.id,
        fulfillmentType: cart.fulfillmentType,
        source: "WEBSITE",
        tableId: cart.tableId,
        status: "PENDING_PAYMENT",
        paymentStatus: "UNPAID",
        fulfillmentStatus: "UNASSIGNED",
        subtotalCents: quote.subtotalCents,
        taxCents: quote.taxCents,
        tipCents: quote.tipCents,
        deliveryFeeCents: quote.deliveryFeeCents,
        serviceFeeCents: quote.serviceFeeCents,
        discountCents: quote.discountCents,
        totalCents: quote.totalCents,
        scheduledFor: cart.scheduledFor,
        deliveryAddressId: cart.deliveryAddressId,
        deliveryInstructions: input.deliveryInstructions,
        notes: input.notes,
      },
    });

    await tx.orderItem.createMany({
      data: cart.items.map((item) => ({
        orderId: created.id,
        menuItemId: item.menuItemId,
        nameSnapshot: "", // backfilled below (needs menuItem.name, fetched outside tx to keep this loop tx-light)
        variantNameSnapshot: null,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        modifiersSnapshot: item.modifiersSnapshot as Prisma.InputJsonValue,
        lineTotalCents: item.unitPriceCents * item.quantity,
      })),
    });

    await tx.fulfillment.create({
      data: { orderId: created.id, restaurantId, method: quote.resolvedFulfillmentMethod ?? "PICKUP", status: "UNASSIGNED" },
    });

    if (couponId) {
      await tx.couponRedemption.create({
        data: {
          couponId,
          orderId: created.id,
          customerId: cart.customerId,
          guestCustomerId: resolvedGuestCustomerId,
          discountAppliedCents: quote.discountCents,
        },
      });
    }

    await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });

    await writeOrderEvent({ orderId: created.id, restaurantId, type: "ORDER_CREATED" }, tx);

    return { order: created, guestCustomerId: resolvedGuestCustomerId };
  });

  // Backfill nameSnapshot now that OrderItems exist (kept out of the
  // transaction above to avoid an extra round trip per item inside it).
  await backfillOrderItemNames(order.id, cart.items.map((i) => i.menuItemId));

  emitOrderEvent({ orderId: order.id, restaurantId, type: "ORDER_CREATED" });

  const customerEmail = input.guestEmail ?? (cart.customerId ? (await prisma.customer.findUnique({ where: { id: cart.customerId } }))?.email : undefined);

  // Step C — payment.
  if (CASH_METHOD_TYPES.has(input.methodType)) {
    await confirmOrder(order.id, restaurantId);
  } else {
    if (!input.methodToken) {
      await failOrder(order.id, restaurantId);
      throw new PaymentFailedError("A payment method is required for this method type");
    }
    try {
      const { payment } = await authorizeOrderPayment({
        orderId: order.id,
        restaurantId,
        methodType: input.methodType,
        methodToken: input.methodToken,
        amountCents: quote.totalCents,
        currency: "usd",
      });
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "AUTHORIZED" } });
      await captureOrderPayment(payment.id, restaurantId);
      await prisma.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID" } });
      await writeOrderEvent({ orderId: order.id, restaurantId, type: "PAYMENT_CAPTURED" });
      emitOrderEvent({ orderId: order.id, restaurantId, type: "PAYMENT_CAPTURED" });
      await confirmOrder(order.id, restaurantId);
      await createSubLedgerTransactions(order.id, restaurantId, quote.tipCents, quote.serviceFeeCents);
    } catch (err) {
      await failOrder(order.id, restaurantId);
      if (customerEmail) {
        await sendPaymentFailedNotification(order.id, restaurantId, customerEmail, order.orderNumber);
      }
      if (err instanceof NoAvailableProviderError || err instanceof PaymentMethodNotFoundError) {
        throw new PaymentFailedError(err.message);
      }
      throw err;
    }
  }

  if (customerEmail) {
    await sendOrderConfirmation(order.id, restaurantId, customerEmail, order.orderNumber, order.totalCents);
  }
  if (staffAlertEmail) {
    await sendNewOrderStaffAlert(order.id, restaurantId, staffAlertEmail, order.orderNumber);
  }

  const finalOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
  return { order: finalOrder };
}

async function backfillOrderItemNames(orderId: string, menuItemIds: string[]): Promise<void> {
  const menuItems = await prisma.menuItem.findMany({ where: { id: { in: menuItemIds } } });
  const byId = new Map(menuItems.map((m) => [m.id, m.name]));
  const orderItems = await prisma.orderItem.findMany({ where: { orderId } });
  await Promise.all(
    orderItems.map((oi) =>
      prisma.orderItem.update({ where: { id: oi.id }, data: { nameSnapshot: byId.get(oi.menuItemId) ?? "Item" } }),
    ),
  );
}

async function confirmOrder(orderId: string, restaurantId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  assertValidOrderTransition(order.status, "CONFIRMED");
  await prisma.order.update({ where: { id: orderId }, data: { status: "CONFIRMED", confirmedAt: new Date() } });
  await writeOrderEvent({ orderId, restaurantId, type: "ORDER_CONFIRMED" });
  await prisma.orderTimeline.create({ data: { orderId, milestone: "CONFIRMED" } });
  emitOrderEvent({ orderId, restaurantId, type: "ORDER_CONFIRMED" });
}

async function failOrder(orderId: string, restaurantId: string): Promise<void> {
  const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status !== "PENDING_PAYMENT") return;
  assertValidOrderTransition(order.status, "FAILED");
  await prisma.order.update({ where: { id: orderId }, data: { status: "FAILED", paymentStatus: "FAILED" } });
  await writeOrderEvent({ orderId, restaurantId, type: "PAYMENT_FAILED" });
  emitOrderEvent({ orderId, restaurantId, type: "PAYMENT_FAILED" });
}

async function createSubLedgerTransactions(orderId: string, restaurantId: string, tipCents: number, serviceFeeCents: number): Promise<void> {
  const rows: { orderId: string; restaurantId: string; type: "TIP" | "SERVICE_FEE"; amountCents: number }[] = [];
  if (tipCents > 0) rows.push({ orderId, restaurantId, type: "TIP", amountCents: tipCents });
  if (serviceFeeCents > 0) rows.push({ orderId, restaurantId, type: "SERVICE_FEE", amountCents: serviceFeeCents });
  if (rows.length > 0) {
    await prisma.transaction.createMany({ data: rows });
  }
}

async function resolveStaffAlertEmail(restaurantId: string): Promise<string | undefined> {
  const owner = await prisma.user.findFirst({ where: { ownedRestaurant: { id: restaurantId } } });
  return owner?.email;
}
