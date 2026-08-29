import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { PRESENCE_SCHEMA, RESULT_FILE, STATUS_FILE } from "./schema.ts";
// The presence protocol is orch's, and src/presence/ owns it (Rule 10). The
// directory layout is defined there and imported here — a second copy in the
// store is how a writer and a reader end up disagreeing about where a record
// lives. The dependency runs only this way: presence/ stays standalone so the
// harness shims can bundle it without dragging in the sqlite graph.
import { orchDir, presenceAgentDir, presenceRoot } from "./writer.ts";
import { agentViews, environmentOf, holderOf, tuningOf, type AgentView } from "../store/agent-view.ts";
import { adoptLease } from "../store/lease-rows.ts";
import { agentById, ensureHarness, ensurePlexer, insertAgent, setWorktree } from "../store/agent-rows.ts";
import { setAgentPlexer, setHandle, setSpace, setTuning } from "../store/interval-rows.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { isAdapterId, type AdapterId } from "../adapters/adapter.ts";
import { isBackendId, type BackendId } from "../backends/backend.ts";
import { openStore } from "../store/connection.ts";
import { isRecord, pidAlive, readJsonFile } from "../util.ts";

export { orchDir, presenceAgentDir };

export function presenceDir(root = orchDir()): string {
  return presenceRoot(root);
}

/** What is wrong with the presence root, or null when it is usable. A file
 *  where the agents directory belongs holds no presence and can never receive
 *  any, which reads as an empty fleet unless a check names it. */
export function presenceRootFault(root = orchDir()): string | null {
  const dir = presenceDir(root);
  try {
    return statSync(dir).isDirectory() ? null : `${dir} is a file where the agents directory belongs`;
  } catch {
    return null;
  }
}

/** Serialized identity keys are already a single filesystem-safe segment
 *  (`<backend>~<workspace>~<handle>`, with `~ % : /` percent-escaped inside
 *  each part), so the presence directory name IS the key — no remapping. */
export function presenceKeyFromDirectoryName(name: string): string {
  return name;
}

export function removePresenceAgentDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

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

function presencePath(key: string, file: string): string {
  return join(presenceAgentDir(key), file);
}

export function readJSON<T = unknown>(file: string): T | null {
  const parsed = readJsonFile(file);
  return parsed === undefined ? null : parsed as T;
}

/** The one gate every presence status read passes through. A status.json is a
 *  live record only when it stamps the current PRESENCE_SCHEMA; anything else
 *  is malformed and reads as absent, exactly as src/doctor/presence.ts reports
 *  it. Malformed dirs stay on disk and keep enumerating so `orch doctor` can
 *  name them and `orch clean` can reap them — they just never surface as a
 *  live status, so one bad dir can never break the whole status view. */
function isPresenceStatus(value: unknown): value is PresenceStatus {
  // Placement is orch's, never the agent's to report (docs/reference/agent-ownership.md).
  // A record stamping the CURRENT schema that still carries it is a writer claiming to
  // know where it runs, which the registry alone answers — so it is malformed, not old.
  return isRecord(value)
    && value.schema === PRESENCE_SCHEMA
    && !("backend" in value)
    && !("space" in value)
    && !("handle" in value);
}

/** Keep only fields doctor may display when a status fails the schema gate. */
function describePresenceStatus(value: unknown): PresenceDescription {
  if (!isRecord(value)) return {};
  const description: PresenceDescription = {};
  if (typeof value.label === "string") description.label = value.label;
  if (typeof value.cwd === "string") description.cwd = value.cwd;
  if (typeof value.agent === "string") description.agent = value.agent;
  if (typeof value.updatedAt === "string") description.updatedAt = value.updatedAt;
  if (typeof value.finishedAt === "string") description.finishedAt = value.finishedAt;
  return description;
}

function isErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}

