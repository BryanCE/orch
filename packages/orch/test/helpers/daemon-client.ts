import type { OrchDir } from "../../src/types/core.ts";
import { peerView } from "../../src/daemon/peer-view.ts";
import type { PeerView } from "../../src/daemon/peer-view.ts";
import type { DaemonClient } from "../../src/types/agent.ts";
import type { ParamsOf, ResultOf, RpcMethod } from "../../src/daemon/rpc/protocol.ts";

type AskHandlers = Partial<{ [M in RpcMethod]: (params: ParamsOf<M>) => ResultOf<M> }>;

export function askFrom(table: AskHandlers): DaemonClient["ask"] {
  return (method, params) => {
    const handler = table[method];
    return Promise.resolve(handler === undefined ? undefined : handler(params));
  };
}

/** A DaemonClient that accepts everything, forwards nothing, and answers nothing —
 *  the shape a bridge sees when orchd is absent. */
export function daemonClientForPeers(directory: OrchDir, keys: string[]): DaemonClient {
  return {
    ...stubDaemonClient(),
    ask: askFrom({
      "peer-view": (params) => peerView(
        directory,
        params.ownKey,
        (params.keys ?? []).length ? params.keys ?? [] : keys,
        params.allSpaces === true,
        params.projectRoot,
      ),
    }),
  };
}

export function daemonClientForPeerView(view: PeerView): DaemonClient {
  return {
    ...stubDaemonClient(),
    ask: askFrom({ "peer-view": () => view }),
  };
}

export function stubDaemonClient(): DaemonClient {
  return {
    isAcked: () => false,
    markAcked: () => undefined,
    ask: () => Promise.resolve(undefined),
    attach: () => undefined,
    detach: () => undefined,
    attached: () => false,
    postAck: () => Promise.resolve(true),
    postQuestion: () => Promise.resolve(),
    postControlOutcome: () => Promise.resolve(true),
    reportStatus: () => Promise.resolve(true),
    reportResult: () => Promise.resolve(true),
  };
}
