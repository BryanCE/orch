import { asc, gt, lt } from "drizzle-orm";
import { orm } from "./connection.ts";
import { events } from "../db/schema.ts";
import type { StoredEvent } from "../types/store.ts";

type EventRow = typeof events.$inferSelect;

function rowToStoredEvent(row: EventRow): StoredEvent {
  return { seq: row.seq, ts: row.ts, event: JSON.parse(row.payload) };
}

function eventPayload(event: unknown): string {
  const payload = JSON.stringify(event);
  if (payload === undefined) throw new TypeError("event must be JSON-serializable");
  return payload;
}

export function appendEvent(orchDir: string, ts: number, event: unknown): StoredEvent {
  const row = orm(orchDir).insert(events).values({ ts, payload: eventPayload(event) }).returning().get();
  if (!row) throw new Error("event insert did not produce a row");
  return rowToStoredEvent(row);
}

export function selectEventsSince(orchDir: string, seq: number, limit: number): StoredEvent[] {
  return orm(orchDir).select().from(events).where(gt(events.seq, seq))
    .orderBy(asc(events.seq)).limit(limit).all().map(rowToStoredEvent);
}

export function oldestEventSeq(orchDir: string): number | undefined {
  const row = orm(orchDir).select({ seq: events.seq }).from(events).orderBy(asc(events.seq)).limit(1).get();
  return row === undefined ? undefined : Number(row.seq);
}

export function deleteEventsBefore(orchDir: string, cutoff: number): number {
  return Number(orm(orchDir).delete(events).where(lt(events.ts, cutoff)).run().changes);
}
