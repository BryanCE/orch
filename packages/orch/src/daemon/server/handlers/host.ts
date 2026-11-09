// The hosts orchd links to: bringing one up on request, acting on an agent on the host it
// runs on, and forgetting which machine a name meant once that machine has been replaced.
import { linkedHosts, unbindHostName } from "../../../store/host-rows.ts";
import { hostById, hostOfAgent } from "../../../store/agent-rows.ts";
import { placeProcess } from "../../../process-place.ts";
import { currentProcess } from "../../../store/interval-rows.ts";
import { callerMayResolveFor, refuseForeignTarget } from "../../../entities/resolve.ts";
import { readAgent } from "../../../agent/read.ts";
import type { HostLinks } from "../../../hosts/link.ts";
import type { LinkedHost } from "../../../types/process.ts";
import type { HostId } from "../../../types/host.ts";
import type { DaemonState } from "../state.ts";
import type { ParamsOf, PeerDrive, PeerDriveResult, ResultOf } from "../../client/protocol.ts";

/** Bring a host's link up and report it; refuses with why the host is offline. */
export async function checkHost(state: DaemonState, params: ParamsOf<"host-check">): Promise<ResultOf<"host-check">> {
  const link = state.hosts.link(params.name);
  await link.requireUp();
  return link.view();
}

/** What to do with an agent, by where it runs. */
interface AtAgentHost<T> {
  /** Not asked of another host and no process recorded: this host's agent, not running yet
   *  or no longer, so this host's own code answers for it. */
  readonly unrecorded: () => T | Promise<T>;
  /** It runs on this machine. */
  readonly here: () => T | Promise<T>;
  /** It runs on a linked host, whose link is up. */
  readonly there: (link: HostLink, host: LinkedHost) => Promise<T>;
}

type HostLink = ReturnType<HostLinks["link"]>;

/** Act on a linked host's agent over that host's link once the link is up. */
async function overLink<T>(state: DaemonState, host: LinkedHost, act: AtAgentHost<T>): Promise<T> {
  const link = state.hosts.link(host.name);
  await link.requireUp();
  return act.there(link, host);
}

function noLinkTo(state: DaemonState, key: string, host: HostId): Error {
  return new Error(`${key} runs on host ${hostById(state.directory, host)?.name ?? host}, which orch has no link to`);
}

/** Act on an agent where it runs: here, or over its host's link once that link is up. The
 *  host this orchd asked to run it places it first; its recorded process places the rest. An
 *  offline host refuses with when it was last seen; a host orch has no link to refuses by name. */
export async function atAgentHost<T>(state: DaemonState, key: string, act: AtAgentHost<T>): Promise<T> {
  const asked = hostOfAgent(state.directory, key);
  if (asked !== null) {
    const host = linkedHosts(state.directory).get(asked);
    if (host === undefined) throw noLinkTo(state, key, asked);
    return overLink(state, host, act);
  }
  const recorded = currentProcess(state.directory, key);
  if (recorded === undefined) return act.unrecorded();
  const place = placeProcess(state.directory, recorded);
  switch (place.kind) {
    case "local":
      return act.here();
    case "linked":
      return overLink(state, place.host, act);
    case "unreachable":
      throw noLinkTo(state, key, place.process.host);
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown process place ${String(exhaustive)}`);
    }
  }
}

/** Ask a linked host's orchd to do a drive or kill verb on its agent, and read its answer as
 *  the one that verb gives. This orchd has ruled on the verb already. */
export async function driveOnHost<A extends PeerDrive["action"]>(link: HostLink, request: Extract<PeerDrive, { action: A }>): Promise<Extract<PeerDriveResult, { action: A }>> {
  const answer = await link.call("peer-drive", request);
  if (!answeredFor(answer, request.action)) throw new Error(`${link.name} answered ${answer.action} to ${request.action}`);
  return answer;
}

function answeredFor<A extends PeerDrive["action"]>(answer: PeerDriveResult, action: A): answer is Extract<PeerDriveResult, { action: A }> {
  return answer.action === action;
}

/** Read an agent's result or session tail from the store that holds it: this one, or its
 *  linked host's orchd over the link. The answer names that host. */
export async function readAgentAnywhere(state: DaemonState, params: ParamsOf<"agent-read">): Promise<ResultOf<"agent-read">> {
  if (!callerMayResolveFor(state.directory, params.caller, { key: params.key })) refuseForeignTarget(params.key);
  const local = (): ResultOf<"agent-read"> => ({ host: null, reading: readAgent(state.directory, params.key, params.read, state.services.logger) });
  return await atAgentHost(state, params.key, {
    unrecorded: local,
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
