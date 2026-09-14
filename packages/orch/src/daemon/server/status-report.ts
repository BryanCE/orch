import type { OrchDir } from "../../types/core.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import type { ResultReport, StatusPatch } from "../../types/presence.ts";
import type { RunRecord } from "../../types/store.ts";
import { isAgentState } from "../../agent-state.ts";
import { agentView } from "../../store/agent-view.ts";
import { agentProcessLive } from "../../store/interval-rows.ts";
import { mergeAgentStatus, selectAgentStatuses, type AgentStatusRow } from "../../store/status-rows.ts";
import { upsertRun } from "../../store/run-rows.ts";
import { appendStatusHistory, ensurePresenceAgentDir, writeResult } from "../../presence/history.ts";
import { reapDeadAgentRecords } from "../../presence/store.ts";
import { decisionLogger } from "../client/decision-log.ts";
import { askingEventFromRow, transitionEventFromRow } from "./status-events.ts";

const TERMINAL_STATES = new Set(["done", "error", "aborted", "exited", "idle"]);

function runFromRow(orchDir: OrchDir, row: AgentStatusRow, now: number): RunRecord | undefined {
  if (row.dispatchId === null) return undefined;
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
  const { previous, current } = mergeAgentStatus(orchDir, key, patch, now);
  const directory = ensurePresenceAgentDir(key, orchDir);
  try {
    if (directory !== undefined) appendStatusHistory(directory, { ts: now, key, ...patch });
  } catch {
    // History is a bystander: a failed append cannot reject a report.
  }
  try {
    const run = runFromRow(orchDir, current, now);
    if (run !== undefined) upsertRun(orchDir, run);
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
  const directory = ensurePresenceAgentDir(key, orchDir);
  try {
    if (directory !== undefined) writeResult(directory, { ts: now, key, ...result });
  } catch {
    // History is a bystander: a failed append cannot reject a report.
  }
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
): { stop(): void } {
  // An agent is alive while its harness process runs. Once it is gone its
  // exit is announced and its rows leave the store; the JSONL history keeps
  // what it did.
  const tick = (): void => {
    for (const row of selectAgentStatuses(orchDir)) {
      if (row.state === "exited" || !isAgentState(row.state)) continue;
      if (agentProcessLive(orchDir, row.agentId)) continue;
      const now = Date.now();
      const updated = mergeAgentStatus(orchDir, row.agentId, { state: "exited", finishedAt: now }, now);
      publish(transitionEventFromRow(orchDir, updated.current, row.state, "exited", new Date(now)));
    }
    const reaped = reapDeadAgentRecords(orchDir);
    if (reaped.length > 0) decisionLogger(orchDir, null).info("agents.reaped", { agents: reaped.join(",") });
  };
  const timer = setInterval(tick, intervalMs);
  timer.unref?.();
  return { stop: () => clearInterval(timer) };
}
