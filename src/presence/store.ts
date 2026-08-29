import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
import { PRESENCE_SCHEMA, RESULT_FILE, STATUS_FILE } from "./schema.ts";
// The presence protocol is orch's, and src/presence/ owns it (Rule 10). The
// directory layout is defined there and imported here — a second copy in the
// store is how a writer and a reader end up disagreeing about where a record
// lives. The dependency runs only this way: presence/ stays standalone so the
// harness shims can bundle it without dragging in the sqlite graph.
import { orchDir, presenceAgentDir, presenceRoot } from "./writer.ts";
import { liveAgentViews } from "../store/agent-view.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { eq } from "drizzle-orm";
import { orm } from "../store/connection.ts";
import { agents } from "../db/schema.ts";
import { isRecord, pidAlive, readJsonFile } from "../util.ts";
import type { AgentView } from "../types/store.ts";
import type { DeadPresenceReapResult, PresenceDescription, PresenceEntry, PresenceStatus } from "../types/presence.ts";

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
export function removePresenceAgentDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
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
 * Every agent that has NOT ended, indexed by its minted id.
 *
 * A1: this replaces the pane-keyed `spawned` scan. Identity is the minted id and
 * nothing else, and a presence key IS that id, so one index answers both "which
 * agent is this key" and "what has orch spawned" without a second id space.
 * Values are the composed {@link AgentView}: environment, tuning and the lease
 * are read from the tables that own them, never from a flat row.
 *
 * An ended agent is out because this index is the LIVE fleet — it is what
 * `close` removes an agent from. TASKS/01-agent-model.md §11 keeps the row and
 * its lease history after a close (only `reap` deletes them), so "is it still
 * in the fleet" has to be the ending, not the presence of a row. Reading
 * history is `agentViews`/`agentView`, which still see everything.
 */
export function spawnedRecords(root = orchDir()): Map<string, AgentView> {
  const index = new Map<string, AgentView>();
  // A store that does not exist yet is an empty fleet, not a crash: `orch
  // status` runs before anything has ever been spawned.
  try {
    for (const view of liveAgentViews(root)) index.set(view.id, view);
  } catch { /* nothing spawned yet */ }
  return index;
}

/** Reap one agent: the hub row (which cascades every satellite, lease and
 *  ending) and its presence directory. There is no second id space to clean. */
export function reapSpawnedRecord(key: string, root = orchDir(), options: { agentId?: string } = {}): void {
  const agentId = options.agentId ?? tryParseIdentity(key)?.id;
  if (agentId !== undefined) {
    try { orm(root).delete(agents).where(eq(agents.id, agentId)).run(); } catch {}
  }
  removePresenceAgentDir(presenceAgentDir(key, root));
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
/**
 * Remove every presence directory whose name is not a minted id.
 *
 * J4 — existing dirs are REAPED, not migrated. A pid inside such a directory is
 * not a reason to keep it: it is exactly why Rule 11's seven stale dirs with no
 * nameable owner survived. Whatever process that pid belongs to still has its
 * own presence under the id orch minted for it, or it has none and orch cannot
 * address it either way.
 */
function presenceDirectoryNames(root: string): string[] {
  try {
    return readdirSync(presenceDir(root));
  } catch (error: unknown) {
    if (isErrorCode(error, "ENOENT") || isErrorCode(error, "ENOTDIR")) return [];
    throw error;
  }
}

/**
 * Every presence directory whose name is NOT a minted id, with the pid it holds.
 *
 * `loadPresence` skips these — they are not presence — so doctor, which exists
 * to REPORT them, has to see them some other way. This is that way: the raw
 * directory names, read once, with no pretence that any of them names an agent.
 */
export function malformedPresenceDirs(root = orchDir()): { name: string; dir: string; alive: boolean }[] {
  const found: { name: string; dir: string; alive: boolean }[] = [];
  for (const name of presenceDirectoryNames(root)) {
    if (tryParseIdentity(name) !== null) continue;
    const dir = join(presenceDir(root), name);
    const status = readPresenceStatus(join(dir, STATUS_FILE));
    found.push({ name, dir, alive: pidAlive(status?.pid) });
  }
  return found;
}

function reapMalformedPresenceDirs(root: string): string[] {
  const removed: string[] = [];
  for (const entry of malformedPresenceDirs(root)) {
    removePresenceAgentDir(entry.dir);
    removed.push(entry.name);
  }
  return removed;
}

export function reapDeadPresenceDirs(root = orchDir(), olderThan?: Date): DeadPresenceReapResult {
  const removed: PresenceEntry[] = [];
  const failed: { entry: PresenceEntry; error: unknown }[] = [];
  const cutoffMs = olderThan?.getTime();
  reapMalformedPresenceDirs(root);
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
  for (const key of keys) {
    // J4/A1: a presence directory is named by the minted id and nothing else, so
    // a name that does not parse names NO agent - there is nothing to key the
    // four facts on. Rule 8: an old-shape record is malformed, never a second
    // shape to accept. It is reaped by `reapMalformedPresenceDirs`, not read.
    if (tryParseIdentity(key) === null) continue;
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
