import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
// The presence protocol is orch's, and src/presence/ owns it (Rule 10). The
// directory layout is defined there and imported here — a second copy in the
// store is how a writer and a reader end up disagreeing about where a record
// lives. The dependency runs only this way: presence/ stays standalone so the
// harness shims can bundle it without dragging in the sqlite graph.
import { presenceRoot } from "./history.ts";
import { agentView, agentViewIndex, agentViews, liveViews, onAgentRefreshed, refreshAgent } from "../store/agent-view.ts";
import { isAgentId } from "../backends/identity.ts";
import { eq, isNotNull } from "drizzle-orm";
import { orm, registerMemoReset } from "../store/connection.ts";
import { closeOutboxForTarget, selectOpenOutboxTargets } from "../store/outbox-rows.ts";
import { currentProcess, currentProcesses, type ProcessRow } from "../store/interval-rows.ts";
import { recordedInstanceIsLive } from "../process-identity.ts";
import { agents } from "../db/schema.ts";
import { mergeAgentStatus, selectAgentStatuses, type AgentStatusRow } from "../store/status-rows.ts";
import { latestResultTexts, onRunUpserted, settledDispatchIds } from "../store/run-rows.ts";
import type { AgentView } from "../types/store.ts";
import type { OrchDir } from "../types/core.ts";
import type { PresenceEntry, StatusPatch } from "../types/presence.ts";

export function presenceDir(root: OrchDir): string {
  return presenceRoot(root);
}

/** What is wrong with the presence root, or null when it is usable. A file
 *  where the agents directory belongs holds no presence and can never receive
 *  any, which reads as an empty fleet unless a check names it. */
export function presenceRootFault(root: OrchDir): string | null {
  const dir = presenceDir(root);
  try {
    return statSync(dir).isDirectory() ? null : `${dir} is a file where the agents directory belongs`;
  } catch {
    return null;
  }
}

/** Presence directories are named by the bare minted id, so the directory
 *  name IS the identity — no remapping. */
export function removePresenceAgentDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

function isErrorCode(error: unknown, code: string): boolean {
  return error instanceof Error && "code" in error && error.code === code;
}



/**
 * Every agent that has NOT ended, indexed by its minted id.
 *
 * This replaces the pane-keyed `spawned` scan. Identity is the minted id and
 * nothing else, and a presence key IS that id, so one index answers both "which
 * agent is this key" and "what has orch spawned" without a second id space.
 * Values are the composed {@link AgentView}: environment, tuning and the lease
 * are read from the tables that own them, never from a flat row.
 *
 * An ended agent is out because this index is the LIVE fleet — it is what
 * `close` removes an agent from the live fleet but keeps the row and its lease
 * history after a close (only `reap` deletes them), so "is it still
 * in the fleet" has to be the ending, not the presence of a row. Reading
 * history is `agentViews`/`agentView`, which still see everything.
 */
export function spawnedRecords(root: OrchDir): Map<string, AgentView> {
  return liveViews(agentViewIndex(root));
}

/** Delete one agent's hub row, which cascades every satellite, lease and
 *  ending, and close its open writes: a reaped agent reads nothing, so a write
 *  left open would retry on every drain tick forever. Its JSONL history under
 *  the presence directory is untouched; that ages out on its own. */
export function reapAgentRecord(agentId: string, root: OrchDir): void {
  orm(root).delete(agents).where(eq(agents.id, agentId)).run();
  refreshAgent(root, agentId);
  closeOutboxForTarget(root, agentId);
}

/** A row that another row still points at (a task it enqueued, a lease it held)
 *  cannot go yet. sqlite says so through this one message, which drizzle wraps
 *  as the cause of its own query error. */
function isForeignKeyRefusal(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message.includes("FOREIGN KEY constraint failed")) return true;
  return isForeignKeyRefusal(error.cause);
}

/** Every agent still named as a spawner by a remaining row. `agents.spawned_by`
 *  has no ON DELETE CASCADE, so a parent goes only after its children. */
