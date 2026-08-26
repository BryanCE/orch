import { openStore, withTransaction } from "./connection.ts";

export interface StoredEvent {
  seq: number;
  ts: string;
  event: unknown;
}

interface EventRow {
  seq: number;
  ts: string;
  payload: string;
}

function rowToStoredEvent(row: EventRow): StoredEvent {
  return { seq: Number(row.seq), ts: row.ts, event: JSON.parse(row.payload) as unknown };
}

function eventPayload(event: unknown): string {
  const payload = JSON.stringify(event);
  if (payload === undefined) throw new TypeError("event must be JSON-serializable");
  return payload;
}

export function appendEvent(orchDir: string, ts: string, event: unknown): StoredEvent {
  return withTransaction(orchDir, () => {
    const db = openStore(orchDir);
    db.query("INSERT INTO events (ts, payload) VALUES (?, ?)").run(ts, eventPayload(event));
    const row = db.query("SELECT seq, ts, payload FROM events ORDER BY seq DESC LIMIT 1").get() as EventRow | null;
    if (!row) throw new Error("event insert did not produce a row");
    return rowToStoredEvent(row);
  });
}

export function selectEventsSince(orchDir: string, seq: number, limit: number): StoredEvent[] {
  const rows = openStore(orchDir)
    .query("SELECT seq, ts, payload FROM events WHERE seq > ? ORDER BY seq ASC LIMIT ?")
    .all(seq, limit) as EventRow[];
  return rows.map(rowToStoredEvent);
}

export function oldestEventSeq(orchDir: string): number | undefined {
  const row = openStore(orchDir).query("SELECT seq FROM events ORDER BY seq ASC LIMIT 1").get() as { seq: number } | null;
  return row ? Number(row.seq) : undefined;
}

export function deleteEventsBefore(orchDir: string, cutoffIso: string): number {
  return openStore(orchDir).query("DELETE FROM events WHERE ts < ?").run(cutoffIso).changes;
}
