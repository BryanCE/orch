import type { AdapterId } from "./adapter.ts";
import type { AgentState } from "../adapters/adapter.ts";
import type { BackendId } from "./backend.ts";
import type { JsonRecord } from "./core.ts";
import type { AgentStatusRow } from "../store/status-rows.ts";

export interface PresenceEntry {
  key: string;
  status: AgentStatusRow | null;
  result: string | null;
  alive: boolean;
}

/**
 * What a caller may state about an agent orch is registering or adopting.
 *
 * A1: the old `spawned` table welded identity, provenance, ownership and
 * environment into one wide row whose primary key was the PANE, so moving an
 * agent minted a new identity. These are the same facts as an argument list,
 * fanned out to the table that owns each one; nothing stores them together.
 * Reads go through {@link AgentView}, never back through a flat row.
 */
export interface AgentFacts {
  /** Harness the agent runs (`agents.harness_id`). */
  adapter?: AdapterId;
  /** Tuning — survives a move, so never environment. */
  model?: string;
  /** Environment: the plexer the agent is in. */
  backend?: BackendId;
  /** Environment: orch's own grouping. */
  space?: string;
  /** Environment: the plexer's shortcut to it. An agent without one is an agent
   *  without a shortcut, never one orch cannot reach. */
  handle?: string;
  name?: string;
  cwd?: string;
  worktree?: string;
  branch?: string;
  /** Ownership: the orch to lease it to. A lease, never a second id space. */
  owner?: string;
  /** Provenance: the agent that spawned it. Immutable once written. */
  spawnedBy?: string;
  /** Ignored: a spawner's label is READ from the spawner, never copied here. */
  spawnedByLabel?: string;
}

/** A presence protocol record. Domain name for the shared JSON record shape. */
export type PresenceRecord = JsonRecord;

export interface LaunchEnvFacts {
  label: string | null;
  spawnedBy: string | null;
  spawnedByLabel: string | null;
  worktree: string | null;
  branch: string | null;
  tabLabel: string | null;
}

/**
 * What a harness reports about its own current state, over the daemon socket.
 * A PATCH: an absent field keeps the stored value, `null` clears it. Instants
 * are epoch millis (Rule 11). Identity, provenance, environment and tuning
 * are never in here; orch records those itself.
 */
export interface StatusPatch {
  state?: AgentState;
  lastError?: string | null;
  model?: { provider: string; id: string } | null;
  thinking?: string | null;
  task?: string | null;
  dispatchId?: string | null;
  lastText?: string | null;
  currentFile?: string | null;
  filesTouched?: readonly string[] | null;
  tokens?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
  cost?: number | null;
  context?: { tokens: number; percent?: number | null } | null;
  turns?: number | null;
  sessionPath?: string | null;
  sessionId?: string | null;
  project?: string | null;
  extensionHash?: string | null;
  startedAt?: number | null;
  finishedAt?: number | null;
  blockedMessage?: string | null;
}

/** One settled turn, reported over the daemon socket. */
export interface ResultReport {
  text: string;
  dispatchId?: string | null;
  task?: string | null;
  model?: { provider: string; id: string } | null;
  thinking?: string | null;
  tokens?: { input: number; output: number; cacheRead: number; cacheWrite: number } | null;
  cost?: number | null;
  turns?: number | null;
  sessionPath?: string | null;
  finishedAt: number;
}
