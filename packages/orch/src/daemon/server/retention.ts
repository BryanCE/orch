import type { OrchDir } from "../../types/core.ts";
import { loadPresence, reapExpiredPresenceDirs } from "../../presence/store.ts";
import { allBackends } from "../../backends/registry.ts";
import { errorMessage } from "../../util.ts";
import { decisionLogger } from "../client/decision-log.ts";
import { deleteEventsBefore } from "../../store/event-rows.ts";
import { deleteDeliveredBefore } from "../../store/outbox-rows.ts";
import { deleteControlOutcomesBefore } from "../../store/control-outcome-rows.ts";
import { deleteSettledTasksBefore } from "../../store/task-rows.ts";
import { deleteRunsBefore } from "../../store/run-rows.ts";
import { rmSync, statSync } from "node:fs";
import { daemonRuntimeFiles } from "../client/runtime-files.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { SweepCounts } from "../../types/daemon.ts";
export type { SweepCounts };

const DAY_MS = 24 * 60 * 60 * 1000;
/** Maximum size for each orch-owned JSONL log before the next retention sweep. */
export const ORCH_LOG_MAX_BYTES = 10 * 1024 * 1024;

interface SweepEntry {
  name: keyof SweepCounts;
  remove: () => number;
}

/** Ask each backend that owns logs to prune its stale artifacts. */
function removeExpiredLogs(orchDir: OrchDir, cutoff: Date): number {
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
      decisionLogger(orchDir, null).warn("retention.sweep-failed", { area: "logs", backend: backend.id, error: errorMessage(error) });
    }
  }
  return removed + backendRemoved;
}

/** Remove rows and disk artifacts outside each configured retention window.
 * Each entry is independent: one broken table or filesystem sweep never stops
 * the remaining entries.
 *
 * Takes the retention section rather than the whole settings because that is all it
 * reads. A parameter wider than its use is not free: it forced every caller that
 * is not the daemon - each retention test - to build a whole OrchSettings it had no
 * opinion about, and the shortcut for that was `{...} as OrchSettings`, which Rule 13
 * forbids. Rule 13's own remedy for a cast is "a wrong signature gets its signature
 * fixed", and this was the wrong signature. */
export function sweepExpiredRows(orchDir: OrchDir, settings: Pick<OrchSettings, "retention">, now: Date): SweepCounts {
  const counts: SweepCounts = { queue: 0, outbox: 0, control_outcomes: 0, events: 0, runs: 0, ended_agents: 0, logs: 0 };
  const cutoff = (days: number): Date => new Date(now.getTime() - days * DAY_MS);
  const { retention } = settings;
  const entries: SweepEntry[] = [
    { name: "queue", remove: () => deleteSettledTasksBefore(orchDir, cutoff(retention.queue_days).getTime()) },
    { name: "outbox", remove: () => deleteDeliveredBefore(orchDir, cutoff(retention.outbox_days).getTime()) },
    { name: "control_outcomes", remove: () => deleteControlOutcomesBefore(orchDir, cutoff(retention.control_outcomes_days).getTime()) },
    { name: "events", remove: () => deleteEventsBefore(orchDir, cutoff(retention.events_days).getTime()) },
    { name: "runs", remove: () => deleteRunsBefore(orchDir, cutoff(retention.runs_days).getTime()) },
    // A gone agent's rows leave on the daemon's liveness tick, not here. Only its
    // JSONL history ages, and a null window keeps that history forever.
    { name: "ended_agents", remove: () => retention.ended_agents_days === null ? 0 : reapExpiredPresenceDirs(orchDir, cutoff(retention.ended_agents_days)).length },
    { name: "logs", remove: () => removeExpiredLogs(orchDir, cutoff(retention.logs_days)) },
  ];
  for (const entry of entries) {
    try {
      counts[entry.name] = entry.remove();
    } catch (error: unknown) {
      decisionLogger(orchDir, null).warn("retention.sweep-failed", { area: entry.name, error: errorMessage(error) });
    }
  }
  return counts;
}
