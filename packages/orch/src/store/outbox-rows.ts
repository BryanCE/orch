import { and, asc, eq, inArray, lte, lt } from "drizzle-orm";
import { orm } from "./connection.ts";
import { outbox } from "../db/schema.ts";
import { isBridgeMessage } from "../control/bridge-message.ts";
import type { OutboxMessage, OutboxMessageInput, OutboxState } from "../types/store.ts";

/** States a retry loop still owes work for. */
const OPEN_OUTBOX_STATES: readonly OutboxState[] = ["pending", "awaiting"];

/** States nothing will ever move again. */
const SETTLED_OUTBOX_STATES: readonly OutboxState[] = ["delivered", "undeliverable"];

type OutboxRow = typeof outbox.$inferSelect;

function isOutboxState(value: string): value is OutboxState {
  return value === "pending" || value === "awaiting" || value === "delivered" || value === "undeliverable";
}

function toMessage(row: OutboxRow): OutboxMessage {
  if (!isOutboxState(row.state)) throw new Error(`invalid outbox state ${JSON.stringify(row.state)}`);
  let payload: unknown;
  try {
    payload = JSON.parse(row.payload);
  } catch {
    throw new Error(`invalid outbox payload for ${row.id}`);
  }
  if (!isBridgeMessage(payload)) throw new Error(`invalid outbox payload for ${row.id}`);
  return {
    id: row.id,
    target: row.target,
    payload,
    state: row.state,
    attempts: Number(row.attempts),
    createdAt: row.createdAt,
    nextAttemptAt: Number(row.nextAttemptAt),
  };
}

export function insertOutboxMessage(directory: string, message: OutboxMessageInput): void {
  orm(directory).insert(outbox).values({
    id: message.id,
    target: message.target,
    payload: JSON.stringify(message.payload),
    state: "pending",
    createdAt: message.createdAt ?? Date.now(),
    nextAttemptAt: 0,
  }).run();
}

export function selectPendingOutbox(directory: string, now: number): OutboxMessage[] {
  return orm(directory).select().from(outbox)
    .where(and(inArray(outbox.state, [...OPEN_OUTBOX_STATES]), lte(outbox.nextAttemptAt, now)))
    .orderBy(asc(outbox.createdAt))
    .all()
    .map(toMessage);
}

/** Every open write for a target, including rows waiting past their retry time. */
export function selectOpenOutboxForTarget(directory: string, target: string): OutboxMessage[] {
  return orm(directory).select().from(outbox)
    .where(and(eq(outbox.target, target), inArray(outbox.state, [...OPEN_OUTBOX_STATES])))
    .orderBy(asc(outbox.createdAt))
    .all()
    .map(toMessage);
}

/** Every target that still has an open write, once each. */
export function selectOpenOutboxTargets(directory: string): string[] {
  return orm(directory).selectDistinct({ target: outbox.target }).from(outbox)
    .where(inArray(outbox.state, [...OPEN_OUTBOX_STATES]))
    .all()
    .map((row) => row.target);
}

/** One message by id, whatever its state, for a caller delivering only its own write. */
export function selectOutboxMessage(directory: string, id: string): OutboxMessage | undefined {
  const row = orm(directory).select().from(outbox).where(eq(outbox.id, id)).limit(1).get();
  return row === undefined ? undefined : toMessage(row);
}

export function outboxMessageState(directory: string, id: string): OutboxState | undefined {
  const row = orm(directory).select({ state: outbox.state }).from(outbox).where(eq(outbox.id, id)).limit(1).get();
  if (row === undefined) return undefined;
  if (!isOutboxState(row.state)) throw new Error(`invalid outbox state ${JSON.stringify(row.state)}`);
  return row.state;
}

/** True while no channel has taken this write. The RPC fails on exactly this. */
export function outboxMessageUnsent(directory: string, id: string): boolean {
  return orm(directory).select({ id: outbox.id }).from(outbox)
    .where(and(eq(outbox.id, id), eq(outbox.state, "pending"))).limit(1).get() !== undefined;
}

/** True until the write settles, whether or not a channel has taken it. */
export function outboxMessageOpen(directory: string, id: string): boolean {
  return orm(directory).select({ id: outbox.id }).from(outbox)
    .where(and(eq(outbox.id, id), inArray(outbox.state, [...OPEN_OUTBOX_STATES]))).limit(1).get() !== undefined;
}

function settle(directory: string, id: string, state: Extract<OutboxState, "delivered" | "undeliverable">): void {
  orm(directory).update(outbox).set({ state })
    .where(and(eq(outbox.id, id), inArray(outbox.state, [...OPEN_OUTBOX_STATES]))).run();
}

/** Record that a channel took the write and an ack is expected. */
export function markOutboxAwaiting(directory: string, id: string): void {
  orm(directory).update(outbox).set({ state: "awaiting" })
    .where(and(eq(outbox.id, id), eq(outbox.state, "pending"))).run();
}

export function markOutboxDelivered(directory: string, id: string): void {
  settle(directory, id, "delivered");
}

/** Close a write whose target is gone. Retrying it costs every other write a turn. */
export function markOutboxUndeliverable(directory: string, id: string): void {
  settle(directory, id, "undeliverable");
}

/** Close every open write to an agent that has ended, answering with how many.
 *  Nothing will ever read them, and left open they retried forever. */
export function closeOutboxForTarget(directory: string, target: string): number {
  return Number(orm(directory).update(outbox).set({ state: "undeliverable" })
    .where(and(eq(outbox.target, target), inArray(outbox.state, [...OPEN_OUTBOX_STATES]))).run().changes);
}

export function bumpOutboxAttempt(directory: string, id: string, nextAttemptAt: number): void {
  const row = orm(directory).select({ attempts: outbox.attempts }).from(outbox).where(eq(outbox.id, id)).get();
  if (!row) return;
  orm(directory).update(outbox).set({ attempts: Number(row.attempts) + 1, nextAttemptAt })
    .where(and(eq(outbox.id, id), inArray(outbox.state, [...OPEN_OUTBOX_STATES]))).run();
}

export function deleteDeliveredBefore(directory: string, cutoff: number): number {
  return Number(orm(directory).delete(outbox)
    .where(and(inArray(outbox.state, [...SETTLED_OUTBOX_STATES]), lt(outbox.createdAt, cutoff))).run().changes);
}
