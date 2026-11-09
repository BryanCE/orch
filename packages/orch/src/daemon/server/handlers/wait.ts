// Waiting on an agent to report a state, where it runs: this orchd reads the states its own
// agents report; an agent on a linked host is waited on by that host's orchd.
import { callerMayResolveFor, refuseForeignTarget } from "../../../entities/resolve.ts";
import { selectAgentStatus } from "../../../store/status-rows.ts";
import { retryingAsync } from "../../../retry.ts";
import { isAgentState, type AgentState } from "../../../agent-state.ts";
import { atAgentHost, driveOnHost } from "./host.ts";
import type { DaemonState } from "../state.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

/** The state an agent this orchd runs last reported, or null when it reported none orch knows. */
function reportedState(state: DaemonState, key: string): AgentState | null {
  const reported = selectAgentStatus(state.directory, key)?.state;
  return isAgentState(reported) ? reported : null;
}

/** Wait until an agent this orchd runs reports `status`, or until `timeoutMs` passes. */
export async function waitHere(state: DaemonState, key: string, status: AgentState, timeoutMs: number): Promise<ResultOf<"agent-wait">> {
  const pollMs = state.services.settings.current().timeouts.reset_poll_ms;
  const reached = await retryingAsync("await agent state", () => reportedState(state, key) === status, { attempts: Math.max(1, Math.ceil(timeoutMs / pollMs)), delayMs: pollMs, backoff: 1 }, { retryOnResult: (hit) => !hit });
  return { reached, state: reportedState(state, key) };
}

/** `agent-wait`: wait on an agent wherever it runs. */
export async function waitAnywhere(state: DaemonState, params: ParamsOf<"agent-wait">): Promise<ResultOf<"agent-wait">> {
  const { target: key, status, timeoutMs } = params;
  if (!callerMayResolveFor(state.directory, params.caller, { key })) refuseForeignTarget(key);
  return await atAgentHost(state, key, {
    here: () => waitHere(state, key, status, timeoutMs),
    there: async (link) => {
      const { reached, state: last } = await driveOnHost(state, link, { action: "wait", key, status, timeoutMs, actor: null });
      return { reached, state: last };
    },
  });
}
