import type { PeerView } from "../../src/daemon/peer-view.ts";
import type { DaemonClient } from "../../src/types/agent.ts";

/** A DaemonClient that accepts everything, forwards nothing, and answers nothing —
 *  the shape a bridge sees when orchd is absent. */
export function daemonClientForPeers(keys: string[]): DaemonClient {
  const spaces: Record<string, string | null> = {};
  for (const key of keys) spaces[key] = null;
  return daemonClientForPeerView({ visible: keys, spaces, drive: {} });
}

export function daemonClientForPeerView(view: PeerView): DaemonClient {
  return {
    ...stubDaemonClient(),
    ask: (method) => method === "peer-view" ? Promise.resolve(view) : Promise.resolve(undefined),
  };
}

export function stubDaemonClient(): DaemonClient {
  return {
    messageIdOf: () => undefined,
    isAcked: () => false,
    markAcked: () => undefined,
    ask: () => Promise.resolve(undefined),
    postAck: () => Promise.resolve(true),
    postControlOutcome: () => Promise.resolve(true),
  };
}
