import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { decisionLogger } from "./decision-log.ts";
import { ACK_FILE } from "../presence/schema.ts";
import { drainClaimedLines } from "../presence/inbox.ts";
import { presenceRoot } from "../presence/writer.ts";
import { isRecord } from "../util.ts";
import type { OutboxDelivery, OutboxDeps } from "../types/daemon.ts";
import {
  bumpOutboxAttempt,
  markOutboxDelivered,
  markOutboxAwaiting,
  outboxMessageOpen,
  selectPendingOutbox,
} from "../store/outbox-rows.ts";

const inFlight = new Set<string>();

/**
 * Consume agent-written fallback acknowledgements. Each ack file is atomically
 * renamed before reading so markers appended during a drain stay in the live
 * file and are picked up by the next pass.
 */
export function consumeOutboxAcks(orchDir: string): number {
  const agentsDir = presenceRoot(orchDir);
  let keys: string[];
  try {
    keys = readdirSync(agentsDir);
  } catch {
    return 0;
  }

  let acknowledged = 0;
  for (const key of keys) {
    const agentDir = join(agentsDir, key);
    try {
      if (!statSync(agentDir).isDirectory()) continue;
    } catch {
      continue;
    }
    const ackFile = join(agentDir, ACK_FILE);
    for (const line of drainClaimedLines(ackFile)) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      if (!isRecord(parsed) || typeof parsed.id !== "string" || !parsed.id
        || parsed.key !== key) continue;
      if (!outboxMessageOpen(orchDir, parsed.id)) continue;
      markOutboxDelivered(orchDir, parsed.id);
      decisionLogger(orchDir).forCorrelation(parsed.id).info("dispatch.acked", { target: key });
      acknowledged += 1;
    }
  }
  return acknowledged;
}

function retryDelay(attempts: number): number {
  const safeAttempts = Number.isFinite(attempts) ? Math.max(0, Math.floor(attempts)) : 0;
  return Math.min(30_000, 500 * 2 ** Math.min(safeAttempts, 6));
}

function retryAt(now: number, attempts: number): number {
  const safeNow = Number.isFinite(now) ? Math.max(0, now) : 0;
  return Math.min(Number.MAX_SAFE_INTEGER, safeNow + retryDelay(attempts));
}

/**
 * Drain due messages. Calling this on daemon start resumes all pending rows,
 * including messages left unacknowledged before a restart.
 */
export async function drainOutbox(
  orchDir: string,
  deps: OutboxDeps,
): Promise<{ delivered: number; retried: number; awaiting: number }> {
  let delivered = consumeOutboxAcks(orchDir);
  const messages = selectPendingOutbox(orchDir, deps.now());
  let retried = 0;
  let awaiting = 0;

  for (const message of messages) {
    const key = `${orchDir}\u0000${message.id}`;
    if (inFlight.has(key)) continue;
    inFlight.add(key);
    try {
      const log = decisionLogger(orchDir).forCorrelation(message.id);
      log.info("dispatch.delivering", { target: message.target, attempt: message.attempts });
      let outcome: OutboxDelivery;
      try {
        outcome = await deps.deliver(message.target, message.payload, message.id);
      } catch {
        outcome = "failed";
      }
      if (outcome === "acked") {
        markOutboxDelivered(orchDir, message.id);
        delivered += 1;
        continue;
      }

      // Both remaining outcomes leave the row pending and schedule the next
      // look. A queued message is re-delivered only if no marker ever lands,
      // which is what makes the inbox at-least-once instead of fire-and-forget.
      const delay = retryDelay(message.attempts);
      bumpOutboxAttempt(orchDir, message.id, retryAt(deps.now(), message.attempts));
      if (outcome === "queued") {
        markOutboxAwaiting(orchDir, message.id);
        log.debug("dispatch.awaiting-ack", { target: message.target, attempt: message.attempts, delay });
        awaiting += 1;
        continue;
      }
      log.debug("retry.attempt", { target: message.target, attempt: message.attempts + 1, delay });
      retried += 1;
    } finally {
      inFlight.delete(key);
    }
  }

  return { delivered, retried, awaiting };
}
