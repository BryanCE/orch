// Drive and kill verbs on an agent wherever it runs. This orchd rules on the verb for its own
// caller; an agent on a linked host is then that host's orchd's to drive, over the link, with
// its own delivery and close code (`peer-drive`). That orchd takes this one's ruling: it never
// re-runs a lease gate, since only the asking host can resolve its caller and judge whether
// the lease holder is alive. Kill verbs (abort, close, reap) are gated nowhere (Rule 11).
import { deliverControl } from "../../../control/dispatch.ts";
import { attemptClose, closeTargetOf } from "../../../control/close-attempt.ts";
import { closeTargetOfAgent } from "../../../entities/close-targets.ts";
import { placeHere } from "../../../process-place.ts";
import { atAgentHost, driveOnHost } from "./host.ts";
import { requireOriginPeer } from "./peer.ts";
import { answerHere, confirmTextWrite } from "./write.ts";
import { applyModel, clearHere, closeAgent } from "./lifecycle.ts";
import { lifecycleHere } from "./relaunch.ts";
import { reapForPeer, renameHere } from "./lease.ts";
import { paneHere } from "./pane.ts";
import { endSessionAgent, sharesProcess } from "../session-agents.ts";
import { errorMessage } from "../../../util.ts";
import { waitHere } from "./wait.ts";
import type { DaemonState } from "../state.ts";
import type { ParamsOf, PeerDriveResult, ResultOf } from "../../client/protocol.ts";
import type { RpcRequestContext } from "../../../types/daemon.ts";
import type { SignalOutcome } from "../../../types/host.ts";
import type { HereAgent } from "../../../types/agent-place.ts";

/** Cancel the current turn of an agent this orchd runs through the control dispatcher. */
async function abortHere(state: DaemonState, agent: HereAgent): Promise<ResultOf<"abort">> {
  const outcome = await deliverControl(state.directory, state.services.settings.current(), state.services.models, agent, { kind: "abort" });
  if (outcome.outcome === "answer") {
    if (outcome.reason !== "no-pane" && outcome.reason !== "no-environment-role") throw new Error(outcome.text);
    return { ...outcome, reason: outcome.reason };
  }
  return { outcome: "aborted" };
}

/** `abort`: cancel an agent's turn where it runs. Never gated by a lease. */
export function abortAnywhere(state: DaemonState, params: ParamsOf<"abort">): Promise<ResultOf<"abort">> {
  const key = params.target;
  return atAgentHost(state, key, {
    here: (agent) => abortHere(state, agent),
    there: async (link) => (await driveOnHost(state, link, { action: "abort", key, actor: params.actor ?? null })).aborted,
  });
}

/** End an agent this orchd runs: signal its process and close its pane, then record the
 *  ending here. One already ended is a no-op, as a close is. */
function closeHere(state: DaemonState, agent: HereAgent, actor: string | null): SignalOutcome {
  const wire = closeTargetOfAgent(state.directory, agent, (address, backendId) => state.services.logger.warn("close.unknown-backend", { backend: backendId, handle: address }));
  if (wire === null) return "gone";
  const record = { key: agent.id, ...(actor === null ? {} : { actor }) };
  const endSession = (): void => {
    void endSessionAgent(agent.id).catch((error: unknown) => { state.services.logger.warn("held-session.end-failed", { message: errorMessage(error) }, { agentId: agent.id }); });
  };
  // An agent that is one session on a process other agents share ends with its session: the
  // process is not its own to signal.
  if (sharesProcess(agent.id)) {
    endSession();
    closeAgent(state, record);
    return "signalled";
  }
  const attempt = attemptClose(closeTargetOf(wire));
  if (attempt.failure !== null) throw new Error(attempt.failure);
  endSession();
  closeAgent(state, record);
  return attempt.signalled || attempt.closedByBackend ? "signalled" : "gone";
}

/** `agent-closed`: end an agent where it runs and record the ending. One on a linked host is
 *  ended by that host's orchd first, over the link; this host then records it. Never gated. */
export async function closeAnywhere(state: DaemonState, params: ParamsOf<"agent-closed">): Promise<ResultOf<"agent-closed">> {
  const actor = params.actor ?? null;
  return await atAgentHost(state, params.key, {
    here: (agent) => ({ outcome: closeHere(state, agent, actor) }),
    there: async (link) => {
      const { outcome } = await driveOnHost(state, link, { action: "close", key: params.key, actor });
      closeAgent(state, params);
      return { outcome };
    },
  });
}

/** `peer-drive`: a linked host's orchd drives an agent it asked this host to run, through the
 *  same code this orchd drives its own agents with. */
export async function peerDrive(state: DaemonState, params: ParamsOf<"peer-drive">, context: RpcRequestContext): Promise<PeerDriveResult> {
  const peer = requireOriginPeer(state.directory, context, params.key);
  const { key, actor } = params;
  state.services.logger.info("peer.drive", { peer, action: params.action, actor }, { agentId: key });
  if (params.action === "reap") return { action: "reap", reaped: reapForPeer(state.directory, key) };
  const agent = placeHere(state.directory, key);
  switch (params.action) {
    case "dispatch":
    case "steer": {
      const { accepted, id, ack } = await confirmTextWrite(state, params.action, agent, params.text, () => undefined);
      return { action: params.action, accepted, id, ack };
    }
    case "answer":
      return { action: "answer", ...await answerHere(state, agent, params.text, params.questionId) };
    case "model":
      return { action: "model", ...await applyModel(state, agent, params.model) };
    case "lifecycle":
      return { action: "lifecycle", ...await lifecycleHere(state, agent, params.request) };
    case "clear":
      return { action: "clear", ...await clearHere(state, agent) };
    case "rename":
      return { action: "rename", ...renameHere(state, agent, params.name) };
    case "abort":
      return { action: "abort", aborted: await abortHere(state, agent) };
    case "close":
      return { action: "close", outcome: closeHere(state, agent, actor) };
    case "pane":
      return { action: "pane", outcome: paneHere(state, agent, params.pane) };
    case "wait":
      return { action: "wait", ...await waitHere(state, agent.id, params.status, params.timeoutMs) };
    default: {
      const exhaustive: never = params;
      throw new Error(`unknown peer drive ${String(exhaustive)}`);
    }
  }
}
