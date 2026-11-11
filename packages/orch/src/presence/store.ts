import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
// The presence protocol is orch's, and src/presence/ owns it (Rule 10). The
// directory layout is defined there and imported here — a second copy in the
// store is how a writer and a reader end up disagreeing about where a record
// lives. The dependency runs only this way: presence/ stays standalone so the
// harness shims can bundle it without dragging in the sqlite graph.
import { presenceRoot } from "./history.ts";
import { agentView, agentViewIndex, agentViews, liveViews, onAgentRefreshed, refreshAgent } from "../store/agent-view.ts";
import { isAgentId } from "../shared/agent-id.ts";
import { eq, isNotNull } from "drizzle-orm";
import { orm, registerMemoReset } from "../store/connection.ts";
import { closeOutboxForTarget, selectOpenOutboxTargets } from "../store/outbox-rows.ts";
import { forgetEchoes } from "../control/echo.ts";
import { deleteSettledTasksOf } from "../store/task-rows.ts";
import { deleteGrantsOf } from "../store/grant-rows.ts";
import { agentLocations, currentProcess, currentProcesses, type StoredProcess } from "../store/interval-rows.ts";
import { placeAgentIfAny, placeLocation, placedLiveness } from "../process-place.ts";
import { linkedHosts } from "../store/host-rows.ts";
import { endAgent, originOf } from "../store/agent-rows.ts";
import { sweeps } from "../policy/close-authority.ts";
import { agents } from "../db/schema.ts";
import { mergeAgentStatus, selectAgentStatuses, type AgentStatusRow } from "../store/status-rows.ts";
import { latestResultTexts, onRunUpserted, settledDispatchIds } from "../store/run-rows.ts";
import type { AgentView } from "../types/store.ts";
import type { HostId } from "../types/host.ts";
import type { LinkedHost } from "../types/process.ts";
import type { OrchDir } from "../types/core.ts";
import type { AgentPlace, HereAgent } from "../types/agent-place.ts";
import type { Liveness, PlaceFreeStatusPatch, PresenceEntry, StatusPatch } from "../types/presence.ts";

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
 *  left open would retry on every drain tick forever. The store holds only
 *  running state, so its settled tasks and spent grants go too. Its JSONL
 *  history under the presence directory is untouched; that ages out on its own. */
