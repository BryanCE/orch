import { errorMessage } from "./util.ts";

/**
 * One retry policy for every flaky IO path in orch. Older and loaded machines fail these
 * operations on TIMING, not on being wrong, so each reattempt waits longer than the last.
 *
 * Only ever wrap an operation that is safe to run twice. A request that already reached its
 * server and merely answered late is NOT safe — reattempting `spawn-detached` on a slow box
 * launches a second agent.
 */
export interface RetryPolicy {
  attempts: number;
  delayMs: number;
  /** Multiplies the wait after each failed attempt. */
  backoff: number;
}

export const DEFAULT_RETRY: RetryPolicy = { attempts: 3, delayMs: 250, backoff: 3 };

function waitMs(policy: RetryPolicy, attempt: number): number {
  return policy.delayMs * policy.backoff ** attempt;
}

function exhausted(label: string, policy: RetryPolicy, last: unknown): Error {
  return new Error(`${label} failed after ${policy.attempts} attempts: ${errorMessage(last)}`);
}

/** Block the thread for `ms`; the node-safe sync sleep, for retrying around execFileSync. */
function sleepBlocking(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** Reattempt a synchronous operation until it succeeds or the policy runs out, then throw. */
export function retryingSync<T>(
  label: string,
  operation: () => T,
  policy: RetryPolicy = DEFAULT_RETRY,
): T {
  let last: unknown;
  for (let attempt = 0; attempt < policy.attempts; attempt++) {
    try {
      return operation();
    } catch (error: unknown) {
      last = error;
      if (attempt < policy.attempts - 1) sleepBlocking(waitMs(policy, attempt));
    }
  }
  throw exhausted(label, policy, last);
}
