// Who a caller is, answered by orchd from the credential it sent.
import { selfIdentityOf, spaceOfAgent } from "../../../identity/self.ts";
import { callerKindOf } from "../../../policy/caller.ts";
import { depthOf } from "../../../policy/provenance.ts";
import { agentView } from "../../../store/agent-view.ts";
import { agentById, hostById } from "../../../store/agent-rows.ts";
import { currentProcess } from "../../../store/interval-rows.ts";
import { presenceEntry } from "../../../presence/store.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

type StoredIdentity = NonNullable<ResultOf<"self">["stored"]>;

/** The process orchd keys this agent's liveness on, with its host. */
function storedProcess(directory: OrchDir, id: string): StoredIdentity["process"] {
  const process = currentProcess(directory, id);
  if (process === undefined) return null;
  return {
    pid: process.pid,
    startToken: process.startToken,
    since: process.since,
    host: hostById(directory, process.hostId),
    alive: presenceEntry(directory, id)?.alive === true,
  };
}

/** Everything orchd stored for the row when it registered it. */
function storedIdentity(directory: OrchDir, id: string): StoredIdentity | null {
  const row = agentById(directory, id);
  if (row === null) return null;
  return { process: storedProcess(directory, id), sessionToken: row.sessionToken, claimedAt: row.claimedAt };
}

export function callerSelf(directory: OrchDir, params: ParamsOf<"self">): ResultOf<"self"> {
  const credential = params.caller;
  const id = selfIdentityOf(directory, credential)?.id ?? null;
  return {
    id,
    kind: callerKindOf(directory, credential),
    space: id === null ? null : spaceOfAgent(directory, id),
    view: id === null ? null : agentView(directory, id),
    depth: id === null ? 0 : depthOf((agentId) => agentView(directory, agentId), id),
    stored: id === null ? null : storedIdentity(directory, id),
  };
}
