/** The one `-n <count>` grammar: a safe whole number, or a usage error naming what was given. */

import { usageError } from "./usage.ts";
import type { Invocation } from "./spec.ts";

/** The `-n` count, or undefined when the flag is absent. */
export function readCount(invocation: Invocation): number | undefined {
  const count = invocation.flags.value("-n");
  if (count === undefined) return undefined;
  if (!/^\d+$/.test(count) || !Number.isSafeInteger(Number(count))) throw usageError(invocation, `-n needs a whole number, got "${count}"`);
  return Number(count);
}
