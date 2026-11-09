// What another host's orchd may ask of this one over its link, and nothing else may: whether
// processes here are alive, and reading agents it asked for and the questions they ask. Driving them is `peer-drive`. Each
// process names its host; one that is not this host is a mixup on the other end, refused, so
// a pid recorded for another machine never reaches a probe or a signal here.
import { localProcessOf, observedHere } from "../../../local-process.ts";
import { recordedInstanceIsLive } from "../../../process-identity.ts";
import { originOf } from "../../../store/agent-rows.ts";
import { readAgent, type AgentReader } from "../../../agent/read.ts";
import { placeHere } from "../../../process-place.ts";
import { pendingQuestions } from "../../../store/question-rows.ts";
import { questionView } from "./lifecycle.ts";
import { RpcError } from "../../client/wire.ts";
import type { OrchDir } from "../../../types/core.ts";
import type { HostId, HostIdentity } from "../../../types/host.ts";
import type { RpcHandler } from "../../../types/daemon.ts";
import type { HostedProcess, LocalProcess } from "../../../types/process.ts";
import type { RpcRequestContext } from "../../../types/daemon.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

function requirePeer(context: RpcRequestContext): HostId {
  if (context.peer === undefined) throw new RpcError("IDENTITY_REQUIRED", "only a linked host's orchd may ask this");
  return context.peer;
}

/** The peer asking, refused unless its host is the one that asked this host to run `key`. */
export function requireOriginPeer(directory: OrchDir, context: RpcRequestContext, key: string): HostId {
  const peer = requirePeer(context);
  if (originOf(directory, key)?.askedBy !== peer) throw new Error(`${key} was not asked for by the host asking`);
  return peer;
}

/** A process a peer asked about, as the OS here sees it: one on the host this orchd greets
 *  peers as, or on another side of this same box. */
function processHere(process: HostedProcess, here: HostIdentity): LocalProcess {
  if (process.host === here.id) return observedHere(process.pid, process.startToken);
  const local = localProcessOf(process);
  if (local === null) throw new Error(`process ${process.pid} is recorded on host ${process.host}, not on ${here.name}`);
  return local;
}

/** The peer methods, answering as `here`: the host this orchd greets its peers as. */
export function peerHandlers(here: () => HostIdentity, reader: AgentReader): { readonly "peer-alive": RpcHandler<"peer-alive">; readonly "peer-read": RpcHandler<"peer-read">; readonly "peer-questions": RpcHandler<"peer-questions"> } {
  return {
    "peer-alive": (params: ParamsOf<"peer-alive">, _emit, context): ResultOf<"peer-alive"> => {
      requirePeer(context);
      return { alive: params.processes.map((process) => recordedInstanceIsLive(processHere(process, here()))) };
    },
    "peer-read": (params: ParamsOf<"peer-read">, _emit, context): ResultOf<"peer-read"> => {
      requireOriginPeer(reader.orchDir, context, params.key);
      return readAgent(reader, placeHere(reader.orchDir, params.key), params.read);
    },
    "peer-questions": (_params: ParamsOf<"peer-questions">, _emit, context): ResultOf<"peer-questions"> => {
      const peer = requirePeer(context);
      const asked = pendingQuestions(reader.orchDir).filter((row) => originOf(reader.orchDir, row.agentId)?.askedBy === peer);
      return { questions: asked.map((row) => questionView(reader.orchDir, row)) };
    },
  };
}
