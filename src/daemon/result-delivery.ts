import { appendPeerInbox } from "../agent/peers.ts";
import { presenceAgentDir } from "../presence/writer.ts";
import { attemptsOf, taskById } from "../store/task-rows.ts";
import { agentById } from "../store/agent-rows.ts";

/**
 * Cq4 — "Results go to the enqueuer, not the runner — cross-pack delivery is
 * orch↔orch messaging."
 *
 * Keying an EVENT to the enqueuer is not delivery: an event stream is read by
 * whoever happens to be watching, and a cross-pack enqueuer usually is not.
 * There is no shared parent to hand the result up through either, because the
 * two agents are in different packs by definition. So the result travels the
 * way every other orch↔orch message does — `inbox.jsonl`, through the one
 * writer that already exists (Rule 11: delivery and read are ORCH's mechanism,
 * and a pane is only an optimisation).
 *
 * Best-effort on purpose: the task is already settled when this runs, and an
 * undeliverable result must never unsettle it or throw into the work loop.
 */
export function deliverTaskResult(orchDir: string, taskId: string): void {
  const task = taskById(orchDir, taskId);
  if (!task) return;
  const settled = attemptsOf(orchDir, taskId).findLast((attempt) => attempt.outcome !== null);
  if (!settled) return;
  // The runner asked for nothing; delivering its own result back to it is noise.
  if (settled.agentId === task.enqueuedBy) return;

  const runner = agentById(orchDir, settled.agentId);
  const runnerName = runner?.name ?? settled.agentId;
  const body = settled.outcome === "done"
    ? `[result from ${runnerName}] ${task.text}\n${JSON.stringify(settled.result)}`
    : `[failed on ${runnerName}] ${task.text}\n${settled.error ?? "no error recorded"}`;

  try {
    appendPeerInbox(presenceAgentDir(task.enqueuedBy, orchDir), body);
  } catch {
    // An enqueuer with no presence directory has nowhere to receive; that is an
    // answer, not a failure, and the settlement stands either way.
  }
}
