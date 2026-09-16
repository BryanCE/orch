// Who a caller is, answered by orchd from the credential it sent.
import { selfIdentityOf, spaceOfAgent } from "../../../identity/self.ts";
import { callerKindOf } from "../../../policy/caller.ts";
import { depthOf } from "../../../policy/provenance.ts";
import { agentView } from "../../../store/agent-view.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

export function callerSelf(directory: OrchDir, params: ParamsOf<"self">): ResultOf<"self"> {
  const credential = params.caller;
  const id = selfIdentityOf(directory, credential)?.id ?? null;
  return {
    id,
    kind: callerKindOf(directory, credential),
    space: id === null ? null : spaceOfAgent(directory, id),
    view: id === null ? null : agentView(directory, id),
    depth: id === null ? 0 : depthOf((agentId) => agentView(directory, agentId), id),
  };
}
