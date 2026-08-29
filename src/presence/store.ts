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
import { serializeIdentity, tryParseIdentity } from "../backends/identity.ts";
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
 * One agent as the pane-keyed callers still spell it, COMPOSED at read time from
 * the four facts (src/store/agent-view.ts) — never stored in this shape.
 *
 * A1: the old `spawned` table welded identity, provenance, ownership and
 * environment into one wide row whose primary key was the pane, so moving an
 * agent minted a new identity. This is that row's obituary: a projection with
 * no table behind it, which every caller migrates off onto {@link AgentView}.
 */
export interface AgentRecord {
  /** The serialized identity key, recomposed from id + environment. */
  pane: string;
  ts?: number;
  adapter?: AdapterId;
  model?: string;
  backend?: BackendId;
  space?: string;
  handle?: string;
  name?: string;
  cwd?: string;
  worktree?: string;
  branch?: string;
  /** The live lease holder. Ownership is a lease, never a second id space. */
  owner?: string;
  spawnedBy?: string;
  spawnedByLabel?: string;
}

/** What a caller may state about an agent it is registering or adopting. */
export type AgentRecordInput = Omit<AgentRecord, "pane" | "ts">;

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
 * Identity is the minted id inside the key and nothing else; the key's other
 * two segments are LEGACY environment welded into it at mint time, so they are
 * decomposed into the environment satellites here and never read back out of
 * the key again.
 */
export function recordSpawned(pane: string, metadata: AgentRecordInput = {}): void {
  const root = orchDir();
  // A target that is not an orch-minted identity names no agent: there is
  // nothing to key the four facts on, and inventing one would fork the agent.
  const identity = tryParseIdentity(pane);
  if (!identity) return;
  const now = Date.now();
  const harnessId = metadata.adapter ?? identity.backend;
  const plexerId = metadata.backend ?? identity.backend;
  const spaceId = metadata.space ?? identity.workspace;
  ensureHarness(root, harnessId, harnessId, now);
  ensurePlexer(root, plexerId, plexerId, now);
  if (!agentById(root, identity.id)) {
    const spawner = metadata.spawnedBy && agentById(root, metadata.spawnedBy) ? metadata.spawnedBy : null;
    insertAgent(root, {
      id: identity.id,
      spawnedBy: spawner,
      harnessId,
      cwd: metadata.cwd ?? process.cwd(),
      name: metadata.name ?? pane,
      createdAt: now,
    });
  }
  const environment = environmentOf(root, identity.id);
  if (environment.plexer === null) setAgentPlexer(root, identity.id, plexerId);
  if (metadata.handle !== undefined && environment.handle !== metadata.handle) {
    setHandle(root, identity.id, now, metadata.handle);
  }
  if (environment.space !== spaceId) {
    ensureSpace(root, spaceId, now);
    setSpace(root, identity.id, now, spaceId);
  }
  if (metadata.worktree !== undefined && metadata.branch !== undefined) {
    setWorktree(root, identity.id, metadata.worktree, metadata.branch);
  }
  if (metadata.model !== undefined && tuningOf(root, identity.id).model === null) {
    setTuning(root, identity.id, now, { model: metadata.model });
  }
  // Ownership is a lease and nothing else. An agent never holds its own lease
  // (`agent_leases_not_self`), and re-stamping the holder it already has would
  // close and reopen a holding that never changed hands.
  if (metadata.owner !== undefined && metadata.owner !== identity.id) {
    ensureOrchAgent(root, metadata.owner, harnessId, now);
    if (holderOf(root, identity.id)?.orchId !== metadata.owner) {
      adoptLease(root, identity.id, metadata.owner, now);
    }
  }
}

/** Compose one legacy record, or null for an agent that has no serializable key
 *  — a driving session orch registered through `hello` was never in the pane
 *  registry either, and inventing a key for it would mint a second identity. */
function projectAgentRecord(view: AgentView): AgentRecord | null {
  const { plexer, space, handle, worktree, branch } = view.environment;
  if (plexer === null || space === null) return null;
  const record: AgentRecord = {
    pane: serializeIdentity({ backend: plexer, workspace: space, id: view.id }),
    ts: view.createdAt,
    space,
    name: view.name,
    cwd: view.cwd,
  };
  if (isAdapterId(view.harnessId)) record.adapter = view.harnessId;
  if (isBackendId(plexer)) record.backend = plexer;
  if (handle !== null) record.handle = handle;
  if (worktree !== null) record.worktree = worktree;
  if (branch !== null) record.branch = branch;
  if (view.tuning.model !== null) record.model = view.tuning.model;
  if (view.heldBy !== null) record.owner = view.heldBy.orchId;
  if (view.spawnedBy !== null) record.spawnedBy = view.spawnedBy;
  return record;
}

export function spawnedRecords(): Map<string, AgentRecord> {
  const records = new Map<string, AgentRecord>();
  try {
    const root = orchDir();
    for (const view of agentViews(root)) {
      const record = projectAgentRecord(view);
      if (!record) continue;
      // Provenance names the spawner; its LABEL is the spawner's own name, read
      // from that agent — never a second copy stored beside the child.
      if (view.spawnedBy !== null) {
        const spawner = agentById(root, view.spawnedBy);
        if (spawner) record.spawnedByLabel = spawner.name;
      }
      records.set(record.pane, record);
    }
  } catch {}
  return records;
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
 * path for daemon retention and `orch clean`; it also removes spawned and owner rows. */
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
