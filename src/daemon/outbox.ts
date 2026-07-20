import {
  bumpOutboxAttempt,
  markOutboxDelivered,
  selectPendingOutbox,
} from "../store/sqlite.ts";

export interface OutboxDeps {
  deliver(target: string, payload: unknown, id: string): Promise<boolean>;
  now(): number;
}

const inFlight = new Set<string>();

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
  const messages = selectPendingOutbox(orchDir, deps.now());
  let delivered = 0;
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
