import type { AdapterId } from "./adapter.ts";
import type { BackendId } from "./backend.ts";
import type { JsonRecord } from "./core.ts";

export interface PresenceStatus {
  /** Must equal PRESENCE_SCHEMA (src/presence/schema.ts); anything else is malformed. */
  schema: number;
  agent?: string;
  key?: string;
  paneId?: string | null;
  pid?: number;
  cwd?: string;
  /** Git worktree the launch isolated this agent into; absent when it shares the fleet's tree. */
  worktree?: string;
  /** Branch of that worktree. */
  branch?: string;
  state?: string;
  lastError?: string;
  model?: { provider?: string; id?: string };
  thinking?: string;
  task?: string;
  /** Id of the orch dispatch whose prompt the agent is running; absent on a
   *  human-typed run or a bridge that cannot attribute one (hook-based). */
  dispatchId?: string;
  lastText?: string;
  currentFile?: string;
  /** Files the agent's writing tools touched this run, when its bridge tracks them. */
  filesTouched?: string[];
  tokens?: { input?: number; output?: number; cacheRead?: number; cacheWrite?: number };
  cost?: number;
  context?: { tokens?: number; percent?: number };
  turns?: number;
  sessionPath?: string;
  sessionId?: string;
  startedAt?: string;
  finishedAt?: string;
  updatedAt?: string;
  extensionHash?: string;
  label?: string | null;
  /** Address of the session that spawned this agent (its presence key, else its
   *  governance token); absent for agents nothing spawned. */
  spawnedBy?: string;
  /** Human description of the spawner: "lead-1 (pi)", "claude session", "operator". */
  spawnedByLabel?: string;
  tabLabel?: string | null;
  asking?: { question: string; id: string; ts: string };
  blockedMessage?: string;
}

/** Safe, descriptive fields retained from every status.json, including records
 * that fail the live schema gate. This is intentionally not PresenceStatus:
 * callers can identify malformed dirs without ever treating them as live. */
export interface PresenceDescription {
  label?: string;
  cwd?: string;
  agent?: string;
  updatedAt?: string;
  finishedAt?: string;
}

export interface PresenceEntry {
  key: string;
  dir: string;
  /** Current-schema status only. Malformed or unstamped records are null. */
  status: PresenceStatus | null;
  /** Descriptive metadata from disk; never used to establish liveness. */
  description?: PresenceDescription;
  result: unknown;
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

export interface DeadPresenceReapResult {
  removed: PresenceEntry[];
  failed: { entry: PresenceEntry; error: unknown }[];
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
 * Exactly the fields `launchStamp` carries forward from a prior record. Stating
 * them means a caller holding a DECLARED status shape (an interface, which has no
 * index signature) passes it without a cast, AND the compiler checks that this
 * function only reads what it says it reads — which `Record<string, unknown>`
 * never could.
 */
export interface LaunchStampable {
  readonly label?: unknown;
  readonly spawnedBy?: unknown;
  readonly spawnedByLabel?: unknown;
  readonly worktree?: unknown;
  readonly branch?: unknown;
  readonly tabLabel?: unknown;
  readonly cost?: unknown;
  readonly tokens?: unknown;
  readonly turns?: unknown;
}
