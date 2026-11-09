import type { OrchDir } from "../types/core.ts";
import { and, asc, eq, gt, inArray, lt, max, sql } from "drizzle-orm";
import { orm, queueWrite, registerMemoReset } from "./connection.ts";
import { agentOrigins, events } from "../db/schema.ts";
import type { HostId } from "../types/host.ts";
import type { StoredEvent } from "../types/store.ts";

type EventRow = typeof events.$inferSelect;

const eventSeqs = new Map<OrchDir, number>();

function rowToStoredEvent(row: EventRow): StoredEvent {
  return { seq: row.seq, ts: row.ts, event: JSON.parse(row.payload) };
}

function eventPayload(event: unknown): string {
  const payload = JSON.stringify(event);
  if (payload === undefined) throw new TypeError("event must be JSON-serializable");
  return payload;
}

function nextEventSeq(orchDir: OrchDir): number {
  const known = eventSeqs.get(orchDir);
  if (known !== undefined) {
    const next = known + 1;
    eventSeqs.set(orchDir, next);
    return next;
  }
  const row = orm(orchDir).select({ seq: max(events.seq) }).from(events).get();
  const next = Number(row?.seq ?? 0) + 1;
  eventSeqs.set(orchDir, next);
  return next;
}

export function appendEvent(orchDir: OrchDir, ts: number, event: unknown): StoredEvent {
  const seq = nextEventSeq(orchDir);
  const payload = eventPayload(event);
  queueWrite(orchDir, (db) => {
    db.insert(events).values({ seq, ts, payload }).run();
  });
  return { seq, ts, event };
}

function forgetEventSeqs(): void {
  eventSeqs.clear();
}

registerMemoReset(forgetEventSeqs);

/** Events after `seq`, oldest first. With `origin`, only events about agents that host asked
 *  this one to run, filtered here so the limit counts only those. */
export function selectEventsSince(orchDir: OrchDir, seq: number, limit: number, origin?: HostId): StoredEvent[] {
  const after = gt(events.seq, seq);
  const about = origin === undefined
    ? after
    : and(after, inArray(sql`json_extract(${events.payload}, '$.key')`, orm(orchDir).select({ id: agentOrigins.agentId }).from(agentOrigins).where(eq(agentOrigins.askedByHostId, origin))));
  return orm(orchDir).select().from(events).where(about)
    .orderBy(asc(events.seq)).limit(limit).all().map(rowToStoredEvent);
}

export function oldestEventSeq(orchDir: OrchDir): number | undefined {
  const row = orm(orchDir).select({ seq: events.seq }).from(events).orderBy(asc(events.seq)).limit(1).get();
  return row === undefined ? undefined : Number(row.seq);
}

export function deleteEventsBefore(orchDir: OrchDir, cutoff: number): number {
  return Number(orm(orchDir).delete(events).where(lt(events.ts, cutoff)).run().changes);
}
