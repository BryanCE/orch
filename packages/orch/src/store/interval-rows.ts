import type { OrchDir } from "../types/core.ts";
import { and, eq, isNull } from "drizzle-orm";
import { orm, withTransaction, type Orm } from "./connection.ts";
import { recordedInstanceIsLive } from "../process-identity.ts";
import { refreshAgent } from "./agent-view.ts";
import { agentHandles, agentPlexers, agentProcesses, agentSpaces, agentTunings } from "../db/schema.ts";
import type { ProcessValues, TuningValues } from "../types/store.ts";

/**
 * The four axes an agent carries on its own timeline.
 *
 * Each is an interval table: `[since, until)`, at most one row open at a time.
 * Writing one is CLOSE-THEN-OPEN in a transaction, because the half-open
 * intervals must meet exactly — an open row beside another is what the
 * `one_live_*` unique indexes refuse.
 */
export type ProcessRow = typeof agentProcesses.$inferSelect;
export type HandleRow = typeof agentHandles.$inferSelect;
export type AgentSpaceRow = typeof agentSpaces.$inferSelect;
export type TuningRow = typeof agentTunings.$inferSelect;

type IntervalTable = typeof agentProcesses | typeof agentHandles | typeof agentSpaces | typeof agentTunings;

/** Close the open row and answer the instant it closed at, which is where the
 *  next row opens. `until > since` forbids closing a row at its own start, so
 *  a row opened this same millisecond closes one later. */
function closeOpen(db: Orm, table: IntervalTable, agentId: string, now: number): number {
  const open = db.select({ since: table.since }).from(table)
    .where(and(eq(table.agentId, agentId), isNull(table.until))).get();
  if (open === undefined) return now;
  const closesAt = Math.max(now, open.since + 1);
  db.update(table).set({ until: closesAt })
    .where(and(eq(table.agentId, agentId), isNull(table.until))).run();
  return closesAt;
}

export function recordProcessIn(db: Orm, agentId: string, now: number, values: ProcessValues): void {
  const since = closeOpen(db, agentProcesses, agentId, now);
  db.insert(agentProcesses).values({
    agentId, since, until: null, hostId: values.hostId, pid: values.pid, startToken: values.startToken,
  }).run();
}

export function recordProcess(orchDir: OrchDir, agentId: string, now: number, values: ProcessValues): void {
  withTransaction(orchDir, () => recordProcessIn(orm(orchDir), agentId, now, values));
  refreshAgent(orchDir, agentId);
}

export function endProcess(orchDir: OrchDir, agentId: string, now: number): void {
  withTransaction(orchDir, () => {
    closeOpen(orm(orchDir), agentProcesses, agentId, now);
  });
  refreshAgent(orchDir, agentId);
}

export function setHandle(orchDir: OrchDir, agentId: string, now: number, handle: string): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const since = closeOpen(db, agentHandles, agentId, now);
    db.insert(agentHandles).values({ agentId, since, until: null, handle }).run();
  });
  refreshAgent(orchDir, agentId);
}

export function setSpace(orchDir: OrchDir, agentId: string, now: number, spaceId: string): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const since = closeOpen(db, agentSpaces, agentId, now);
    db.insert(agentSpaces).values({ agentId, since, until: null, spaceId }).run();
  });
  refreshAgent(orchDir, agentId);
}

export function clearSpace(orchDir: OrchDir, agentId: string, now: number): void {
  withTransaction(orchDir, () => {
    closeOpen(orm(orchDir), agentSpaces, agentId, now);
  });
  refreshAgent(orchDir, agentId);
}

export function setTuning(orchDir: OrchDir, agentId: string, now: number, values: TuningValues): void {
  withTransaction(orchDir, () => {
    const db = orm(orchDir);
    const since = closeOpen(db, agentTunings, agentId, now);
    db.insert(agentTunings).values({
      agentId, since, until: null, model: values.model, thinking: values.thinking ?? null,
    }).run();
  });
  refreshAgent(orchDir, agentId);
}

/** A plexer is a plain membership, not an interval: an agent is in one plexer
 *  for its whole life, and moving between plexers is a new agent. */
export function setAgentPlexer(orchDir: OrchDir, agentId: string, plexerId: string): void {
  const existing = orm(orchDir).select({ agentId: agentPlexers.agentId })
    .from(agentPlexers).where(eq(agentPlexers.agentId, agentId)).get();
  if (existing !== undefined) throw new Error(`agent ${agentId} already has a plexer`);
  orm(orchDir).insert(agentPlexers).values({ agentId, plexerId }).run();
  refreshAgent(orchDir, agentId);
}

export function currentProcess(orchDir: OrchDir, agentId: string): ProcessRow | undefined {
  return orm(orchDir).select().from(agentProcesses)
    .where(and(eq(agentProcesses.agentId, agentId), isNull(agentProcesses.until))).get();
}

/** Every agent's open process, by agent id, in one read. */
export function currentProcesses(orchDir: OrchDir): Map<string, ProcessRow> {
  const rows = orm(orchDir).select().from(agentProcesses).where(isNull(agentProcesses.until)).all();
  return new Map(rows.map((row) => [row.agentId, row]));
}

export function currentHandle(orchDir: OrchDir, agentId: string): HandleRow | undefined {
  return orm(orchDir).select().from(agentHandles)
    .where(and(eq(agentHandles.agentId, agentId), isNull(agentHandles.until))).get();
}

export function currentSpace(orchDir: OrchDir, agentId: string): AgentSpaceRow | undefined {
  return orm(orchDir).select().from(agentSpaces)
    .where(and(eq(agentSpaces.agentId, agentId), isNull(agentSpaces.until))).get();
}

export function currentTuning(orchDir: OrchDir, agentId: string): TuningRow | undefined {
  return orm(orchDir).select().from(agentTunings)
    .where(and(eq(agentTunings.agentId, agentId), isNull(agentTunings.until))).get();
}

/**
 * Whether the agent's OPEN process interval still names a live process.
 *
 * One spelling, imported: the lease gate (`orchd`), the drive-state renderer and
 * the doctor all ask this, and three copies of it is three chances to disagree
 * about whether a holder is dead — which is the difference between refusing a
 * dispatch and allowing it (Rule 11: a dead holder is not a collision).
 *
 * The recorded start token is checked against the live process, so a pid reused
 * by an unrelated process reads as DEAD.
 */
export function recordedProcessIsLive(orchDir: OrchDir, agentId: string): boolean {
  const row = currentProcess(orchDir, agentId);
  return row !== undefined && recordedInstanceIsLive(row.pid, row.startToken);
}

/** {@link recordedProcessIsLive} addressed by a presence key. A key that
 *  names no registered agent has no process and is dead. */
export function agentProcessLive(orchDir: OrchDir, key: string): boolean {
  return recordedProcessIsLive(orchDir, key);
}
