import type { OrchDir } from "../../types/core.ts";
import { isAgentGone } from "../../control/agent-gone.ts";
import { isBridgeDetached } from "../../control/bridge-links.ts";
import type { OutboxDelivery, OutboxDeps } from "../../types/daemon.ts";
import type { OutboxMessage } from "../../types/store.ts";
import {
  bumpOutboxAttempt,
  markOutboxDelivered,
  markOutboxAwaiting,
  markOutboxUndeliverable,
  outboxMessageOpen,
  selectOpenOutboxForTarget,
  selectOutboxMessage,
  selectPendingOutbox,
} from "../../store/outbox-rows.ts";

const inFlight = new Set<string>();

function retryDelay(attempts: number): number {
  const safeAttempts = Number.isFinite(attempts) ? Math.max(0, Math.floor(attempts)) : 0;
  return Math.min(30_000, 500 * 2 ** Math.min(safeAttempts, 6));
}

function retryAt(now: number, attempts: number): number {
  const safeNow = Number.isFinite(now) ? Math.max(0, now) : 0;
  return Math.min(Number.MAX_SAFE_INTEGER, safeNow + retryDelay(attempts));
}

/** What one delivery attempt did to its row. */
type AttemptResult = "delivered" | "retried" | "awaiting" | "undeliverable" | "in-flight" | "skipped";

/**
 * Attempt one message, settling or rescheduling its row.
 *
 * The only place a row changes state, so the caller delivering its own write and
 * the loop draining the backlog cannot disagree about what an outcome means.
 */
async function attemptDelivery(orchDir: OrchDir, message: OutboxMessage, deps: OutboxDeps): Promise<AttemptResult> {
  const key = `${orchDir}\u0000${message.id}`;
  if (inFlight.has(key)) return "in-flight";
  if (!outboxMessageOpen(orchDir, message.id)) return "skipped";
  inFlight.add(key);
  try {
    const log = deps.logger?.forCorrelation(message.id);
    log?.info("dispatch.delivering", { target: message.target, attempt: message.attempts });
    let outcome: OutboxDelivery;
    let retryReason: "bridge-detached" | "error" = "error";
    try {
      outcome = await deps.deliver(message.target, message.payload, message.id);
    } catch (error: unknown) {
      if (isAgentGone(error)) {
        outcome = "gone";
      } else {
        outcome = "failed";
        retryReason = isBridgeDetached(error) ? "bridge-detached" : "error";
      }
    }
    if (outcome === "acked") {
      markOutboxDelivered(orchDir, message.id);
      return "delivered";
    }
    // A write nobody can ever take is closed here. Left open it came back every
    // retry forever, and each new dispatch waited behind that whole backlog.
    if (outcome === "gone") {
      markOutboxUndeliverable(orchDir, message.id);
      log?.warn("dispatch.undeliverable", { target: message.target, attempts: message.attempts + 1 });
      return "undeliverable";
    }

    if (outcome === "failed" && message.attempts + 1 >= deps.maxAttempts) {
      markOutboxUndeliverable(orchDir, message.id);
      log?.warn("dispatch.undeliverable", {
        target: message.target,
        attempts: message.attempts + 1,
        reason: "attempts-exhausted",
      });
      return "undeliverable";
    }

    // A queued message is re-delivered only if no ack arrives on the socket.
    const delay = retryDelay(message.attempts);
    bumpOutboxAttempt(orchDir, message.id, retryAt(deps.now(), message.attempts));
    if (outcome === "queued") {
      markOutboxAwaiting(orchDir, message.id);
      log?.debug("dispatch.awaiting-ack", { target: message.target, attempt: message.attempts, delay });
      return "awaiting";
    }
    log?.debug("retry.attempt", { target: message.target, attempt: message.attempts + 1, delay, reason: retryReason });
    return "retried";
  } finally {
    inFlight.delete(key);
  }
}

/**
 * Deliver ONE write, for the caller that just queued it.
 *
 * Accepting a dispatch must never wait on the whole backlog: one orch's dead
 * agent held every other orch's send behind it until the RPC timed out.
 */
export async function deliverOutboxMessage(orchDir: OrchDir, id: string, deps: OutboxDeps): Promise<void> {
  const message = selectOutboxMessage(orchDir, id);
  if (message === undefined) return;
  await attemptDelivery(orchDir, message, deps);
}

/** Re-deliver every open row for a target when its bridge attaches. */
export async function redeliverOpenRows(orchDir: OrchDir, target: string, deps: OutboxDeps): Promise<void> {
  for (const message of selectOpenOutboxForTarget(orchDir, target)) {
    await attemptDelivery(orchDir, message, deps);
  }
}

/**
 * Drain due messages. Calling this on daemon start resumes all pending rows,
 * including messages left unacknowledged before a restart.
 */
export async function drainOutbox(
  orchDir: OrchDir,
  deps: OutboxDeps,
): Promise<{ retried: number; awaiting: number }> {
  let retried = 0;
  let awaiting = 0;

  for (const message of selectPendingOutbox(orchDir, deps.now())) {
    const result = await attemptDelivery(orchDir, message, deps);
    if (result === "retried") retried += 1;
    else if (result === "awaiting") awaiting += 1;
  }

  return { retried, awaiting };
}
