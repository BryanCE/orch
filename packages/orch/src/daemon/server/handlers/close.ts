import { closeTargetsFor } from "../../../entities/close-targets.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

export function closeTargets(state: DaemonState, params: ParamsOf<"close-targets">): ResultOf<"close-targets"> {
  return closeTargetsFor(
    state.directory,
    state.services.settings.current(),
    params.caller,
    params.targets,
    params.all,
    (address, backendId) => state.logger?.warn("close.unknown-backend", { backend: backendId, handle: address }),
  );
}
