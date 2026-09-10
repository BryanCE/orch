/**
 * The dispatcher's wait for a control-command outcome.
 *
 * Control dispatch runs inside orchd (see dispatch.ts) and the agent reports
 * back to orchd over the same socket, so the wait is one in-process promise
 * settled by that report — no record to poll and no file in the path.
 *
 * Silence is never reported as success: an agent that never reports fails the
 * command, and the failure names why it went quiet so the caller knows whether
 * to wait or resend.
 */
import { readFileSync } from "node:fs";
import { inboxPath } from "../presence/inbox.ts";
import { isRecord } from "../util.ts";
import type { ControlOutcomeReport } from "../types/agent.ts";

const pending = new Map<string, (report: ControlOutcomeReport) => void>();

/** Hand an agent's report to whoever is waiting on it. */
export function settleControlOutcome(report: ControlOutcomeReport): void {
  pending.get(report.id)?.(report);
}

/** True while the request is still sitting in the agent's inbox, undrained. */
function stillQueued(dir: string, id: string): boolean {
  let lines: string[];
  try {
    lines = readFileSync(inboxPath(dir), "utf8").split("\n");
  } catch {
    return false;
  }
  return lines.some((line) => {
    try {
      const parsed: unknown = JSON.parse(line);
      return isRecord(parsed) && parsed.id === id;
    } catch {
      return false;
    }
  });
}

/** Why a silent agent went silent, so the caller knows whether to wait or resend. */
function silenceReason(dir: string, id: string, timeoutMs: number): string {
  return stillQueued(dir, id)
    ? `agent did not report an outcome within ${timeoutMs}ms: still queued in its inbox, and applies when the current turn ends`
    : `agent did not report an outcome within ${timeoutMs}ms: consumed from its inbox without reporting one, so the request was dropped`;
}

/**
 * Block until the agent reports the outcome of control command `id`, then throw
 * on failure. A harness that never reports within `timeoutMs` is itself a
 * failure — silence is never reported as success.
 */
export async function awaitControlOutcome(dir: string, id: string, timeoutMs: number): Promise<void> {
  const report = await new Promise<ControlOutcomeReport>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(silenceReason(dir, id, timeoutMs)));
    }, timeoutMs);
    pending.set(id, (value) => {
      clearTimeout(timer);
      pending.delete(id);
      resolve(value);
    });
  });
  if (report.error !== undefined) throw new Error(report.error);
}
