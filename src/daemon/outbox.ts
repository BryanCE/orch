import { readdirSync, readFileSync, renameSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { ACK_FILE } from "../presence/schema.ts";
import { presenceRoot } from "../presence/writer.ts";
import { isRecord } from "../util.ts";
import {
  bumpOutboxAttempt,
  markOutboxDelivered,
  outboxMessagePending,
  selectPendingOutbox,
} from "../store/outbox-rows.ts";

export interface OutboxDeps {
  deliver(target: string, payload: unknown, id: string): Promise<boolean>;
  now(): number;
}

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
    const claim = `${ackFile}.${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}.draining`;
    try {
      renameSync(ackFile, claim);
    } catch {
      continue;
    }

    let chunk = "";
    try {
      chunk = readFileSync(claim, "utf8");
    } catch {
      // A claimed but unreadable file cannot safely be retried.
    } finally {
      try { unlinkSync(claim); } catch { /* best-effort */ }
    }

    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      let parsed: unknown;
      try {
        parsed = JSON.parse(line);
      } catch {
        continue;
      }
      if (!isRecord(parsed) || typeof parsed.id !== "string" || !parsed.id
        || parsed.key !== key) continue;
      if (!outboxMessagePending(orchDir, parsed.id)) continue;
      markOutboxDelivered(orchDir, parsed.id);
      acknowledged += 1;
    }
  }
  return acknowledged;
}

function retryAt(now: number, attempts: number): number {
  const safeNow = Number.isFinite(now) ? Math.max(0, now) : 0;
  const safeAttempts = Number.isFinite(attempts) ? Math.max(0, Math.floor(attempts)) : 0;
  const delay = Math.min(30_000, 500 * 2 ** Math.min(safeAttempts, 6));
  return Math.min(Number.MAX_SAFE_INTEGER, safeNow + delay);
}

/**
 * Drain due messages. Calling this on daemon start resumes all pending rows,
 * including messages left unacknowledged before a restart.
 */
export async function drainOutbox(
  orchDir: string,
  deps: OutboxDeps,
): Promise<{ delivered: number; retried: number }> {
  let delivered = consumeOutboxAcks(orchDir);
  const messages = selectPendingOutbox(orchDir, deps.now());
  let retried = 0;

  for (const message of messages) {
    const key = `${orchDir}\u0000${message.id}`;
    if (inFlight.has(key)) continue;
    inFlight.add(key);
    try {
      let acknowledged = false;
      try {
        acknowledged = await deps.deliver(message.target, message.payload, message.id);
      } catch {
        acknowledged = false;
      }
      if (acknowledged) {
        markOutboxDelivered(orchDir, message.id);
        delivered += 1;
        continue;
      }

      bumpOutboxAttempt(orchDir, message.id, retryAt(deps.now(), message.attempts));
      retried += 1;
    } finally {
      inFlight.delete(key);
    }
  }

  return { delivered, retried };
}
