// What this orchd does with an event a linked host's orchd sent about an agent this host
// asked it to run. The work, its logs and its history stay on that host. Its state lands
// on this host's row for the agent, and the event is published here naming the host, so
// every agent the human started is followed from this one place.
import { agentView } from "../../store/agent-view.ts";
import { recordAgentStatus } from "../../presence/store.ts";
import { publishFromOrchd } from "./events.ts";
import type { DaemonState } from "./state.ts";
import type { LinkedHost } from "../../types/process.ts";
import type { NotifyEvent } from "../../types/notify.ts";

export function applyHostEvent(state: DaemonState, host: LinkedHost, event: NotifyEvent): void {
  if ((event.type === "transition" || event.type === "asking") && agentView(state.directory, event.key) !== null) {
    recordAgentStatus(state.directory, event.key, { state: event.newState }, Date.now());
  }
  publishFromOrchd(state, { ...event, host: host.name });
}
