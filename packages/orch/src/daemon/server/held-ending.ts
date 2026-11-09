// What orchd records as it lets go of the PTYs it holds: a stop or a reload ends each one,
// and each agent in them ends saying why, so the host that asked for it reads the reason.
import { hostIdentity } from "../../hosts/identity.ts";
import { isAgentState } from "../../agent-state.ts";
import { recordAgentStatus } from "../../presence/store.ts";
import { agentView } from "../../store/agent-view.ts";
import { endAgent } from "../../store/agent-rows.ts";
import { placeHere } from "../../process-place.ts";
import { publishFromOrchd } from "./events.ts";
import { transitionEventFromRow } from "./status-events.ts";
import type { DaemonState } from "./state.ts";

/** End every live agent whose PTY this orchd holds, with `why` orchd is going as its reason,
 *  and publish its ending. Called before the PTYs go, so the events name live agents. */
export function endHeldAgents(state: DaemonState, why: string): void {
  const directory = state.directory;
  const reason = `orchd on ${hostIdentity().name} ${why}, which ended the PTY it held`;
  for (const id of state.held.ids()) {
    // A login terminal is held too, and is no agent.
    if (agentView(directory, id)?.endedAt !== null) continue;
    const now = Date.now();
    const { previous, current } = recordAgentStatus(directory, placeHere(directory, id), { state: "exited", lastError: reason }, now);
    const was = previous !== undefined && isAgentState(previous.state) ? previous.state : "unknown";
    publishFromOrchd(state, transitionEventFromRow(directory, current, was, "exited"));
    endAgent(directory, id, now, null);
  }
}
