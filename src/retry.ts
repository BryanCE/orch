import { errorMessage, sleep } from "./util.ts";
import type { RetryPolicy } from "./types/core.ts";

const DEFAULT_RETRY: RetryPolicy = { attempts: 3, delayMs: 250, backoff: 3 };

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

/** Reattempt an asynchronous operation until it succeeds or the policy runs out, then throw. */
export async function retryingAsync<T>(
  label: string,
  operation: () => Promise<T>,
  policy: RetryPolicy = DEFAULT_RETRY,
): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < policy.attempts; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      last = error;
      if (policy.retryable !== undefined && !policy.retryable(error)) throw error;
      if (attempt < policy.attempts - 1) await sleep(waitMs(policy, attempt));
    }
  }
  throw exhausted(label, policy, last);
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
      if (policy.retryable !== undefined && !policy.retryable(error)) throw error;
      if (attempt < policy.attempts - 1) sleepBlocking(waitMs(policy, attempt));
    }
  }
  throw exhausted(label, policy, last);
}
