// What this orchd does with an event a linked host's orchd sent about an agent this host
// asked it to run. The work, its logs and its history stay on that host. Its state lands
// on this host's row for the agent, its ending ends the reference here, and the event is
// published here naming the host, so every agent the human started is followed from this
// one place.
import { agentView } from "../../store/agent-view.ts";
import { endAgent } from "../../store/agent-rows.ts";
import { agentLocation } from "../../store/interval-rows.ts";
import { recordAgentState } from "../../presence/store.ts";
import { publishRelayed } from "./events.ts";
import type { DaemonState } from "./state.ts";
import type { LinkedHost } from "../../types/process.ts";
import type { NotifyEvent } from "../../types/notify.ts";
import type { PlaceFreeStatusPatch } from "../../types/presence.ts";

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
