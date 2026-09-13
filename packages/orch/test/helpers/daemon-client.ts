import { peerView } from "../../src/daemon/peer-view.ts";
import { isRecord } from "../../src/json.ts";
import { orchDir } from "../../src/presence/writer.ts";
import type { PeerView } from "../../src/daemon/peer-view.ts";
import type { DaemonClient } from "../../src/types/agent.ts";

/** A DaemonClient that accepts everything, forwards nothing, and answers nothing —
 *  the shape a bridge sees when orchd is absent. */
export function daemonClientForPeers(keys: string[]): DaemonClient {
  return {
    ...stubDaemonClient(),
    ask: (method, params) => {
      if (method !== "peer-view" || !isRecord(params)) return Promise.resolve(undefined);
      const ownKey = typeof params.ownKey === "string" ? params.ownKey : "";
      const requested = Array.isArray(params.keys) && params.keys.every((key) => typeof key === "string") ? params.keys : [];
      const allSpaces = params.allSpaces === true;
      const projectRoot = typeof params.projectRoot === "string" ? params.projectRoot : undefined;
      return Promise.resolve(peerView(orchDir(), ownKey, requested.length ? requested : keys, allSpaces, projectRoot));
    },
  };
}

export function daemonClientForPeerView(view: PeerView): DaemonClient {
  return {
    ...stubDaemonClient(),
    ask: (method) => method === "peer-view" ? Promise.resolve(view) : Promise.resolve(undefined),
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
  };
}
