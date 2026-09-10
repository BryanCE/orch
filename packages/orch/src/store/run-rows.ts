import { desc, eq, lt } from "drizzle-orm";
import { orm } from "./connection.ts";
import { runs } from "../db/schema.ts";
import { nullableJsonText, setNonNullField } from "./row-values.ts";
import type { RunRecord } from "../types/store.ts";

type RunRow = typeof runs.$inferSelect;

function rowToRun(row: RunRow): RunRecord {
  const run: RunRecord = {
    dispatchId: row.dispatchId,
    agentKey: row.agentKey,
    state: row.state,
    startedAt: row.startedAt,
  };
  setNonNullField(run, "adapter", row.adapter);
  setNonNullField(run, "model", row.model);
  setNonNullField(run, "space", row.space);
  setNonNullField(run, "task", row.task);
  setNonNullField(run, "finishedAt", row.finishedAt);
  setNonNullField(run, "tokensIn", row.tokensIn);
  setNonNullField(run, "tokensOut", row.tokensOut);
  setNonNullField(run, "cacheRead", row.cacheRead);
  setNonNullField(run, "cacheWrite", row.cacheWrite);
  setNonNullField(run, "cost", row.cost);
  setNonNullField(run, "turns", row.turns);
  setNonNullField(run, "result", row.result === null ? null : JSON.parse(row.result));
  setNonNullField(run, "lastError", row.lastError);
  return run;
}

/** Every column a later observation of the same dispatch may change. */
function mutableColumns(run: RunRecord) {
  return {
    agentKey: run.agentKey,
    adapter: run.adapter ?? null,
    model: run.model ?? null,
    space: run.space ?? null,
    task: run.task ?? null,
    state: run.state,
    finishedAt: run.finishedAt ?? null,
    tokensIn: run.tokensIn ?? null,
    tokensOut: run.tokensOut ?? null,
    cacheRead: run.cacheRead ?? null,
    cacheWrite: run.cacheWrite ?? null,
    cost: run.cost ?? null,
    turns: run.turns ?? null,
    result: nullableJsonText(run.result),
    lastError: run.lastError ?? null,
  };
}

/** Record one observation of a dispatch. `startedAt` is written once, on the
 *  first observation, so a later update cannot move the run's start. */
export function upsertRun(directory: string, run: RunRecord): void {
  orm(directory).insert(runs)
    .values({ dispatchId: run.dispatchId, startedAt: run.startedAt, ...mutableColumns(run) })
    .onConflictDoUpdate({ target: runs.dispatchId, set: mutableColumns(run) })
    .run();
}

/** Runs newest first, for one agent or for every agent. */
export function selectRuns(directory: string, filter: { agentKey?: string; limit?: number } = {}): RunRecord[] {
  const query = orm(directory).select().from(runs)
    .where(filter.agentKey === undefined ? undefined : eq(runs.agentKey, filter.agentKey))
    .orderBy(desc(runs.startedAt));
  const rows = filter.limit === undefined ? query.all() : query.limit(filter.limit).all();
  return rows.map(rowToRun);
}

/** The one run a dispatch id names. */
export function selectRun(directory: string, dispatchId: string): RunRecord | undefined {
  const row = orm(directory).select().from(runs).where(eq(runs.dispatchId, dispatchId)).limit(1).all()[0];
  return row === undefined ? undefined : rowToRun(row);
}

export function deleteRunsBefore(directory: string, cutoff: number): number {
  return Number(orm(directory).delete(runs).where(lt(runs.startedAt, cutoff)).run().changes);
}
