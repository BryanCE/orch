// Drive and kill verbs on an agent wherever it runs. This orchd rules on the verb for its own
// caller; an agent on a linked host is then that host's orchd's to drive, over the link, with
// its own delivery and close code (`peer-drive`). That orchd takes this one's ruling: it never
// re-runs a lease gate, since only the asking host can resolve its caller and judge whether
// the lease holder is alive. Kill verbs (abort, close, reap) are gated nowhere (Rule 11).
import { sleep } from "../../../util.ts";
import { resolveTargetRoute } from "../../../control/dispatch.ts";
import { paneBoundary } from "../../../control/pane-boundary.ts";
import { attemptClose, closeTargetOf } from "../../../control/close-attempt.ts";
import { closeTargetOfAgent } from "../../../entities/close-targets.ts";
import { agentView } from "../../../store/agent-view.ts";
import { atAgentHost, driveOnHost } from "./host.ts";
import { requireOriginPeer } from "./peer.ts";
import { confirmTextWrite } from "./write.ts";
import { applyModel, applyVerb, closeAgent } from "./lifecycle.ts";
import { reapForPeer } from "./lease.ts";
import type { DaemonState } from "../state.ts";
import type { ParamsOf, PeerDriveResult, ResultOf } from "../../client/protocol.ts";
import type { RpcRequestContext } from "../../../types/daemon.ts";
import type { SignalOutcome } from "../../../types/host.ts";

/** Cancel the current turn of an agent this orchd runs: two Escapes to its pane, through
 *  its environment's agent-input role. An environment without one answers why. */
async function abortHere(state: DaemonState, key: string): Promise<ResultOf<"abort">> {
  const route = resolveTargetRoute(state.directory, key);
  const input = route?.backend.agentInput ?? null;
  const pane = route === undefined || input === null ? null : { input, handle: route.handle };
  const plan = paneBoundary(agentView(state.directory, key)?.name ?? key, "abort", pane, route !== undefined);
  if (plan.outcome === "answer") return plan;
  const { input: keys, handle } = plan.role;
  keys.sendKeys(handle, ["Escape"]);
  await sleep(state.services.settings.current().timeouts.abort_gap_ms);
  keys.sendKeys(handle, ["Escape"]);
  return { outcome: "aborted" };
}

/** `abort`: cancel an agent's turn where it runs. Never gated by a lease. */
export function abortAnywhere(state: DaemonState, params: ParamsOf<"abort">): Promise<ResultOf<"abort">> {
  const key = params.target;
  return atAgentHost(state, key, {
    unrecorded: () => abortHere(state, key),
    here: () => abortHere(state, key),
    there: async (link) => (await driveOnHost(link, { action: "abort", key, actor: params.actor ?? null })).aborted,
  });
}

/** End an agent this orchd runs, for a close a linked host's orchd ruled on, and record the
 *  ending here. One already ended is a no-op, as a close here is. */
function closeHere(state: DaemonState, key: string): SignalOutcome {
  const wire = closeTargetOfAgent(state.directory, key, (address, backendId) => state.services.logger.warn("close.unknown-backend", { backend: backendId, handle: address }));
  if (wire === null) return "gone";
  const attempt = attemptClose(closeTargetOf(wire));
  if (attempt.failure !== null) throw new Error(attempt.failure);
  closeAgent(state, { key });
  return attempt.signalled || attempt.closedByBackend ? "signalled" : "gone";
}

/** `agent-closed`: record that an agent was closed. The closer ended one on its own box
 *  itself; one on a linked host is closed by that host's orchd first, over the link. */
export function closeAnywhere(state: DaemonState, params: ParamsOf<"agent-closed">): Promise<ResultOf<"agent-closed">> {
  const end = (): ResultOf<"agent-closed"> => closeAgent(state, params);
  return atAgentHost(state, params.key, {
    unrecorded: end,
    here: end,
    there: async (link) => {
      await driveOnHost(link, { action: "close", key: params.key, actor: params.actor ?? null });
      return end();
    },
  });
}

/** `peer-drive`: a linked host's orchd drives an agent it asked this host to run, through the
 *  same code this orchd drives its own agents with. */
export async function peerDrive(state: DaemonState, params: ParamsOf<"peer-drive">, context: RpcRequestContext): Promise<PeerDriveResult> {
  const peer = requireOriginPeer(state.directory, context, params.key);
  const { key, actor } = params;
  state.services.logger.info("peer.drive", { peer, action: params.action, actor }, { agentId: key });
  switch (params.action) {
    case "dispatch":
    case "steer": {
      const { accepted, id, ack } = await confirmTextWrite(state, params.action, key, params.text, () => undefined);
      return { action: params.action, accepted, id, ack };
    }
    case "model":
      return { action: "model", ...await applyModel(state, key, params.model) };
    case "lifecycle":
      return { action: "lifecycle", ...await applyVerb(state, key, params.verb) };
    case "abort":
      return { action: "abort", aborted: await abortHere(state, key) };
    case "close":
      return { action: "close", outcome: closeHere(state, key) };
    case "reap":
      return { action: "reap", reaped: reapForPeer(state.directory, key) };
    default: {
      const exhaustive: never = params;
      throw new Error(`unknown peer drive ${String(exhaustive)}`);
    }
  }
}
