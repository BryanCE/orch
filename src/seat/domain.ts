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

/** orch agent states as the daemon publishes them. */
type PackAgentState =
  | "spawning"
  | "working"
  | "blocked"
  | "asking"
  | "done"
  | "idle"
  | "error"
  | "aborted"
  | "exited";

/** States that should pull the operator's attention the moment they are entered. */
export const ALERT_STATES: ReadonlySet<string> = new Set(["blocked", "asking", "error", "aborted"]);

/** States meaning the agent is not currently running a turn. */
export const SETTLED_STATES: ReadonlySet<string> = new Set(["done", "idle", "error", "aborted", "exited"]);

/** One transition as orch's daemon publishes it; the pack's only event source. */
export interface PackTransition {
  readonly key: string;
  readonly name: string;
  readonly oldState: string;
  readonly newState: string;
  readonly model: string | null;
  readonly task?: string;
  readonly lastError?: string;
  readonly cost?: number;
  readonly ts?: string;
  readonly seq?: number;
  readonly dispatchId?: string;
  readonly spawnedBy?: string;
}

/** Presence-store facts that events do not carry, refreshed on read. */
export interface PackEnrichment {
  readonly sessionPath?: string;
  readonly presenceDir?: string;
  readonly cwd?: string;
  readonly thinking?: string;
  readonly usage?: { readonly tokens?: number; readonly contextWindow?: number; readonly percent?: number };
  readonly lastText?: string;
  readonly asking?: { readonly question: string; readonly id: string };
}

/**
 * The manager folds `PackTransition`s into one snapshot per agent. This is
 * everything the status line and both TUI views read.
 */
export interface PackSnapshot {
  readonly key: string;
  readonly name: string;
  readonly state: string;
  readonly model: string | null;
  readonly task: string;
  readonly lastError?: string;
  readonly cost?: number;
  readonly dispatchId?: string;
  readonly createdAt: number;
  readonly lastTransitionAt: number;
  /** Presence facts, refreshed lazily; may lag the event stream. */
  readonly info: PackEnrichment;
}

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
