/**
 * Domain model for orch's pi-orchestrator integration: the pack as one pi
 * session sees it when that session is the MAIN harness driving orch.
 *
 * Adapted from Ben Davis's subagents extension (davis7dotsh/my-pi-setup,
 * extensions/subagents/src/domain.ts): the same normalized-event → folded
 * snapshot shape, but the events are orch daemon transitions and the agents
 * are orch-owned panes, not in-process subagent runs.
 */
import { Data } from "effect";
import type { PackEnrichment, PackSnapshot, PackTransition } from "../types/seat.ts";

/** States that should pull the operator's attention the moment they are entered. */
export const ALERT_STATES: ReadonlySet<string> = new Set(["blocked", "asking", "error", "aborted"]);

/** States meaning the agent is not currently running a turn. */
export const SETTLED_STATES: ReadonlySet<string> = new Set(["done", "idle", "error", "aborted", "exited"]);

export function formatElapsed(snapshot: PackSnapshot): string {
  const totalSeconds = Math.max(0, Math.round((Date.now() - snapshot.lastTransitionAt) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}m${seconds.toString().padStart(2, "0")}s` : `${seconds}s`;
}

// --- Errors -------------------------------------------------------------------

export class PackSendError extends Data.TaggedError("PackSendError")<{
  readonly message: string;
}> {}

export class PackAbortError extends Data.TaggedError("PackAbortError")<{
  readonly message: string;
}> {}