function spawnerIds(root: OrchDir): Set<string> {
  return new Set(orm(root).selectDistinct({ id: agents.spawnedBy }).from(agents)
    .where(isNotNull(agents.spawnedBy)).all().flatMap((row) => row.id === null ? [] : [row.id]));
}

/** Delete the rows of every agent whose process is gone, children before
 *  parents. An agent a remaining row still points at stays for a later sweep;
 *  that is a reference holding, never a failure. Answers with the ids removed. */
export function reapDeadAgentRecords(root: OrchDir): string[] {
  const removed: string[] = [];
  let dead = [...loadPresence(root).values()].filter((entry) => !entry.alive).map((entry) => entry.key);
  while (dead.length > 0) {
    const referenced = spawnerIds(root);
    const leaves = dead.filter((id) => !referenced.has(id));
    if (leaves.length === 0) break;
    for (const id of leaves) {
      try {
        reapAgentRecord(id, root);
        removed.push(id);
      } catch (error: unknown) {
        if (!isForeignKeyRefusal(error)) throw error;
      }
    }
    dead = dead.filter((id) => !leaves.includes(id));
  }
  return removed;
}

/** Close every open write whose target has no live presence, answering with how
 *  many rows closed. The daemon retries an open write on every drain tick; a
 *  target that is dead, or whose directory is already gone, never acks one. */
export function closeOutboxForDeadTargets(root: OrchDir): number {
  const presence = loadPresence(root);
  let closed = 0;
  for (const target of selectOpenOutboxTargets(root)) {
    if (presence.get(target)?.alive) continue;
    closed += closeOutboxForTarget(root, target);
  }
  return closed;
}

