import { openStore } from "./connection.ts";

export interface OutboxMessageInput {
  id: string;
  target: string;
  payload: unknown;
  createdAt?: string;
}

export interface OutboxMessage {
  id: string;
  target: string;
  payload: unknown;
  state: "pending" | "delivered";
  attempts: number;
  createdAt: string;
  nextAttemptAt: number;
}

interface OutboxRow {
  id: string;
  target: string;
  payload: string;
  state: string;
  attempts: number;
  created_at: string;
  next_attempt_at: number;
}

function rowToOutboxMessage(row: OutboxRow): OutboxMessage {
  return {
    id: row.id,
    target: row.target,
    payload: JSON.parse(row.payload) as unknown,
    state: row.state as OutboxMessage["state"],
    attempts: row.attempts,
    createdAt: row.created_at,
    nextAttemptAt: row.next_attempt_at,
  };
}

/** Insert a pending message; synchronous so callers may use it in a transaction. */
export function insertOutboxMessage(orchDir: string, msg: OutboxMessageInput): void {
  const createdAt = msg.createdAt ?? new Date().toISOString();
  openStore(orchDir)
    .query(
      `INSERT INTO outbox (id, target, payload, state, attempts, created_at, next_attempt_at)
       VALUES (?, ?, ?, 'pending', 0, ?, 0)`,
    )
    .run(msg.id, msg.target, JSON.stringify(msg.payload), createdAt);
}

export function selectPendingOutbox(orchDir: string, now: number): OutboxMessage[] {
  const rows = openStore(orchDir)
    .query(
      "SELECT id, target, payload, state, attempts, created_at, next_attempt_at FROM outbox WHERE state = 'pending' AND next_attempt_at <= ? ORDER BY created_at ASC",
    )
    .all(now) as OutboxRow[];
  return rows.map(rowToOutboxMessage);
}

/** Check one message's pending state without reading unrelated rows. */
export function outboxMessagePending(orchDir: string, id: string): boolean {
  const row = openStore(orchDir)
    .query("SELECT 1 FROM outbox WHERE id = ? AND state = 'pending' LIMIT 1")
    .get(id);
  return row != null;
}

export function markOutboxDelivered(orchDir: string, id: string): void {
  openStore(orchDir)
    .query("UPDATE outbox SET state = 'delivered' WHERE id = ? AND state = 'pending'")
    .run(id);
}

export function bumpOutboxAttempt(orchDir: string, id: string, nextAttemptAt: number): void {
  openStore(orchDir)
    .query(
      "UPDATE outbox SET attempts = attempts + 1, next_attempt_at = ? WHERE id = ? AND state = 'pending'",
    )
    .run(nextAttemptAt, id);
}

export function deleteDeliveredBefore(orchDir: string, cutoffIso: string): number {
  return openStore(orchDir).query("DELETE FROM outbox WHERE state = 'delivered' AND created_at < ?").run(cutoffIso).changes;
}
