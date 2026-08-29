import { and, eq, isNull } from "drizzle-orm";
import { orm, withTransaction } from "./connection.ts";
import { processInstanceMatches, processIsAlive } from "../process-identity.ts";
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
export type SpaceRow = typeof agentSpaces.$inferSelect;
export type TuningRow = typeof agentTunings.$inferSelect;

function closeOpen(orchDir: string, table: typeof agentProcesses | typeof agentHandles | typeof agentSpaces | typeof agentTunings, agentId: string, now: number): void {
  orm(orchDir).update(table).set({ until: now })
    .where(and(eq(table.agentId, agentId), isNull(table.until))).run();
}

export function recordProcess(orchDir: string, agentId: string, now: number, values: ProcessValues): void {
  withTransaction(orchDir, () => {
    closeOpen(orchDir, agentProcesses, agentId, now);
    orm(orchDir).insert(agentProcesses).values({
      agentId, since: now, until: null, hostId: values.hostId, pid: values.pid, startToken: values.startToken ?? null,
    }).run();
  });
}

export function endProcess(orchDir: string, agentId: string, now: number): void {
  withTransaction(orchDir, () => { closeOpen(orchDir, agentProcesses, agentId, now); });
}

export function setHandle(orchDir: string, agentId: string, now: number, handle: string): void {
  withTransaction(orchDir, () => {
    closeOpen(orchDir, agentHandles, agentId, now);
    orm(orchDir).insert(agentHandles).values({ agentId, since: now, until: null, handle }).run();
  });
}

export function setSpace(orchDir: string, agentId: string, now: number, spaceId: string): void {
  withTransaction(orchDir, () => {
    closeOpen(orchDir, agentSpaces, agentId, now);
    orm(orchDir).insert(agentSpaces).values({ agentId, since: now, until: null, spaceId }).run();
  });
}

export function clearSpace(orchDir: string, agentId: string, now: number): void {
  withTransaction(orchDir, () => { closeOpen(orchDir, agentSpaces, agentId, now); });
}

export function setTuning(orchDir: string, agentId: string, now: number, values: TuningValues): void {
  withTransaction(orchDir, () => {
    closeOpen(orchDir, agentTunings, agentId, now);
    orm(orchDir).insert(agentTunings).values({
      agentId, since: now, until: null, model: values.model, thinking: values.thinking ?? null,
    }).run();
  });
}

/** A plexer is a plain membership, not an interval: an agent is in one plexer
 *  for its whole life, and moving between plexers is a new agent. */
export function setAgentPlexer(orchDir: string, agentId: string, plexerId: string): void {
  orm(orchDir).insert(agentPlexers).values({ agentId, plexerId }).run();
}

export function currentProcess(orchDir: string, agentId: string): ProcessRow | undefined {
  return orm(orchDir).select().from(agentProcesses)
    .where(and(eq(agentProcesses.agentId, agentId), isNull(agentProcesses.until))).get();
}

export function currentHandle(orchDir: string, agentId: string): HandleRow | undefined {
  return orm(orchDir).select().from(agentHandles)
    .where(and(eq(agentHandles.agentId, agentId), isNull(agentHandles.until))).get();
}

export function currentSpace(orchDir: string, agentId: string): SpaceRow | undefined {
  return orm(orchDir).select().from(agentSpaces)
    .where(and(eq(agentSpaces.agentId, agentId), isNull(agentSpaces.until))).get();
}

export function currentTuning(orchDir: string, agentId: string): TuningRow | undefined {
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
 * A recorded start token is checked against the live process, so a pid reused by
 * an unrelated process reads as DEAD. A row with no token falls back to bare
 * liveness: it is all that was recorded, and inventing a stricter answer than
 * the record supports would report live agents as gone.
 */
export function recordedProcessIsLive(orchDir: string, agentId: string): boolean {
  const row = currentProcess(orchDir, agentId);
  if (row === undefined) return false;
  return row.startToken !== null && row.startToken.length > 0
    ? processInstanceMatches(row.pid, row.startToken)
    : processIsAlive(row.pid);
}