export function readPresenceStatus(file: string): PresenceStatus | null {
  // A predicate, not a cast: the schema check IS the narrowing, so the runtime
  // guard and the asserted type cannot drift apart.
  const status = readJSON<unknown>(file);
  return isPresenceStatus(status) ? status : null;
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

/** Make sure a space id exists before an agent can be placed in it. Spaces are
 *  orch's own grouping; a plexer's workspace name only ever seeds one. */
function ensureSpace(root: string, spaceId: string, now: number): void {
  openStore(root).query("INSERT OR IGNORE INTO spaces (id, name, created_by, created_at) VALUES (?, ?, NULL, ?)")
    .run(spaceId, spaceId, now);
}

/** Rule 11: an orchestrator IS an agent. A holder orch has never registered gets
 *  a row in the ONE agent table rather than a second id space beside it. */
function ensureOrchAgent(root: string, orchId: string, harnessId: string, now: number): void {
  if (agentById(root, orchId)) return;
  ensureHarness(root, harnessId, harnessId, now);
  insertAgent(root, { id: orchId, harnessId, cwd: process.cwd(), name: orchId, createdAt: now });
}

/**
 * Record the four facts for one agent orch has just launched or adopted.
 *
 * The key IS the minted id and carries nothing else (src/backends/identity.ts),
 * so every environment axis below comes from what the caller states — never
 * decoded out of the address. An axis the caller does not state stays absent.
 */
export function recordSpawned(key: string, metadata: AgentFacts = {}): void {
  const root = orchDir();
  // A target that is not an orch-minted identity names no agent: there is
  // nothing to key the four facts on, and inventing one would fork the agent.
  const identity = tryParseIdentity(key);
  if (!identity) return;
  const agentId = identity.id;
  const now = Date.now();
  const existing = agentById(root, agentId);
  if (!existing) {
    // An agent with no stated harness is one orch cannot run: refusing to invent
    // one is what keeps a half-registered row from becoming an unreachable ghost.
    if (metadata.adapter === undefined) return;
    ensureHarness(root, metadata.adapter, metadata.adapter, now);
    const spawner = metadata.spawnedBy !== undefined && agentById(root, metadata.spawnedBy) ? metadata.spawnedBy : null;
    insertAgent(root, {
      id: agentId,
      spawnedBy: spawner,
      harnessId: metadata.adapter,
      cwd: metadata.cwd ?? process.cwd(),
      name: metadata.name ?? agentId,
      createdAt: now,
    });
  }
  const environment = environmentOf(root, agentId);
  if (metadata.backend !== undefined && environment.plexer === null) {
    ensurePlexer(root, metadata.backend, metadata.backend, now);
    setAgentPlexer(root, agentId, metadata.backend);
  }
  if (metadata.handle !== undefined && environment.handle !== metadata.handle) {
    setHandle(root, agentId, now, metadata.handle);
  }
  if (metadata.space !== undefined && environment.space !== metadata.space) {
    ensureSpace(root, metadata.space, now);
    setSpace(root, agentId, now, metadata.space);
  }
  if (metadata.worktree !== undefined && metadata.branch !== undefined) {
    setWorktree(root, agentId, metadata.worktree, metadata.branch);
  }
  if (metadata.model !== undefined && tuningOf(root, agentId).model === null) {
    setTuning(root, agentId, now, { model: metadata.model });
  }
  // Ownership is a lease and nothing else. An agent never holds its own lease
  // (`agent_leases_not_self`), and re-stamping the holder it already has would
  // close and reopen a holding that never changed hands.
  if (metadata.owner !== undefined && metadata.owner !== agentId) {
    ensureOrchAgent(root, metadata.owner, metadata.adapter ?? existing?.harnessId ?? "orch", now);
    if (holderOf(root, agentId)?.orchId !== metadata.owner) {
      adoptLease(root, agentId, metadata.owner, now);
    }
  }
}

/**
 * Every agent the store knows, indexed by its minted id.
 *
 * A1: this replaces the pane-keyed `spawned` scan. Identity is the minted id and
 * nothing else, and a presence key IS that id, so one index answers both "which
 * agent is this key" and "what has orch spawned" without a second id space.
 * Values are the composed {@link AgentView}: environment, tuning and the lease
 * are read from the tables that own them, never from a flat row.
 */
export function spawnedRecords(root = orchDir()): Map<string, AgentView> {
  const index = new Map<string, AgentView>();
  // A store that does not exist yet is an empty fleet, not a crash: `orch
  // status` runs before anything has ever been spawned.
  try {
    for (const view of agentViews(root)) index.set(view.id, view);
  } catch { /* nothing spawned yet */ }
  return index;
}

/** Reap one agent: the hub row (which cascades every satellite, lease and
 *  ending) and its presence directory. There is no second id space to clean. */
export function reapSpawnedRecord(key: string, root = orchDir(), options: { agentId?: string } = {}): void {
  const agentId = options.agentId ?? tryParseIdentity(key)?.id;
  if (agentId !== undefined) {
    try { openStore(root).query("DELETE FROM agents WHERE id = ?").run(agentId); } catch {}
  }
  removePresenceAgentDir(presenceAgentDir(key, root));
}

export interface DeadPresenceReapResult {
  removed: PresenceEntry[];
  failed: { entry: PresenceEntry; error: unknown }[];
}

/** Return the newest valid orch timestamp recorded in an agent's presence files. */
function newestRecordedInstant(entry: PresenceEntry): number | null {
  const values: unknown[] = [];
  if (entry.status) values.push(entry.status.startedAt, entry.status.finishedAt, entry.status.updatedAt, entry.status.asking?.ts);
  if (isRecord(entry.result)) values.push(entry.result.startedAt, entry.result.finishedAt, entry.result.updatedAt);
  const instants = values
    .filter((value): value is string => typeof value === "string")
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value));
  return instants.length > 0 ? Math.max(...instants) : null;
}

