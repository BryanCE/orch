import type { Logger, OrchDir } from "../../types/core.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import type { ResultReport, StatusPatch } from "../../types/presence.ts";
import type { RunRecord } from "../../types/store.ts";
import { isAgentState } from "../../agent-state.ts";
import { agentView } from "../../store/agent-view.ts";
import { type AgentStatusRow } from "../../store/status-rows.ts";
import { upsertRun } from "../../store/run-rows.ts";
import { appendStatusHistory, writeResult } from "../../presence/history.ts";
import { loadPresence, probeAllProcesses, reapDeadAgentRecords, recordAgentStatus, runIsSettled } from "../../presence/store.ts";
import { askingEventFromRow, transitionEventFromRow } from "./status-events.ts";

const TERMINAL_STATES = new Set(["done", "error", "aborted", "exited"]);

function runFromRow(orchDir: OrchDir, row: AgentStatusRow, now: number): RunRecord | undefined {
  if (row.dispatchId === null || row.state === "idle") return undefined;
  const run: RunRecord = {
    dispatchId: row.dispatchId,
    agentKey: row.agentId,
    state: row.state,
    startedAt: row.startedAt ?? now,
  };
  const view = agentView(orchDir, row.agentId);
  if (view) run.adapter = view.harnessId;
  if (row.modelId !== null) run.model = row.modelId;
  if (row.task !== null) run.task = row.task;
  if (TERMINAL_STATES.has(row.state) && row.finishedAt !== null) run.finishedAt = row.finishedAt;
  if (row.tokensIn !== null) run.tokensIn = row.tokensIn;
  if (row.tokensOut !== null) run.tokensOut = row.tokensOut;
  if (row.cacheRead !== null) run.cacheRead = row.cacheRead;
  if (row.cacheWrite !== null) run.cacheWrite = row.cacheWrite;
  if (row.cost !== null) run.cost = row.cost;
  if (row.turns !== null) run.turns = row.turns;
  if (row.lastError !== null) run.lastError = row.lastError;
  return run;
}


export function acceptStatusReport(
  orchDir: OrchDir,
  key: string,
  patch: StatusPatch,
  publish: (event: NotifyEvent) => void,
  now = Date.now(),
): { ok: true } {
  if (agentView(orchDir, key) === null) throw new Error(`agent ${key} does not exist`);
  const { previous, current } = recordAgentStatus(orchDir, key, patch, now);
  appendStatusHistory(key, orchDir, { ts: now, key, ...patch });
  try {
    const run = runFromRow(orchDir, current, now);
    if (run !== undefined && !runIsSettled(orchDir, run.dispatchId)) upsertRun(orchDir, run);
  } catch {
    // History is a bystander: a failed run write cannot reject a report.
  }
  const previousState = previous?.state;
  if (previous !== undefined && isAgentState(previousState) && isAgentState(current.state) && previousState !== current.state) {
    publish(current.state === "asking"
      ? askingEventFromRow(orchDir, current, previousState, 1, false)
      : transitionEventFromRow(orchDir, current, previousState, current.state));
  }
  return { ok: true };
}

export function acceptResultReport(
  orchDir: OrchDir,
  key: string,
  result: ResultReport,
  now = Date.now(),
): { ok: true } {
  if (agentView(orchDir, key) === null) throw new Error(`agent ${key} does not exist`);
  writeResult(key, orchDir, { ts: now, key, ...result });
  if (result.dispatchId !== null && result.dispatchId !== undefined) {
    try {
      const run: RunRecord = {
        dispatchId: result.dispatchId,
        agentKey: key,
        state: "done",
        startedAt: now,
        result: result.text,
      };
      if (result.finishedAt !== undefined) run.finishedAt = result.finishedAt;
      if (result.task !== null && result.task !== undefined) run.task = result.task;
      if (result.model !== null && result.model !== undefined) run.model = result.model.id;
      if (result.tokens !== null && result.tokens !== undefined) {
        run.tokensIn = result.tokens.input;
        run.tokensOut = result.tokens.output;
        run.cacheRead = result.tokens.cacheRead;
        run.cacheWrite = result.tokens.cacheWrite;
      }
      if (result.cost !== null && result.cost !== undefined) run.cost = result.cost;
      if (result.turns !== null && result.turns !== undefined) run.turns = result.turns;
      upsertRun(orchDir, run);
    } catch {
      // History is a bystander: a failed run write cannot reject a report.
    }
  }
  return { ok: true };
}

export function startLivenessTick(
  orchDir: OrchDir,
  intervalMs: number,
  publish: (event: NotifyEvent) => void,
  logger: Logger,
): { stop(): void } {
  // An agent is alive while its harness process runs. Once it is gone its
  // exit is announced and its rows leave the store; the JSONL history keeps
  // what it did.
  const tick = (): void => {
    const startedAt = Date.now();
    probeAllProcesses(orchDir);
    let exited = 0;
    for (const entry of loadPresence(orchDir).values()) {
      const row = entry.status;
      if (row === null || row.state === "exited" || !isAgentState(row.state)) continue;
      if (entry.alive) continue;
      const now = Date.now();
      const { current: updated } = recordAgentStatus(orchDir, row.agentId, { state: "exited", finishedAt: now }, now);
      exited += 1;
      publish(transitionEventFromRow(orchDir, updated, row.state, "exited", new Date(now)));
    }
    const reaped = reapDeadAgentRecords(orchDir);
    if (reaped.length > 0) logger.info("agents.reaped", { agents: reaped.join(",") });
    logger.trace("tick.liveness", { exited, reaped: reaped.length, elapsedMs: Date.now() - startedAt });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}
