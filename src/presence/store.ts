import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { PRESENCE_SCHEMA, RESULT_FILE, STATUS_FILE } from "./schema.ts";
// The presence protocol is orch's, and src/presence/ owns it (Rule 10). The
// directory layout is defined there and imported here — a second copy in the
// store is how a writer and a reader end up disagreeing about where a record
// lives. The dependency runs only this way: presence/ stays standalone so the
// harness shims can bundle it without dragging in the sqlite graph.
import { orchDir, presenceAgentDir, presenceRoot } from "./writer.ts";
import { deleteSpawnedRecord, insertSpawnedRecord, selectSpawnedRecords, type SpawnedRecord } from "../store/spawned-rows.ts";
import { deleteOwner, setOwner } from "../store/ownership-rows.ts";
import { openStore } from "../store/connection.ts";
import { isRecord, pidAlive, readJsonFile } from "../util.ts";
import type { AdapterId } from "../adapters/adapter.ts";
import type { BackendId } from "../backends/backend.ts";

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
    && !("workspace" in value)
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

export function recordSpawned(
  pane: string,
  metadata: { adapter?: AdapterId; model?: string; backend?: BackendId; workspace?: string; handle?: string; name?: string; cwd?: string; worktree?: string; branch?: string; owner?: string; spawnedBy?: string; spawnedByLabel?: string } = {},
): void {
  // Never swallowed. An agent whose registry row is missing has no recorded
  // backend handle, so nothing can ever address it again: status shows nothing,
  // dispatch says "no target matches", and the pane is a ghost on screen. A
  // spawn that cannot register must fail at the spawn, not hours later.
  const record: SpawnedRecord = { pane, ts: new Date().toISOString() };
  if (metadata.adapter !== undefined) record.adapter = metadata.adapter;
  if (metadata.name !== undefined) record.name = metadata.name;
  if (metadata.model !== undefined) record.model = metadata.model;
  if (metadata.backend !== undefined) record.backend = metadata.backend;
  if (metadata.workspace !== undefined) record.workspace = metadata.workspace;
  if (metadata.handle !== undefined) record.handle = metadata.handle;
  if (metadata.cwd !== undefined) record.cwd = metadata.cwd;
  if (metadata.worktree !== undefined) record.worktree = metadata.worktree;
  if (metadata.branch !== undefined) record.branch = metadata.branch;
  if (metadata.owner !== undefined) record.owner = metadata.owner;
  if (metadata.spawnedBy !== undefined) record.spawnedBy = metadata.spawnedBy;
  if (metadata.spawnedByLabel !== undefined) record.spawnedByLabel = metadata.spawnedByLabel;
  insertSpawnedRecord(orchDir(), record);
  if (metadata.owner) setOwner(orchDir(), pane, metadata.owner);
}

export function spawnedRecords(): Map<string, SpawnedRecord> {
  const records = new Map<string, SpawnedRecord>();
  try {
    for (const record of selectSpawnedRecords(orchDir())) records.set(record.pane, record);
  } catch {}
  return records;
}

export function reapSpawnedRecord(key: string, root = orchDir(), options: { agentId?: string } = {}): void {
  if (options.agentId !== undefined) {
    // Retention uses this same owning reap path for the normalized agent hub;
    // deleting it cascades every satellite while the registry and presence
    // cleanup below handles the legacy-keyed records.
    openStore(root).query("DELETE FROM agents WHERE id = ?").run(options.agentId);
  }
  try { deleteSpawnedRecord(root, key); } catch {}
  try { deleteOwner(root, key); } catch {}
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
