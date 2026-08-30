import { loadPresence, reapDeadPresenceDirs, reapSpawnedRecord } from "../presence/store.ts";
import { allBackends } from "../backends/registry.ts";
import { errorMessage } from "../util.ts";
import { decisionLogger } from "./decision-log.ts";
import { deleteEventsBefore } from "../store/event-rows.ts";
import { deleteDeliveredBefore } from "../store/outbox-rows.ts";
import { deleteSettledTasksBefore } from "../store/task-rows.ts";
import { deleteRunsBefore } from "../store/run-rows.ts";


import { rmSync, statSync } from "node:fs";
import { daemonRuntimeFiles } from "./runtime-files.ts";
import type { OrchConfig } from "../types/config.ts";


/** Delete ended agent records only when no descendants remain.
 *
 *  A1: an agent is reaped by its IDENTITY and by nothing else. Environment,
 *  ownership and provenance are satellites of the hub row, so deleting the hub
 *  takes them with it; there is no second key to sweep, and no scan of a wide
 *  row is needed to discover the identities an agent is filed under. */
function removeExpiredAgentRecords(orchDir: string, cutoff: Date): { count: number; ids: Set<string> } {
  // A parent is kept while any child row still points at it: `agents.spawned_by`
  // has no ON DELETE CASCADE, so reaping it first would orphan the child.
  const parents = orm(orchDir).selectDistinct({ id: agents.spawnedBy }).from(agents)
    .where(isNotNull(agents.spawnedBy)).all().flatMap((row) => row.id === null ? [] : [row.id]);
  const ids = orm(orchDir).select({ agentId: agentEndings.agentId }).from(agentEndings)
    .where(and(lt(agentEndings.endedAt, cutoff.getTime()),
      parents.length === 0 ? undefined : notInArray(agentEndings.agentId, parents)))
    .all().map((row) => row.agentId);
  for (const id of ids) reapSpawnedRecord(id, orchDir, { agentId: id });
  return { count: ids.length, ids: new Set(ids) };
}

import type { SweepCounts } from "../types/daemon.ts";
import { and, isNotNull, lt, notInArray } from "drizzle-orm";
import { orm } from "../store/connection.ts";
import { agentEndings, agents } from "../db/schema.ts";
export type { SweepCounts };

const DAY_MS = 24 * 60 * 60 * 1000;
/** Maximum size for each orch-owned JSONL log before the next retention sweep. */
export const ORCH_LOG_MAX_BYTES = 10 * 1024 * 1024;

interface SweepEntry {
  name: keyof SweepCounts;
  days: number;
  remove: (cutoff: Date) => number;
}

/** Reap old dead presence through the shared presence/clean path. */
function removeExpiredAgentDirs(orchDir: string, cutoff: Date): number {
  // Agent records and their presence directories share this ended-agent window.
  const recordsRemoved = removeExpiredAgentRecords(orchDir, cutoff);
  const result = reapDeadPresenceDirs(orchDir, cutoff);
  for (const failure of result.failed) {
    decisionLogger(orchDir).warn("retention.sweep-failed", { area: "ended_agents", dir: failure.entry.dir, error: errorMessage(failure.error) });
  }
  // The registry row and presence directory represent one logical agent. Count
  // their union so removing both does not inflate the retention metric.
  const dirsRemovedOnly = result.removed.filter((entry) => {
    const agentId = entry.key;
    return !recordsRemoved.ids.has(agentId);
  }).length;
  return recordsRemoved.count + dirsRemovedOnly;
}

/** Ask each backend that owns logs to prune its stale artifacts. */
function removeExpiredLogs(orchDir: string, cutoff: Date): number {
  let removed = 0;
  for (const file of [daemonRuntimeFiles(orchDir).log, `${orchDir}/orch.log`]) {
    try {
      const stat = statSync(file);
      if (stat.mtimeMs < cutoff.getTime() || stat.size > ORCH_LOG_MAX_BYTES) {
        rmSync(file);
        removed += 1;
      }
    } catch (error: unknown) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") continue;
    }
  }
  const liveKeys = [...loadPresence(orchDir).values()]
    .filter((entry) => entry.alive)
    .map((entry) => entry.key);
  let backendRemoved = 0;
  for (const backend of allBackends()) {
    const pruning = backend.logPruning;
    if (pruning === null) continue;
    try {
      backendRemoved += pruning.prune(cutoff, liveKeys, orchDir);
    } catch (error: unknown) {
      decisionLogger(orchDir).warn("retention.sweep-failed", { area: "logs", backend: backend.id, error: errorMessage(error) });
    }
  }
  return removed + backendRemoved;
}

/** Remove rows and disk artifacts outside each configured retention window.
 * Each entry is independent: one broken table or filesystem sweep never stops
 * the remaining entries.
 *
 * Takes the retention section rather than the whole config because that is all it
 * reads. A parameter wider than its use is not free: it forced every caller that
 * is not the daemon - each retention test - to build a whole OrchConfig it had no
 * opinion about, and the shortcut for that was `{...} as OrchConfig`, which Rule 13
 * forbids. Rule 13's own remedy for a cast is "a wrong signature gets its signature
 * fixed", and this was the wrong signature. */
export function sweepExpiredRows(orchDir: string, config: Pick<OrchConfig, "retention">, now: Date): SweepCounts {
  const counts: SweepCounts = { queue: 0, outbox: 0, events: 0, runs: 0, ended_agents: 0, logs: 0 };
  const cutoff = (days: number): Date => new Date(now.getTime() - days * DAY_MS);
  const entries: SweepEntry[] = [
    { name: "queue", days: config.retention.queue_days, remove: (date) => deleteSettledTasksBefore(orchDir, date.getTime()) },
    { name: "outbox", days: config.retention.outbox_days, remove: (date) => deleteDeliveredBefore(orchDir, date.getTime()) },
    { name: "events", days: config.retention.events_days, remove: (date) => deleteEventsBefore(orchDir, date.getTime()) },
    { name: "runs", days: config.retention.runs_days, remove: (date) => deleteRunsBefore(orchDir, date.getTime()) },
    { name: "ended_agents", days: config.retention.ended_agents_days, remove: (date) => removeExpiredAgentDirs(orchDir, date) },
    { name: "logs", days: config.retention.logs_days, remove: (date) => removeExpiredLogs(orchDir, date) },
  ];
  for (const entry of entries) {
    try {
      counts[entry.name] = entry.remove(cutoff(entry.days));
    } catch (error: unknown) {
      decisionLogger(orchDir).warn("retention.sweep-failed", { area: entry.name, error: errorMessage(error) });
    }
  }
  return counts;
}
