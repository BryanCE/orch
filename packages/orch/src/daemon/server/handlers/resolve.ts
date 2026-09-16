// One target, resolved inside orchd for the caller the credential names.
import { lifecycleResolutionFor } from "../../../entities/lifecycle.ts";
import { resolveTargetFor } from "../../../entities/resolve.ts";
import { callerOwns } from "../../../policy/ownership.ts";
import { agentView } from "../../../store/agent-view.ts";
import { currentLease } from "../../../store/lease-rows.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

function ownershipOf(directory: DaemonState["directory"], credential: ParamsOf<"resolve-target">["caller"], key: string): { holder: string | null; callerOwns: boolean } {
  const holder = currentLease(directory, key)?.orchId ?? null;
  return { holder, callerOwns: callerOwns(directory, credential, key, holder) };
}

export function resolveTargetEntity(state: DaemonState, params: ParamsOf<"resolve-target">): ResultOf<"resolve-target"> {
  const settings = state.services.settings.current();
  const opts = { ...(params.all === true ? { all: true } : {}), ...(params.crossSpace === true ? { crossSpace: true } : {}) };
  const entity = resolveTargetFor(state.directory, settings, params.caller, params.target, opts);
  return {
    entity,
    view: agentView(state.directory, entity.key),
    ...ownershipOf(state.directory, params.caller, entity.key),
  };
}

export function resolveLifecycleEntity(state: DaemonState, params: ParamsOf<"resolve-lifecycle">): ResultOf<"resolve-lifecycle"> {
  const resolution = lifecycleResolutionFor(state.directory, state.services.settings.current(), params.caller, params.target);
  return { ...resolution, ...ownershipOf(state.directory, params.caller, resolution.key) };
}