/** Reap dead presence directories old enough for retention. This is the shared
 * path for daemon retention and `orch clean`; it also removes the agent rows. */
export function reapDeadPresenceDirs(root = orchDir(), olderThan?: Date): DeadPresenceReapResult {
  const removed: PresenceEntry[] = [];
  const failed: { entry: PresenceEntry; error: unknown }[] = [];
  const cutoffMs = olderThan?.getTime();
  for (const entry of loadPresence(root).values()) {
    if (entry.alive) continue;
    if (cutoffMs !== undefined) {
      // Filesystem mtimes are incidental (rewrites, copies, and extraction can
      // change them). Retention is based only on instants orch recorded.
      const recorded = newestRecordedInstant(entry);
      if (recorded !== null && recorded >= cutoffMs) continue;
    }
    try {
      reapSpawnedRecord(entry.key, root);
      removed.push(entry);
    } catch (error: unknown) {
      failed.push({ entry, error });
    }
  }
  return { removed, failed };
}

export function loadPresence(root = orchDir()): Map<string, PresenceEntry> {
  const presence = new Map<string, PresenceEntry>();
  let keys: string[];
  try {
    keys = readdirSync(presenceDir(root));
  } catch (error: unknown) {
    // An agents path that is missing, or is a file where a directory belongs,
    // holds no presence either way. Doctor reports the malformed path — it can
    // only do that if reading it returns empty instead of throwing.
    if (isErrorCode(error, "ENOENT") || isErrorCode(error, "ENOTDIR")) return presence;
    throw error;
  }
  for (const storedKey of keys) {
    const key = presenceKeyFromDirectoryName(storedKey);
    const dir = presenceAgentDir(key, root);
    try {
      if (!statSync(dir).isDirectory()) continue;
    } catch {
      continue;
    }
    const statusRecord = readJSON<unknown>(join(dir, STATUS_FILE));
    const status = isPresenceStatus(statusRecord) ? statusRecord : null;
    const description = describePresenceStatus(statusRecord);
    const result = readJSON(join(dir, RESULT_FILE));
    // Liveness is derived only from the gated status. Descriptive metadata is
    // deliberately separate, so malformed records can never enter live paths.
    presence.set(key, { key, dir, status, description, result, alive: pidAlive(status?.pid) });
  }
  return presence;
}

export function statusForPresence(presence: PresenceEntry): PresenceStatus | null {
  return readPresenceStatus(join(presence.dir, STATUS_FILE));
}

export function bridgeRegistered(pane: string): boolean {
  return readPresenceStatus(presencePath(pane, STATUS_FILE)) !== null;
}
