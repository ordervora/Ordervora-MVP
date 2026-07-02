import { describe, expect, it } from "vitest";
import { evaluateRouting, type RoutingInput } from "./smart-routing";

function baseInput(overrides: Partial<RoutingInput> = {}): RoutingInput {
  return {
    restaurantId: "r1",
    isOpen: true,
    kitchenAvailable: true,
    activeDriverCount: 0,
    deliveryConfig: {
      id: "dc1",
      restaurantId: "r1",
      isDeliveryEnabled: true,
      isPickupEnabled: true,
      isDineInEnabled: true,
      deliveryRadiusMiles: 10,
      maxDeliveryDistanceMiles: 25,
      minOrderCentsForDelivery: 2000,
      minOrderCentsForPickup: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never,
    deliveryZones: [],
    deliveryRules: [],
    distanceMiles: 3,
    subtotalCents: 3000,
    fulfillmentType: "DELIVERY",
    enabledPaymentMethodTypes: ["VISA"],
    ...overrides,
  };
}

describe("evaluateRouting", () => {
  it("is ineligible when the restaurant is closed", () => {
    const result = evaluateRouting(baseInput({ isOpen: false }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/closed/i);
  });

  it("is ineligible when the kitchen is not available", () => {
    const result = evaluateRouting(baseInput({ kitchenAvailable: false }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/paused/i);
  });

  it("is eligible for pickup when pickup is enabled and above the minimum", () => {
    const result = evaluateRouting(baseInput({ fulfillmentType: "PICKUP", subtotalCents: 100 }));
    expect(result.eligible).toBe(true);
    expect(result.resolvedFulfillmentMethod).toBe("PICKUP");
  });

  it("is ineligible for pickup when pickup is disabled", () => {
    const result = evaluateRouting(
      baseInput({ fulfillmentType: "PICKUP", deliveryConfig: { ...baseInput().deliveryConfig, isPickupEnabled: false } as never }),
    );
    expect(result.eligible).toBe(false);
  });

  it("is eligible for dine-in when enabled", () => {
    const result = evaluateRouting(baseInput({ fulfillmentType: "DINE_IN" }));
    expect(result.eligible).toBe(true);
  });

  it("is ineligible for dine-in when disabled", () => {
    const result = evaluateRouting(
      baseInput({ fulfillmentType: "DINE_IN", deliveryConfig: { ...baseInput().deliveryConfig, isDineInEnabled: false } as never }),
    );
    expect(result.eligible).toBe(false);
  });

  it("is ineligible for delivery when the platform-level delivery toggle is off", () => {
    const result = evaluateRouting(
      baseInput({ deliveryConfig: { ...baseInput().deliveryConfig, isDeliveryEnabled: false } as never }),
    );
    expect(result.eligible).toBe(false);
  });

  it("rejects delivery beyond maxDeliveryDistanceMiles before checking zones/rules at all", () => {
    const result = evaluateRouting(baseInput({ distanceMiles: 30 }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/outside our delivery area/i);
  });

  it("rejects delivery under the minimum order amount", () => {
    const result = evaluateRouting(baseInput({ subtotalCents: 500 }));
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/minimum order/i);
  });

  it("resolves via the simple radius mode when no zones/rules are configured", () => {
    const result = evaluateRouting(baseInput({ distanceMiles: 5 }));
    expect(result.eligible).toBe(true);
    expect(result.resolvedFulfillmentMethod).toBe("RESTAURANT_DRIVER");
  });

  it("rejects delivery outside the simple radius", () => {
    const result = evaluateRouting(baseInput({ distanceMiles: 15 }));
    expect(result.eligible).toBe(false);
  });

  it("resolves via DeliveryRule priority order when rules are configured, superseding the simple radius", () => {
    const rules = [
      {
        id: "rule-1",
        restaurantId: "r1",
        zoneId: null,
        minDistanceMiles: 0,
        maxDistanceMiles: 5,
        fulfillmentMethod: "RESTAURANT_DRIVER",
        priority: 0,
        fallbackToRuleId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "rule-2",
        restaurantId: "r1",
        zoneId: null,
        minDistanceMiles: 5,
        maxDistanceMiles: 15,
        fulfillmentMethod: "UBER_DIRECT",
        priority: 1,
        fallbackToRuleId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never;

    const near = evaluateRouting(baseInput({ distanceMiles: 3, deliveryRules: rules }));
    expect(near.resolvedFulfillmentMethod).toBe("RESTAURANT_DRIVER");

    const far = evaluateRouting(baseInput({ distanceMiles: 10, deliveryRules: rules }));
    expect(far.resolvedFulfillmentMethod).toBe("UBER_DIRECT");
  });

  it("falls back to fallbackToRuleId when the busy-driver concurrency limit is reached", () => {
    const rules = [
      {
        id: "primary",
        restaurantId: "r1",
        zoneId: null,
        minDistanceMiles: 0,
        maxDistanceMiles: 10,
        fulfillmentMethod: "RESTAURANT_DRIVER",
        priority: 0,
        fallbackToRuleId: "fallback",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "fallback",
        restaurantId: "r1",
        zoneId: null,
        minDistanceMiles: 0,
        maxDistanceMiles: 10,
        fulfillmentMethod: "LOCAL_COURIER",
        priority: 5,
        fallbackToRuleId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never;

    const result = evaluateRouting(
      baseInput({ distanceMiles: 3, deliveryRules: rules, activeDriverCount: 5, maxConcurrentDriverDeliveries: 5 }),
    );

    expect(result.eligible).toBe(true);
    expect(result.resolvedFulfillmentMethod).toBe("LOCAL_COURIER");
  });

  it("is ineligible when no rule matches the distance and there is no fallback", () => {
    const rules = [
      {
        id: "rule-1",
        restaurantId: "r1",
        zoneId: null,
        minDistanceMiles: 0,
        maxDistanceMiles: 2,
        fulfillmentMethod: "RESTAURANT_DRIVER",
        priority: 0,
        fallbackToRuleId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never;

    const result = evaluateRouting(baseInput({ distanceMiles: 8, deliveryRules: rules }));
    expect(result.eligible).toBe(false);
  });

  it("is ineligible when delivery is enabled but no zones/rules/radius are configured at all", () => {
    const result = evaluateRouting(
      baseInput({ deliveryConfig: { ...baseInput().deliveryConfig, deliveryRadiusMiles: null } as never }),
    );
    expect(result.eligible).toBe(false);
    expect(result.reason).toMatch(/not been configured/i);
  });
});