function presenceDirectoryNames(root: OrchDir): string[] {
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
export function malformedPresenceDirs(root: OrchDir): { name: string; dir: string }[] {
  const found: { name: string; dir: string }[] = [];
  for (const name of presenceDirectoryNames(root)) {
    if (isAgentId(name)) continue;
    found.push({ name, dir: join(presenceDir(root), name) });
  }
  return found;
}

/**
 * Remove every presence directory whose name is not a minted id, answering with
 * the names removed.
 *
 * J4 — existing dirs are REAPED, not migrated. A pid inside such a directory is
 * not a reason to keep it: it is exactly why Rule 11's seven stale dirs with no
 * nameable owner survived. Whatever process that pid belongs to still has its
 * own presence under the id orch minted for it, or it has none and orch cannot
 * address it either way.
 */
export function reapMalformedPresenceDirs(root: OrchDir): string[] {
  const removed: string[] = [];
  for (const entry of malformedPresenceDirs(root)) {
    removePresenceAgentDir(entry.dir);
    removed.push(entry.name);
  }
  return removed;
}

/** The instant of the last append into a history directory. The JSONL files are
 *  append-only, so the newest file mtime is the agent's last recorded activity. */
function lastWriteMs(dir: string): number {
  let latest = statSync(dir).mtimeMs;
  for (const name of readdirSync(dir)) latest = Math.max(latest, statSync(join(dir, name)).mtimeMs);
  return latest;
}

/** Remove the JSONL history of every agent that is not live, once its last
 *  write is older than the cutoff. A live agent's directory is never touched.
 *  A directory that names no agent is not history and goes at any age. */
export function reapExpiredPresenceDirs(root: OrchDir, olderThan: Date): string[] {
  const removed = reapMalformedPresenceDirs(root);
  const live = new Set([...loadPresence(root).values()].filter((entry) => entry.alive).map((entry) => entry.key));
  for (const name of presenceDirectoryNames(root)) {
    if (live.has(name)) continue;
    const dir = join(presenceDir(root), name);
    if (lastWriteMs(dir) >= olderThan.getTime()) continue;
    removePresenceAgentDir(dir);
    removed.push(name);
  }
  return removed;
}

interface HeldPresence {
  readonly statuses: Map<string, AgentStatusRow>;
  readonly results: Map<string, string>;
  readonly settled: Set<string>;
  readonly processes: Map<string, ProcessRow>;
  readonly alive: Map<string, boolean>;
}

const held = new Map<OrchDir, HeldPresence>();
registerMemoReset(() => held.clear());

function heldPresence(root: OrchDir): HeldPresence {
  const existing = held.get(root);
  if (existing) return existing;
  const processes = currentProcesses(root);
  const alive = new Map<string, boolean>();
  for (const [agentId, process] of processes) alive.set(agentId, recordedInstanceIsLive(process.pid, process.startToken));
  const presence: HeldPresence = {
    statuses: new Map(selectAgentStatuses(root).map((row) => [row.agentId, row])),
    results: latestResultTexts(root),
    settled: settledDispatchIds(root),
    processes,
    alive,
  };
  held.set(root, presence);
  return presence;
}

function entryFor(view: AgentView, current: HeldPresence): PresenceEntry {
  return {
    key: view.id,
    status: current.statuses.get(view.id) ?? null,
    result: current.results.get(view.id) ?? null,
    alive: view.endedAt === null && current.alive.get(view.id) === true,
  };
}

export function loadPresence(root: OrchDir): ReadonlyMap<string, PresenceEntry> {
  const current = heldPresence(root);
  const presence = new Map<string, PresenceEntry>();
  for (const view of agentViews(root)) presence.set(view.id, entryFor(view, current));
  return presence;
}

/** One agent's presence, or undefined for an id the fleet does not hold. */
export function presenceEntry(root: OrchDir, agentId: string): PresenceEntry | undefined {
  const view = agentView(root, agentId);
  if (view === null) return undefined;
  return entryFor(view, heldPresence(root));
}

export function recordAgentStatus(
  root: OrchDir,
  agentId: string,
  patch: StatusPatch,
  now: number,
): { previous: AgentStatusRow | undefined; current: AgentStatusRow } {
  const previous = heldPresence(root).statuses.get(agentId);
  const current = mergeAgentStatus(root, agentId, previous, patch, now);
  patchStatus(root, current);
  return { previous, current };
}

export function patchStatus(root: OrchDir, row: AgentStatusRow): void {
  held.get(root)?.statuses.set(row.agentId, row);
}

export function dropStatus(root: OrchDir, agentId: string): void {
  held.get(root)?.statuses.delete(agentId);
}

export function runIsSettled(root: OrchDir, dispatchId: string): boolean {
  return heldPresence(root).settled.has(dispatchId);
}

export function refreshProcess(root: OrchDir, agentId: string): void {
  const current = held.get(root);
  if (!current) return;
  if (agentView(root, agentId) === null) {
    current.statuses.delete(agentId);
    current.results.delete(agentId);
    current.processes.delete(agentId);
    current.alive.delete(agentId);
    return;
  }
  const process = currentProcess(root, agentId);
  if (process === undefined) {
    current.processes.delete(agentId);
    current.alive.set(agentId, false);
    return;
  }
  current.processes.set(agentId, process);
  current.alive.set(agentId, recordedInstanceIsLive(process.pid, process.startToken));
}

export function probeAllProcesses(root: OrchDir): void {
  const current = held.get(root);
  if (!current) return;
  for (const [agentId, process] of current.processes) {
    current.alive.set(agentId, recordedInstanceIsLive(process.pid, process.startToken));
  }
}

onAgentRefreshed((root, agentId) => refreshProcess(root, agentId));

/** A run with a text result is the newest for its agent. A run that lost its
 *  result may leave an older text result as the newest, so that case re-reads
 *  the agent's newest from the store. */
onRunUpserted((root, run) => {
  const current = held.get(root);
  if (!current) return;
  if (typeof run.result === "string") {
    current.results.set(run.agentKey, run.result);
    current.settled.add(run.dispatchId);
    return;
  }
  current.settled.delete(run.dispatchId);
  const newest = latestResultTexts(root).get(run.agentKey);
  if (newest === undefined) current.results.delete(run.agentKey);
  else current.results.set(run.agentKey, newest);
});

