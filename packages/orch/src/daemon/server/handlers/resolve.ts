// One target, resolved inside orchd for the caller the credential names.
import { lifecycleResolutionFor, type LifecycleResolution } from "../../../entities/lifecycle.ts";
import { placeAgentIfAny } from "../../../process-place.ts";
import { hostById } from "../../../store/agent-rows.ts";
import { resolveTargetFor } from "../../../entities/resolve.ts";
import { callerOwns } from "../../../policy/ownership.ts";
import { agentView } from "../../../store/agent-view.ts";
import { currentLease } from "../../../store/lease-rows.ts";
import type { LifecyclePlace, ParamsOf, ResultOf } from "../../client/protocol.ts";
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

/** Where a resolved agent runs, as the caller is told it: the pane coordinates of one on this
 *  machine, or only the name of the host whose orchd acts on it. A target with no agent row is
 *  a pane this machine's plexer listed, so its coordinates are this machine's. */
function lifecyclePlace(directory: DaemonState["directory"], resolution: LifecycleResolution): LifecyclePlace {
  const here: LifecyclePlace = { kind: "here", plexer: resolution.backendId, handle: resolution.handle };
  const place = placeAgentIfAny(directory, resolution.key);
  if (place === null) return here;
  switch (place.kind) {
    case "here":
      return here;
    case "linked":
      return { kind: "host", host: place.host.name };
    case "unreachable":
      return { kind: "host", host: hostById(directory, place.host)?.name ?? place.host };
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown agent place ${String(exhaustive)}`);
    }
  }
}

export function resolveLifecycleEntity(state: DaemonState, params: ParamsOf<"resolve-lifecycle">): ResultOf<"resolve-lifecycle"> {
  const resolution = lifecycleResolutionFor(state.directory, state.services.settings.current(), params.caller, params.target);
  const { entity, key, view } = resolution;
  return { entity, key, view, place: lifecyclePlace(state.directory, resolution), ...ownershipOf(state.directory, params.caller, key) };
}
