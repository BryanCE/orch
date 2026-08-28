import type { OrchConfig } from "../config.ts";
import { loadPresence, reapDeadPresenceDirs, reapSpawnedRecord } from "../presence/store.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import { allBackends } from "../backends/registry.ts";
import { errorMessage } from "../util.ts";
import { deleteEventsBefore } from "../store/event-rows.ts";
import { deleteDeliveredBefore } from "../store/outbox-rows.ts";
import { deleteSettledTasksBefore } from "../store/task-rows.ts";
import { deleteRunsBefore } from "../store/run-rows.ts";
import { openStore } from "../store/connection.ts";
import { selectSpawnedRecords } from "../store/spawned-rows.ts";

/** Delete ended agent records only when no descendants remain. */
function removeExpiredAgentRecords(orchDir: string, cutoff: Date): { count: number; ids: Set<string> } {
  const db = openStore(orchDir);
  const rows = db.query(`SELECT e.agent_id FROM agent_endings e
    WHERE e.ended_at < ? AND NOT EXISTS (SELECT 1 FROM agents child WHERE child.spawned_by = e.agent_id)`).all(cutoff.getTime()) as { agent_id: string }[];
  const spawned = selectSpawnedRecords(orchDir);
  for (const row of rows) {
    // Normalized agent ids are the third segment of the serialized registry key;
    // clean every matching key so an ended agent cannot retain a name/owner row
    // merely because its presence directory was never created.
    const keys = spawned.filter((record) =>
      record.pane === row.agent_id || tryParseIdentity(record.pane)?.id === row.agent_id,
    ).map((record) => record.pane);
    for (const key of keys.length > 0 ? keys : [row.agent_id]) {
      reapSpawnedRecord(key, orchDir, { agentId: row.agent_id });
    }
  }
  return { count: rows.length, ids: new Set(rows.map((row) => row.agent_id)) };
}

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SweepCounts {
  queue: number;
  outbox: number;
  events: number;
  runs: number;
  ended_agents: number;
  logs: number;
}

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
    process.stderr.write(`Warning: retention sweep ended_agents failed for ${failure.entry.dir}: ${errorMessage(failure.error)}\n`);
  }
  // The registry row and presence directory represent one logical agent. Count
  // their union so removing both does not inflate the retention metric.
  const dirsRemovedOnly = result.removed.filter((entry) => {
    const agentId = tryParseIdentity(entry.key)?.id ?? entry.key;
    return !recordsRemoved.ids.has(agentId);
  }).length;
  return recordsRemoved.count + dirsRemovedOnly;
}

/** Ask each backend that owns logs to prune its stale artifacts. */
function removeExpiredLogs(orchDir: string, cutoff: Date): number {
  const liveKeys = [...loadPresence(orchDir).values()]
    .filter((entry) => entry.alive)
    .map((entry) => entry.key);
  let removed = 0;
  for (const backend of allBackends()) {
    if (!backend.capabilities.canPruneLogs || !backend.pruneLogs) continue;
    try {
      removed += backend.pruneLogs(cutoff, liveKeys, orchDir);
    } catch (error: unknown) {
      process.stderr.write(`Warning: retention sweep logs failed for backend ${backend.id}: ${errorMessage(error)}\n`);
    }
  }
  return removed;
}

/** Remove rows and disk artifacts outside each configured retention window.
 * Each entry is independent: one broken table or filesystem sweep never stops
 * the remaining entries. */
export function sweepExpiredRows(orchDir: string, config: OrchConfig, now: Date): SweepCounts {
  const counts: SweepCounts = { queue: 0, outbox: 0, events: 0, runs: 0, ended_agents: 0, logs: 0 };
  const cutoff = (days: number): Date => new Date(now.getTime() - days * DAY_MS);
  const entries: SweepEntry[] = [
    { name: "queue", days: config.retention.queue_days, remove: (date) => deleteSettledTasksBefore(orchDir, date.getTime()) },
    { name: "outbox", days: config.retention.outbox_days, remove: (date) => deleteDeliveredBefore(orchDir, date.toISOString()) },
    { name: "events", days: config.retention.events_days, remove: (date) => deleteEventsBefore(orchDir, date.toISOString()) },
    { name: "runs", days: config.retention.runs_days, remove: (date) => deleteRunsBefore(orchDir, date.toISOString()) },
    { name: "ended_agents", days: config.retention.ended_agents_days, remove: (date) => removeExpiredAgentDirs(orchDir, date) },
    { name: "logs", days: config.retention.logs_days, remove: (date) => removeExpiredLogs(orchDir, date) },
  ];
  for (const entry of entries) {
    try {
      counts[entry.name] = entry.remove(cutoff(entry.days));
    } catch (error: unknown) {
      process.stderr.write(`Warning: retention sweep ${entry.name} failed: ${errorMessage(error)}\n`);
    }
  }
  return counts;
}
