import { readFileSync } from "node:fs";
import * as path from "node:path";
import { CONTROL_FILE } from "../presence/schema.ts";
import { isRecord } from "../util.ts";

/**
 * The dispatcher's read side of the presence control-outcome record. A harness
 * applies a control command and writes what actually happened; orch blocks here
 * until that record carries its own request id, so a refused command is reported
 * as refused instead of being announced as applied.
 *
 * Harness-neutral by construction: this reads the presence file every harness
 * writes, and knows nothing about which one produced it.
 */

/** One harness-written control outcome, matched to a dispatcher request by id. */
export interface ControlOutcome {
  readonly id: string;
  readonly success: boolean;
  readonly error?: string;
}

function readOutcome(dir: string, id: string): ControlOutcome | undefined {
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path.join(dir, CONTROL_FILE), "utf8"));
  } catch {
    return undefined; // absent, partially written, or unreadable: keep waiting
  }
  if (!isRecord(parsed) || parsed.id !== id) return undefined;
  return {
    id,
    success: parsed.success === true,
    error: typeof parsed.error === "string" ? parsed.error : undefined,
  };
}

const POLL_MS = 100;

/**
 * Block until the agent records the outcome of control command `id`, then throw
 * on failure. A harness that never answers within `timeoutMs` is itself a
 * failure — silence is never reported as success.
 */
export async function awaitControlOutcome(dir: string, id: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const outcome = readOutcome(dir, id);
    if (outcome?.success) return;
    if (outcome) throw new Error(outcome.error ?? "agent refused the control command");
    if (Date.now() >= deadline) throw new Error(`agent did not record an outcome within ${timeoutMs}ms`);
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
  }
}
