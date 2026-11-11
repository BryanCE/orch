// The hosts orchd links to: bringing one up on request, acting on an agent on the host it
// runs on, and forgetting which machine a name meant once that machine has been replaced.
import { unbindHostName } from "../../../store/host-rows.ts";
import { hostById } from "../../../store/agent-rows.ts";
import { placeAgent } from "../../../process-place.ts";
import { callerMayResolveFor, refuseForeignTarget } from "../../../entities/resolve.ts";
import { readAgent, type AgentReader } from "../../../agent/read.ts";
import type { HostLinks } from "../../../hosts/link.ts";
import type { LinkedHost } from "../../../types/process.ts";
import type { HereAgent } from "../../../types/agent-place.ts";
import type { DaemonState } from "../state.ts";
import type { OrchSettings } from "../../../types/settings.ts";
import type { ParamsOf, PeerDrive, PeerDriveResult, ResultOf } from "../../client/protocol.ts";

/** Bring a host's link up and report it; refuses with why the host is offline. */
export async function checkHost(state: DaemonState, params: ParamsOf<"host-check">): Promise<ResultOf<"host-check">> {
  const link = state.hosts.link(params.name);
  await link.requireUp();
  return link.view();
}

/** What to do with an agent, by where it runs. */
interface AtAgentHost<T> {
  /** It runs on this orchd's host: this orchd's own code answers, with the proof. */
  readonly here: (agent: HereAgent) => T | Promise<T>;
  /** It runs on a linked host, whose link is up. */
  readonly there: (link: HostLink, host: LinkedHost) => Promise<T>;
}

type HostLink = ReturnType<HostLinks["link"]>;

/** Act on an agent where it runs: here, or over its host's link once that link is up. An
 *  offline host refuses with when it was last seen; a host orch has no link to refuses by name. */
export async function atAgentHost<T>(state: DaemonState, key: string, act: AtAgentHost<T>): Promise<T> {
  const place = placeAgent(state.directory, key);
  switch (place.kind) {
    case "here":
      return act.here(place.agent);
    case "linked": {
      const link = state.hosts.link(place.host.name);
      await link.requireUp();
      return act.there(link, place.host);
    }
    case "unreachable":
      throw new Error(`${key} runs on host ${hostById(state.directory, place.host)?.name ?? place.host}, which orch has no link to`);
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown agent place ${String(exhaustive)}`);
    }
  }
}

/** How long the far orchd may take over one drive verb, beyond the link's own request time:
 *  as long as that verb waits on its agent there. */
function driveWaitMs(timeouts: OrchSettings["timeouts"], request: PeerDrive): number {
  switch (request.action) {
    case "dispatch":
    case "steer":
    case "answer":
      return timeouts.dispatch_ack_ms;
    case "model":
      return timeouts.adapter_command_ms;
    case "clear":
      return timeouts.reset_ready_ms;
    case "abort":
      return timeouts.abort_gap_ms;
    case "lifecycle":
      // A restart waits on the old harness to quit, then on the new one to come up.
      return 2 * timeouts.reset_ready_ms;
    case "rename":
    case "close":
    case "reap":
    case "pane":
      return 0;
    case "wait":
      return request.timeoutMs;
    default: {
      const exhaustive: never = request;
      throw new Error(`unknown peer drive ${String(exhaustive)}`);
    }
  }
}

/** Ask a linked host's orchd to do a drive or kill verb on its agent, and read its answer as
 *  the one that verb gives. This orchd has ruled on the verb already. */
export async function driveOnHost<A extends PeerDrive["action"]>(state: DaemonState, link: HostLink, request: Extract<PeerDrive, { action: A }>): Promise<Extract<PeerDriveResult, { action: A }>> {
  const answer = await link.deliver("peer-drive", request, driveWaitMs(state.services.settings.current().timeouts, request));
  if (!answeredFor(answer, request.action)) throw new Error(`${link.name} answered ${answer.action} to ${request.action}`);
  return answer;
}

function answeredFor<A extends PeerDrive["action"]>(answer: PeerDriveResult, action: A): answer is Extract<PeerDriveResult, { action: A }> {
  return answer.action === action;
}

/** The reader of the agents this orchd runs. */
export function agentReaderOf(state: DaemonState): AgentReader {
  return { orchDir: state.directory, logger: state.services.logger, held: () => state.held };
}

/** Read an agent's result or session tail from the store that holds it: this one, or its
 *  linked host's orchd over the link. The answer names that host. */
export async function readAgentAnywhere(state: DaemonState, params: ParamsOf<"agent-read">): Promise<ResultOf<"agent-read">> {
  if (!callerMayResolveFor(state.directory, params.caller, { key: params.key })) refuseForeignTarget(params.key);
  const local = (agent: HereAgent): ResultOf<"agent-read"> => ({ host: null, reading: readAgent(agentReaderOf(state), agent, params.read) });
  return await atAgentHost(state, params.key, {
    here: local,
    there: async (link, host) => ({ host: host.name, reading: await link.call("peer-read", { key: params.key, read: params.read }) }),
  });
}

/** Drop the link and the id the name was bound to, so the next host to answer on its route binds it. */
export function forgetHost(state: DaemonState, params: ParamsOf<"host-forget">): ResultOf<"host-forget"> {
  state.hosts.link(params.name).close();
  unbindHostName(state.directory, params.name);
  return { name: params.name };
}
