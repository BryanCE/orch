// What this orchd does with an event a linked host's orchd sent about an agent this host
// asked it to run. The work, its logs and its history stay on that host. Its state lands
// on this host's row for the agent, its ending ends the reference here, and the event is
// published here naming the host, so every agent the human started is followed from this
// one place.
import { agentView, agentViews } from "../../store/agent-view.ts";
import { isAgentState, type AgentState } from "../../agent-state.ts";
import { presenceEntry } from "../../presence/store.ts";
import { endAgent } from "../../store/agent-rows.ts";
import { agentLocation } from "../../store/interval-rows.ts";
import { recordAgentState } from "../../presence/store.ts";
import { publishRelayed } from "./events.ts";
import type { DaemonState } from "./state.ts";
import type { LinkedHost } from "../../types/process.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import type { PlaceFreeStatusPatch } from "../../types/presence.ts";
import type { StatusRow } from "../../types/command.ts";
import type { AgentView } from "../../types/store.ts";

/** Whether an event says the agent is gone on its host: closed there, or its process exited. */
function endsAgent(event: NotifyEvent): boolean {
  return event.type === "closed" || (event.type === "transition" && event.newState === "exited");
}

/** What a transition says of the agent's run, as the status this host keeps for it: what
 *  this host reads while it cannot ask the agent's host. */
function activityPatch(event: Extract<NotifyEvent, { type: "transition" | "asking" }>): PlaceFreeStatusPatch {
  const tokens = event.tokens;
  return {
    state: event.newState,
    ...(event.dispatchId === undefined ? {} : { dispatchId: event.dispatchId }),
    ...(event.task === undefined ? {} : { task: event.task }),
    ...(event.cost === undefined ? {} : { cost: event.cost }),
    ...(event.lastText === undefined ? {} : { lastText: event.lastText }),
    ...(event.lastError === undefined ? {} : { lastError: event.lastError }),
    ...(tokens === undefined ? {} : { tokens: { input: tokens.input ?? 0, output: tokens.output ?? 0, cacheRead: tokens.cacheRead ?? 0, cacheWrite: tokens.cacheWrite ?? 0 } }),
  };
}

export function applyHostEvent(state: DaemonState, host: LinkedHost, event: NotifyEvent): void {
  const directory = state.directory;
  // Only the host an agent runs on speaks for it.
  if (agentLocation(directory, event.key)?.host === host.id) {
    const now = Date.now();
    if (event.type === "transition" || event.type === "asking") recordAgentState(directory, event.key, activityPatch(event), now);
    if (endsAgent(event)) {
      if (agentView(directory, event.key)?.endedAt === null) endAgent(directory, event.key, now, null);
      // Its panes here stop showing it: each viewer's `orch attach` exits, and the pane with it.
      state.hosts.endScreen(event.key, `${event.agent ?? event.key} ${event.newState} on ${host.name}`);
    }
  }
  // The far orchd named the host its agent runs on; the event is published here as it came.
  publishRelayed(state, event);
}

/** The state a linked host's row gives an agent: exited once that host holds it as ended or
 *  holds no row for it at all, else what the row reports. Null when the row reports no state
 *  orch knows, which says nothing new. */
function stateThere(row: StatusRow | undefined): AgentState | null {
  if (row === undefined || row.exited || !row.alive) return "exited";
  return isAgentState(row.state) ? row.state : null;
}

/** The event a linked host would have published when an agent reached the state its row shows
 *  now, carrying what a monitor here prints for it: its task, its last text, its cost. */
function eventFromRow(view: AgentView, host: LinkedHost, row: StatusRow | undefined, oldState: AgentState, newState: AgentState): NotifyEvent {
  const base = {
    key: view.id,
    ts: new Date().toISOString(),
    agent: view.name,
    name: view.name,
    ...(view.environment.space === null ? {} : { space: view.environment.space }),
    tab: null,
    model: row?.model ?? null,
    host: view.environment.host,
    ...(view.spawnedBy === null ? {} : { spawnedBy: view.spawnedBy }),
    ...(view.heldBy === null ? {} : { holder: view.heldBy.orchId }),
    ...(row?.dispatchId == null ? {} : { dispatchId: row.dispatchId }),
    ...(row?.task ? { task: row.task } : {}),
    ...(row?.lastText ? { lastText: row.lastText } : {}),
    ...(row === undefined ? {} : { cost: row.cost }),
    ...(row === undefined
      ? { lastError: `${host.name} no longer holds this agent` }
      : row.endReason == null ? {} : { lastError: row.endReason }),
    oldState,
  };
  return newState === "asking"
    ? { ...base, type: "asking", newState, askCount: 1, gaveUp: false }
    : { ...base, type: "transition", newState };
}

/**
 * Bring this host's references level with what a linked host's orchd holds now of the agents
 * this host asked it to run, as its link comes up. Events move a reference only while that
 * host still keeps them: one it pruned, or one published by a store it has since replaced,
 * never arrives. Its rows are the state itself, so each reference that differs takes the
 * transition that host would have sent, and a monitor here sees it. An agent that host holds
 * as ended, or no longer holds, ends here. `askedAt` is when the rows were asked for: a
 * reference made since is not in them, and is left alone.
 */
export function reconcileHostAgents(state: DaemonState, host: LinkedHost, rows: readonly StatusRow[], askedAt: number): void {
  const directory = state.directory;
  const there = new Map(rows.map((row) => [row.key, row]));
  for (const view of agentViews(directory)) {
    if (view.endedAt !== null || view.environment.host.id !== host.id || view.createdAt >= askedAt) continue;
    const row = there.get(view.id);
    const known = presenceEntry(directory, view.id)?.status?.state;
    const oldState: AgentState = isAgentState(known) ? known : "unknown";
    const newState = stateThere(row);
    if (newState === null || newState === oldState) continue;
    state.services.logger.info("host.agent-reconciled", { host: host.name, agent: view.id, from: oldState, to: newState });
    applyHostEvent(state, host, eventFromRow(view, host, row, oldState, newState));
  }
}
