import { describe, expect, it, vi } from "vitest";
import { commerceEventBus } from "./event-bus";

describe("commerceEventBus", () => {
  it("delivers events to a handler registered for that type", async () => {
    const handler = vi.fn();
    commerceEventBus.on("ORDER_CREATED", handler);

    commerceEventBus.emit({ type: "ORDER_CREATED", restaurantId: "r1", orderId: "o1" });

    await vi.waitFor(() => expect(handler).toHaveBeenCalledWith({ type: "ORDER_CREATED", restaurantId: "r1", orderId: "o1" }));
  });

  it("delivers every event to a wildcard handler", async () => {
    const handler = vi.fn();
    commerceEventBus.on("*", handler);

    commerceEventBus.emit({ type: "ORDER_CONFIRMED", restaurantId: "r2", orderId: "o2" });

    await vi.waitFor(() => expect(handler).toHaveBeenCalled());
  });

  it("does not let a throwing handler affect other handlers", async () => {
    const okHandler = vi.fn();
    commerceEventBus.on("PAYMENT_FAILED", () => {
      throw new Error("boom");
    });
    commerceEventBus.on("PAYMENT_FAILED", okHandler);

    commerceEventBus.emit({ type: "PAYMENT_FAILED", restaurantId: "r3", orderId: "o3" });

    await vi.waitFor(() => expect(okHandler).toHaveBeenCalled());
  });

  it("the module's built-in debug-log subscriber receives every emitted event (Sprint 07.7 H-10 smoke test)", async () => {
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => undefined);

    commerceEventBus.emit({ type: "ORDER_READY", restaurantId: "r4", orderId: "o4" });

    await vi.waitFor(() =>
      expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining("ORDER_READY"), expect.objectContaining({ orderId: "o4", restaurantId: "r4" })),
    );

    debugSpy.mockRestore();
  });
});
