import type { OrchConfig } from "../config.ts";
import { loadPresence, reapDeadPresenceDirs } from "../presence/store.ts";
import { allBackends } from "../backends/registry.ts";
import { errorMessage } from "../util.ts";
import { deleteEventsBefore } from "../store/event-rows.ts";
import { deleteSessionIdentitiesBefore } from "../store/identity-rows.ts";
import { deleteDeliveredBefore } from "../store/outbox-rows.ts";
import { deleteSettledTasksBefore } from "../store/queue-rows.ts";
import { deleteRunsBefore } from "../store/run-rows.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface SweepCounts {
  queue: number;
  outbox: number;
  events: number;
  runs: number;
  identities: number;
  agent_dirs: number;
  logs: number;
}

interface SweepEntry {
  name: keyof SweepCounts;
  days: number;
  remove: (cutoff: Date) => number;
}

/** Reap old dead presence through the shared presence/clean path. */
function removeExpiredAgentDirs(orchDir: string, cutoff: Date): number {
  const result = reapDeadPresenceDirs(orchDir, cutoff);
  for (const failure of result.failed) {
    process.stderr.write(`Warning: retention sweep agent_dirs failed for ${failure.entry.dir}: ${errorMessage(failure.error)}\n`);
  }
  return result.removed.length;
}

/** Ask each backend that owns logs to prune its stale artifacts. */
function removeExpiredLogs(orchDir: string, cutoff: Date): number {
  const liveKeys = [...loadPresence(orchDir).values()]
    .filter((entry) => entry.alive)
    .map((entry) => entry.key);
  let removed = 0;
  for (const backend of allBackends()) {
    if (!backend.caps.canPruneLogs || !backend.pruneLogs) continue;
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
  const counts: SweepCounts = { queue: 0, outbox: 0, events: 0, runs: 0, identities: 0, agent_dirs: 0, logs: 0 };
  const cutoff = (days: number): Date => new Date(now.getTime() - days * DAY_MS);
  const entries: SweepEntry[] = [
    { name: "queue", days: config.retention.queue_days, remove: (date) => deleteSettledTasksBefore(orchDir, date.toISOString()) },
    { name: "outbox", days: config.retention.outbox_days, remove: (date) => deleteDeliveredBefore(orchDir, date.toISOString()) },
    { name: "events", days: config.retention.events_days, remove: (date) => deleteEventsBefore(orchDir, date.toISOString()) },
    { name: "runs", days: config.retention.runs_days, remove: (date) => deleteRunsBefore(orchDir, date.toISOString()) },
    { name: "identities", days: config.retention.identities_days, remove: (date) => deleteSessionIdentitiesBefore(orchDir, date.toISOString()) },
    { name: "agent_dirs", days: config.retention.agent_dirs_days, remove: (date) => removeExpiredAgentDirs(orchDir, date) },
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