export function reapAgentRecord(agentId: string, root: OrchDir): void {
  deleteSettledTasksOf(root, agentId);
  deleteGrantsOf(root, agentId);
  orm(root).delete(agents).where(eq(agents.id, agentId)).run();
  refreshAgent(root, agentId);
  closeOutboxForTarget(root, agentId);
  forgetEchoes(agentId);
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

/** Whether this orchd alone decides when an agent's rows go: only an agent that runs here.
 *  Another host follows an agent that runs there (this row is its reference) and an agent it
 *  asked this host to run (its run records are read from here), so those rows stay after the
 *  agent ends, until a reap. */
function reapedHere(root: OrchDir, agentId: string): boolean {
  if (originOf(root, agentId) !== null) return false;
  return placeAgentIfAny(root, agentId)?.kind === "here";
}

/** End every agent whose process is gone and that owns no agent still running: nothing it
 *  spawned at any depth, nothing it holds. The ending is what says it is gone, because its
 *  rows can outlast it for as long as another row points at them. One that still owns a
 *  running agent stays open, so the same session coming back finds its fleet. Only an agent
 *  here is ever dead without an ending. Answers with the ids ended. */
export function endDeadAgents(root: OrchDir, now: number): string[] {
  const presence = [...loadPresence(root).values()];
  const running = presence.filter((entry) => entry.liveness !== "dead").map((entry) => entry.key);
  const ended: string[] = [];
  for (const entry of presence) {
    if (entry.liveness !== "dead" || agentView(root, entry.key)?.endedAt !== null) continue;
    if (running.some((id) => sweeps(root, entry.key, id))) continue;
    endAgent(root, entry.key, now, null);
    ended.push(entry.key);
  }
  return ended;
}

/** Delete the rows of every agent whose process is gone, children before
 *  parents. An agent a remaining row still points at stays for a later sweep;
 *  that is a reference holding, never a failure. Answers with the ids removed. */
export function reapDeadAgentRecords(root: OrchDir): string[] {
  const removed: string[] = [];
  let dead = [...loadPresence(root).values()].filter((entry) => entry.liveness === "dead" && reapedHere(root, entry.key)).map((entry) => entry.key);
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

/** Close every open write whose target is dead or gone, answering with how many rows
 *  closed. The daemon retries an open write on every drain tick; a target that is dead,
 *  or whose directory is already gone, never acks one. A target orch cannot ask about
 *  right now keeps its writes until it can. */
export function closeOutboxForDeadTargets(root: OrchDir): number {
  const presence = loadPresence(root);
  let closed = 0;
  for (const target of selectOpenOutboxTargets(root)) {
    const liveness = presence.get(target)?.liveness ?? "dead";
    if (liveness !== "dead") continue;
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
  const live = new Set([...loadPresence(root).values()].filter((entry) => entry.liveness !== "dead").map((entry) => entry.key));
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
  /** Where every agent runs. */
  readonly places: Map<string, AgentPlace>;
  /** The open process of every agent that runs here. Only those have one. */
  readonly processes: Map<string, StoredProcess>;
  readonly liveness: Map<string, Liveness>;
}

const held = new Map<OrchDir, HeldPresence>();
registerMemoReset(() => held.clear());

/** Agents here whose program is being swapped for a new one, by orch dir. The old process is
 *  gone by design and the new one is not recorded yet, so nothing may read the agent as dead. */
const swapping = new Map<OrchDir, Set<string>>();

function livenessOf(root: OrchDir, agentId: string, place: AgentPlace, process: StoredProcess | undefined, linked?: ReadonlyMap<HostId, LinkedHost>): Liveness {
  if (swapping.get(root)?.has(agentId) === true) return "unknown";
  return placedLiveness(root, place, process, linked);
}

/** Swap an agent's program: `swap` ends the old process and records the new one. Until it
 *  settles the agent's liveness is unknown, which is never dead, so no liveness tick ends it,
 *  reaps it or closes its writes in the gap. */
export async function whileSwappingProcess<T>(root: OrchDir, agentId: string, swap: () => Promise<T>): Promise<T> {
  const ids = swapping.get(root) ?? new Set<string>();
  swapping.set(root, ids);
  ids.add(agentId);
  refreshProcess(root, agentId);
  try {
    return await swap();
  } finally {
    ids.delete(agentId);
    if (ids.size === 0) swapping.delete(root);
    refreshProcess(root, agentId);
  }
}

function heldPresence(root: OrchDir): HeldPresence {
  const existing = held.get(root);
  if (existing) return existing;
  const linked = linkedHosts(root);
  const places = new Map([...agentLocations(root)].map(([agentId, location]) => [agentId, placeLocation(agentId, location, linked)]));
  const recorded = currentProcesses(root);
  const processes = new Map<string, StoredProcess>();
  const liveness = new Map<string, Liveness>();
  for (const [agentId, place] of places) {
    const process = place.kind === "here" ? recorded.get(agentId) : undefined;
    if (process !== undefined) processes.set(agentId, process);
    liveness.set(agentId, livenessOf(root, agentId, place, process, linked));
  }
  const presence: HeldPresence = {
    statuses: new Map(selectAgentStatuses(root).map((row) => [row.agentId, row])),
    results: latestResultTexts(root),
    settled: settledDispatchIds(root),
    places,
    processes,
    liveness,
  };
  held.set(root, presence);
  return presence;
}

/** An ended agent is dead. A live one reads what was last learned of it where it runs. Every
 *  agent row is placed as it is written (`refreshProcess`), so a live one always has a liveness. */
function entryFor(view: AgentView, current: HeldPresence): PresenceEntry {
  const liveness = current.liveness.get(view.id);
  if (view.endedAt === null && liveness === undefined) throw new Error(`orch: agent ${view.id} was never placed`);
  return {
    key: view.id,
    status: current.statuses.get(view.id) ?? null,
    result: current.results.get(view.id) ?? null,
    liveness: view.endedAt === null && liveness !== undefined ? liveness : "dead",
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

/** Record a status an agent here reported about itself, machine fields included. */
export function recordAgentStatus(
  root: OrchDir,
  agent: HereAgent,
  patch: StatusPatch,
  now: number,
): { previous: AgentStatusRow | undefined; current: AgentStatusRow } {
  return writeStatus(root, agent.id, patch, now);
}

/** Record a status that names no machine, for an agent wherever it runs. */
export function recordAgentState(
  root: OrchDir,
  agentId: string,
  patch: PlaceFreeStatusPatch,
  now: number,
): { previous: AgentStatusRow | undefined; current: AgentStatusRow } {
  return writeStatus(root, agentId, patch, now);
}

function writeStatus(root: OrchDir, agentId: string, patch: StatusPatch, now: number): { previous: AgentStatusRow | undefined; current: AgentStatusRow } {
  const previous = heldPresence(root).statuses.get(agentId);
  const current = mergeAgentStatus(root, agentId, previous, patch, now);
  patchStatus(root, current);
  return { previous, current };
}

export function patchStatus(root: OrchDir, row: AgentStatusRow): void {
  held.get(root)?.statuses.set(row.agentId, row);
}

export function runIsSettled(root: OrchDir, dispatchId: string): boolean {
  return heldPresence(root).settled.has(dispatchId);
}

export function refreshProcess(root: OrchDir, agentId: string): void {
  const current = held.get(root);
  if (!current) return;
  const place = agentView(root, agentId) === null ? null : placeAgentIfAny(root, agentId);
  if (place === null) {
    current.statuses.delete(agentId);
    current.results.delete(agentId);
    current.places.delete(agentId);
    current.processes.delete(agentId);
    current.liveness.delete(agentId);
    return;
  }
  const process = place.kind === "here" ? currentProcess(root, place.agent) : undefined;
  current.places.set(agentId, place);
  if (process === undefined) current.processes.delete(agentId);
  else current.processes.set(agentId, process);
  current.liveness.set(agentId, livenessOf(root, agentId, place, process));
}

/** Re-ask about every held agent: one here from its process, one on another host from that
 *  host's link. True when any agent's liveness changed. */
export function probeAllProcesses(root: OrchDir): boolean {
  const current = held.get(root);
  if (!current) return false;
  const linked = linkedHosts(root);
  let changed = false;
  const settle = (agentId: string, liveness: Liveness): void => {
    if (current.liveness.get(agentId) !== liveness) changed = true;
    current.liveness.set(agentId, liveness);
  };
  for (const [agentId, place] of current.places) settle(agentId, livenessOf(root, agentId, place, current.processes.get(agentId), linked));
  return changed;
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

