// What this orchd does with an event a linked host's orchd sent about an agent this host
// asked it to run. The work, its logs and its history stay on that host. Its state lands
// on this host's row for the agent, its ending ends the reference here, and the event is
// published here naming the host, so every agent the human started is followed from this
// one place.
import { agentView } from "../../store/agent-view.ts";
import { endAgent } from "../../store/agent-rows.ts";
import { agentLocation } from "../../store/interval-rows.ts";
import { recordAgentState } from "../../presence/store.ts";
import { publishFromOrchd } from "./events.ts";
import type { DaemonState } from "./state.ts";
import type { LinkedHost } from "../../types/process.ts";
import type { NotifyEvent } from "../../types/notify.ts";

/** Whether an event says the agent is gone on its host: closed there, or its process exited. */
function endsAgent(event: NotifyEvent): boolean {
  return event.type === "closed" || (event.type === "transition" && event.newState === "exited");
}

export function applyHostEvent(state: DaemonState, host: LinkedHost, event: NotifyEvent): void {
  const directory = state.directory;
  // Only the host an agent runs on speaks for it.
  if (agentLocation(directory, event.key)?.host === host.id) {
    const now = Date.now();
    if (event.type === "transition" || event.type === "asking") recordAgentState(directory, event.key, { state: event.newState }, now);
    if (endsAgent(event)) {
      if (agentView(directory, event.key)?.endedAt === null) endAgent(directory, event.key, now, null);
      // Its panes here stop showing it: each viewer's `orch attach` exits, and the pane with it.
      state.hosts.endScreen(event.key, `${event.agent ?? event.key} ${event.newState} on ${host.name}`);
    }
  }
  // The far orchd named the host its agent runs on; the event is published here as it came.
  publishFromOrchd(state, event);
}
