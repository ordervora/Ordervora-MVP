import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { bestEffort } from "./best-effort";

describe("bestEffort (Sprint 07.7 H-12)", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("runs the action to completion when it succeeds", async () => {
    const action = vi.fn().mockResolvedValue(undefined);
    await bestEffort(action);
    expect(action).toHaveBeenCalledTimes(1);
  });

  it("catches and logs, never rethrows, regardless of the wrapped action's failure mode", async () => {
    const action = vi.fn().mockRejectedValue(new Error("boom"));
    await expect(bestEffort(action)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });

  it("catches a thrown non-Error value too", async () => {
    const action = vi.fn().mockRejectedValue("a plain string rejection");
    await expect(bestEffort(action)).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalled();
  });
});
