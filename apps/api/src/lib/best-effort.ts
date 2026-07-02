/**
 * Runs a side effect without ever letting it throw to the caller — used
 * once a money-moving or state-changing operation has already
 * irrevocably succeeded, so a downstream failure (a notification send, an
 * event write, a non-critical state transition) can never cause the
 * caller to throw and trigger an idempotency-key retry against work
 * that's already done (Sprint 07.6 C-2/C-15, Sprint 07.7 H-12). Shared
 * across checkout.service.ts and orders.service.ts so this pattern has a
 * single implementation, reducing the chance the same mistake gets
 * reintroduced at a future call site.
 */
export async function bestEffort(action: () => Promise<unknown>): Promise<void> {
  try {
    await action();
  } catch (err) {
    console.error("bestEffort: a best-effort post-success step failed", err);
  }
}
