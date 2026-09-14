import { readdirSync, rmSync, statSync } from "node:fs";
import { join } from "node:path";
// The presence protocol is orch's, and src/presence/ owns it (Rule 10). The
// directory layout is defined there and imported here — a second copy in the
// store is how a writer and a reader end up disagreeing about where a record
// lives. The dependency runs only this way: presence/ stays standalone so the
// harness shims can bundle it without dragging in the sqlite graph.
import { presenceAgentDir, presenceRoot } from "./history.ts";
import { agentViewIndex, agentViews } from "../store/agent-view.ts";
import { isAgentId } from "../backends/identity.ts";
import { eq } from "drizzle-orm";
import { orm } from "../store/connection.ts";
import { closeOutboxForTarget, selectOpenOutboxTargets } from "../store/outbox-rows.ts";
import { agentProcessLive } from "../store/interval-rows.ts";
import { agents } from "../db/schema.ts";
import { selectAgentStatus } from "../store/status-rows.ts";
import { selectRuns } from "../store/run-rows.ts";
import type { AgentView } from "../types/store.ts";
import type { OrchDir } from "../types/core.ts";
import type { DeadPresenceReapResult, PresenceEntry } from "../types/presence.ts";

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
  const index = agentViewIndex(root);
  for (const [id, view] of index) {
    if (view.endedAt !== null) index.delete(id);
  }
  return index;
}

/** Reap one agent: the hub row (which cascades every satellite, lease and
 *  ending), its open writes, and its presence directory. There is no second id
 *  space to clean. A reaped agent reads nothing, so a write left open would
 *  retry on every drain tick forever. */
export function reapSpawnedRecord(key: string, root: OrchDir, options: { agentId?: string } = {}): void {
  const agentId = options.agentId ?? key;
  if (agentId !== undefined) {
    try { orm(root).delete(agents).where(eq(agents.id, agentId)).run(); } catch {}
  }
  closeOutboxForTarget(root, key);
  removePresenceAgentDir(presenceAgentDir(key, root));
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

/** Reap dead presence directories old enough for retention. This is the shared
 * path for daemon retention and `orch clean --force`; it also removes the agent
 * rows and closes their open writes. */
export function reapDeadPresenceDirs(root: OrchDir, olderThan?: Date): DeadPresenceReapResult {
  const removed: PresenceEntry[] = [];
  const failed: { entry: PresenceEntry; error: unknown }[] = [];
  const cutoffMs = olderThan?.getTime();
  reapMalformedPresenceDirs(root);
  for (const entry of loadPresence(root).values()) {
    if (entry.alive) continue;
    if (cutoffMs !== undefined) {
      // Retention is based only on instants orch recorded in the status row.
      const status = entry.status;
      const recorded = status === null
        ? null
        : Math.max(status.updatedAt, status.finishedAt ?? status.updatedAt);
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

export function loadPresence(root: OrchDir): Map<string, PresenceEntry> {
  const presence = new Map<string, PresenceEntry>();
  for (const view of agentViews(root)) {
    const status = selectAgentStatus(root, view.id) ?? null;
    const result = selectRuns(root, { agentKey: view.id, limit: 5 })
      .find((run) => run.result !== undefined && run.result !== null)?.result;
    const textResult = typeof result === "string" ? result : null;
    const alive = view.endedAt === null && agentProcessLive(root, view.id);
    presence.set(view.id, { key: view.id, status, result: textResult, alive });
  }
  return presence;
}

