/** Events composed from the agent_status row. The daemon accepted the report at the socket boundary; nothing here re-validates. */
import type { AgentState } from "../adapters/adapter.ts";
import { abstractAgentLabel } from "../notify/format.ts";
import { modelSpec } from "../policy/thinking.ts";
import { pendingQuestion } from "../store/question-rows.ts";
import { agentView } from "../store/agent-view.ts";
import { filesTouchedOf, type AgentStatusRow } from "../store/status-rows.ts";
import type { NotifyEvent } from "../types/notify.ts";
import type { OrchDir } from "../types/core.ts";
import { collapse, truncate } from "../util.ts";
import { stripWorkerHeader } from "../worker-prompt.ts";

type TransitionEvent = Extract<NotifyEvent, { readonly type: "transition" }>;
type AskingEvent = Extract<NotifyEvent, { readonly type: "asking" }>;

function tokensOf(row: AgentStatusRow): TransitionEvent["tokens"] {
  const values = [row.tokensIn, row.tokensOut, row.cacheRead, row.cacheWrite];
  if (values.every((value) => value === null)) return undefined;
  return {
    ...(row.tokensIn === null ? {} : { input: row.tokensIn }),
    ...(row.tokensOut === null ? {} : { output: row.tokensOut }),
    ...(row.cacheRead === null ? {} : { cacheRead: row.cacheRead }),
    ...(row.cacheWrite === null ? {} : { cacheWrite: row.cacheWrite }),
  };
}

function composeBase(
  orchDir: OrchDir,
  row: AgentStatusRow,
  state: AgentState,
  now: Date,
): Omit<TransitionEvent, "type" | "oldState" | "newState"> {
  const key = row.agentId;
  const view = agentView(orchDir, key);
  const space = view?.environment.space ?? undefined;
  const question = pendingQuestion(orchDir, key)?.question ?? row.blockedMessage ?? undefined;
  const strippedTask = row.task === null ? undefined : stripWorkerHeader(row.task);
  const task = state === "asking" && question
    ? `Q: ${truncate(collapse(question), 80)}`
    : strippedTask
      ? truncate(collapse(strippedTask), 80)
      : undefined;
  const lastError = row.lastError ? collapse(row.lastError) : undefined;
  const lastText = row.lastText ? collapse(row.lastText) : undefined;
  const reason = state === "error" || state === "aborted"
    ? lastError
    : state === "blocked" || state === "asking"
      ? (question ? collapse(question) : undefined)
      : undefined;
  const filesTouched = filesTouchedOf(row);

  return {
    key,
    space,
    agent: view?.name ?? abstractAgentLabel(space ?? "space", key),
    name: view?.name ?? null,
    dispatchId: row.dispatchId ?? undefined,
    spawnedBy: view?.spawnedBy ?? undefined,
    spawnedByLabel: view?.spawnedByName ?? undefined,
    tab: null,
    model: row.modelId ? modelSpec(row.modelId, row.thinking ?? undefined) : null,
    ts: now.toISOString(),
    task,
    cost: row.cost ?? undefined,
    lastError,
    lastText,
    reason,
    ctxPercent: row.contextPercent ?? undefined,
    tokens: tokensOf(row),
    filesTouched: filesTouched.length > 0 ? filesTouched : undefined,
  };
}

export function transitionEventFromRow(
  orchDir: OrchDir,
  row: AgentStatusRow,
  previous: AgentState,
  state: Exclude<AgentState, "asking">,
  now = new Date(),
): TransitionEvent {
  return {
    ...composeBase(orchDir, row, state, now),
    type: "transition",
    oldState: previous,
    newState: state,
  };
}

export function askingEventFromRow(
  orchDir: OrchDir,
  row: AgentStatusRow,
  previous: AgentState,
  askCount: number,
  gaveUp: boolean,
  now = new Date(),
): AskingEvent {
  return {
    ...composeBase(orchDir, row, "asking", now),
    type: "asking",
    oldState: previous,
    newState: "asking",
    askCount,
    gaveUp,
  };
}
