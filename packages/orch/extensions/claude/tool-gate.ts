// What orch's PreToolUse hook does to one Claude tool call. It lives apart from the shim so a
// test can call it: the shim reads stdin and prints what this returns.
import { gatedPatterns, lockedCommandLine } from "orch/core/policy/command-gate.ts";
import { writeRootRefusal, type WriteRootGate } from "orch/core/policy/write-root.ts";
import { isRecord } from "orch/core/util.ts";
import type { JsonRecord } from "orch/core/types/core.ts";

/** Claude's Bash tool: its timeout is in ms, 2 minutes when unset, 10 minutes at most. */
const BASH_DEFAULT_TIMEOUT_MS = 120_000;
const BASH_MAX_TIMEOUT_MS = 600_000;

/** The settings the gate reads: the command rules and the lock wait. */
export type GateSettings = Parameters<typeof gatedPatterns>[0] & { readonly timeouts: { readonly lock_wait_ms: number } };

/** The Bash timeout with the lock wait added, so waiting for the lock never eats the command's own time. */
function bashTimeoutWithWait(timeout: unknown, lockWaitMs: number): number {
  const own = typeof timeout === "number" ? timeout : BASH_DEFAULT_TIMEOUT_MS;
  return Math.min(BASH_MAX_TIMEOUT_MS, own + lockWaitMs);
}

function hookOutput(decision: JsonRecord): JsonRecord {
  return { hookSpecificOutput: { hookEventName: "PreToolUse", ...decision } };
}

/** A locked or gated Bash command rewritten through `orch lock`. No permissionDecision: the
 *  user's own rules still judge the rewritten command. */
function lockedBash(input: JsonRecord, settings: GateSettings): JsonRecord | undefined {
  const toolInput = input.tool_input;
  if (input.tool_name !== "Bash" || !isRecord(toolInput) || typeof toolInput.command !== "string") return undefined;
  const wrapped = lockedCommandLine(toolInput.command, gatedPatterns(settings));
  if (wrapped === undefined) return undefined;
  const timeout = bashTimeoutWithWait(toolInput.timeout, settings.timeouts.lock_wait_ms);
  return hookOutput({ updatedInput: { ...toolInput, command: wrapped, timeout } });
}

/** What the hook prints for one tool call, or undefined to let the call run as it is. An agent
 *  with a write root is refused every call that is not a read or a write inside the root. */
export function preToolUse(input: JsonRecord, settings: GateSettings, writeRoot: WriteRootGate | null): JsonRecord | undefined {
  if (writeRoot !== null) {
    const refusal = writeRootRefusal(writeRoot, input.tool_name, input.tool_input);
    if (refusal !== undefined) return hookOutput({ permissionDecision: "deny", permissionDecisionReason: refusal });
  }
  return lockedBash(input, settings);
}
