// The fleet as orchd holds it, served whole: a command reads views, presence
// and entities from one answer instead of opening the store.
import { buildEntities, sortEntities } from "../../../entities/inventory.ts";
import { resolveTargetFor } from "../../../entities/resolve.ts";
import { loadPresence, presenceEntry } from "../../../presence/store.ts";
import { callerKindOf } from "../../../policy/caller.ts";
import { scopeCapacity } from "../../../policy/capacity.ts";
import { agentViews } from "../../../store/agent-view.ts";
import { agentProcessLive } from "../../../store/interval-rows.ts";
import { selectRun, selectRuns } from "../../../store/run-rows.ts";
import { selectAgentStatus } from "../../../store/status-rows.ts";
import type { CallerCredential, OrchDir } from "../../../types/core.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";
import { heldCapacity } from "../capacity.ts";

export function fleetSnapshot(state: DaemonState, params: ParamsOf<"fleet">): ResultOf<"fleet"> {
  const directory = state.directory;
  const settings = state.services.settings.current();
  return {
    views: agentViews(directory),
    presence: [...loadPresence(directory).values()],
    entities: sortEntities(buildEntities(directory, settings, { skipBackends: params?.skipBackends === true })),
  };
}

/** A reaped agent has no presence, only history; an operator may still read it by exact key. */
function reapedExactKey(directory: OrchDir, credential: CallerCredential, target: string): boolean {
  return callerKindOf(directory, credential) === "operator"
    && presenceEntry(directory, target) === undefined
    && selectRuns(directory, { agentKey: target, limit: 1 }).length > 0;
}

export function capacityOf(state: DaemonState, params: ParamsOf<"capacity">): ResultOf<"capacity"> {
  return scopeCapacity(heldCapacity(state.directory, state.services.settings.current()), params);
}

export function runsOf(state: DaemonState, params: ParamsOf<"runs">): ResultOf<"runs"> {
  const directory = state.directory;
  const target = params.target;
  const agentKey = target === undefined ? undefined
    : reapedExactKey(directory, params.caller, target) ? target
    : resolveTargetFor(directory, state.services.settings.current(), params.caller, target).key;
  return { runs: selectRuns(directory, { ...(agentKey === undefined ? {} : { agentKey }), ...(params.limit === undefined ? {} : { limit: params.limit }) }) };
}

export function runOf(directory: OrchDir, params: ParamsOf<"run">): ResultOf<"run"> {
  return { run: selectRun(directory, params.dispatchId) ?? null };
}

export function agentStatusOf(directory: OrchDir, params: ParamsOf<"agent-status">): ResultOf<"agent-status"> {
  return { status: selectAgentStatus(directory, params.target) ?? null };
}

export function processLive(directory: OrchDir, params: ParamsOf<"process-live">): ResultOf<"process-live"> {
  return { live: agentProcessLive(directory, params.target) };
}
