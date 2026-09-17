import type { Logger, OrchDir } from "../../types/core.ts";
import { acceptMail } from "./mail.ts";
import { attemptsOf, taskById, type AttemptRow } from "../../store/task-rows.ts";
import { agentById } from "../../store/agent-rows.ts";
import type { OrchSettings } from "../../types/settings.ts";

/**
 * Cq4 — "Results go to the enqueuer, not the runner — cross-pack delivery is
 * orch↔orch messaging."
 *
 * Keying an EVENT to the enqueuer is not delivery: an event stream is read by
 * whoever happens to be watching, and a cross-pack enqueuer usually is not.
 * There is no shared parent to hand the result up through either, because the
 * two agents are in different packs by definition. So the result travels as an
 * outbox row pushed down the enqueuer's bridge link.
 *
 * Best-effort on purpose: the task is already settled when this runs, and an
 * undeliverable result must never unsettle it or throw into the work loop.
 */
export function deliverTaskResult(orchDir: OrchDir, settings: OrchSettings | null, taskId: string, logger?: Logger): void {
  const task = taskById(orchDir, taskId);
  if (!task) return;
  const attempts = attemptsOf(orchDir, taskId);
  let settled: AttemptRow | undefined;
  for (let index = attempts.length - 1; index >= 0; index -= 1) {
    const attempt = attempts[index];
    if (attempt !== undefined && attempt.outcome !== null) { settled = attempt; break; }
  }
  if (settled === undefined) return;
  // The runner asked for nothing; delivering its own result back to it is noise.
  if (settled.agentId === task.enqueuedBy) return;

  const runner = agentById(orchDir, settled.agentId);
  const runnerName = runner?.name ?? settled.agentId;
  const body = settled.outcome === "done"
    ? `[result from ${runnerName}] ${task.text}\n${JSON.stringify(settled.result)}`
    : `[failed on ${runnerName}] ${task.text}\n${settled.error ?? "no error recorded"}`;

  try {
    acceptMail(orchDir, settings, settled.agentId, task.enqueuedBy, body, logger);
  } catch {
    // A missing or walled enqueuer has nowhere to receive; that is an answer,
    // not a failure, and the settlement stands either way.
  }
}
