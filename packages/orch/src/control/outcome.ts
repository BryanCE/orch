/**
 * The dispatcher's wait for a control-command outcome.
 *
 * Control dispatch runs inside orchd (see dispatch.ts) and the agent reports
 * back to orchd over the same socket. The wait is one in-process promise
 * settled by the control-outcome RPC.
 */
import type { ControlOutcomeReport } from "../types/agent.ts";

const pending = new Map<string, (report: ControlOutcomeReport) => void>();

/** Hand an agent's report to whoever is waiting on it. */
export function settleControlOutcome(report: ControlOutcomeReport): void {
  pending.get(report.id)?.(report);
}

/**
 * Block until the agent reports the outcome of control command `id`, then throw
 * on failure. A harness that never reports within `timeoutMs` is itself a
 * failure — silence is never reported as success.
 */
export async function awaitControlOutcome(id: string, timeoutMs: number): Promise<void> {
  const report = await new Promise<ControlOutcomeReport>((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`agent took the model command but reported no outcome within ${timeoutMs}ms`));
    }, timeoutMs);
    pending.set(id, (value) => {
      clearTimeout(timer);
      pending.delete(id);
      resolve(value);
    });
  });
  if (report.error !== undefined) throw new Error(report.error);
}
