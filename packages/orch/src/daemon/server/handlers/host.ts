// The hosts orchd links to: bringing one up on request, and forgetting which machine
// a name meant once that machine has been replaced.
import { unbindHostName } from "../../../store/host-rows.ts";
import { hostById } from "../../../store/agent-rows.ts";
import { placeProcess } from "../../../process-place.ts";
import { currentProcess } from "../../../store/interval-rows.ts";
import type { DaemonState } from "../state.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

/** Bring a host's link up and report it; refuses with why the host is offline. */
export async function checkHost(state: DaemonState, params: ParamsOf<"host-check">): Promise<ResultOf<"host-check">> {
  const link = state.hosts.link(params.name);
  await link.requireUp();
  return link.view();
}

/** End an agent's recorded process on the linked host it runs on, over that host's link.
 *  Only a process orch recorded for that agent can be named, never a bare pid. */
export async function signalOnHost(state: DaemonState, params: ParamsOf<"host-signal">): Promise<ResultOf<"host-signal">> {
  const recorded = currentProcess(state.directory, params.key);
  if (recorded === undefined) return { outcome: "gone" };
  const place = placeProcess(state.directory, recorded);
  switch (place.kind) {
    case "local":
      throw new Error(`${params.key} runs on this machine, not on a linked host`);
    case "linked": {
      const link = state.hosts.link(place.host.name);
      await link.requireUp();
      return link.signal(place.process);
    }
    case "unreachable":
      throw new Error(`${params.key} runs on host ${hostById(state.directory, place.process.host)?.name ?? place.process.host}, which orch has no link to`);
    default: {
      const exhaustive: never = place;
      throw new Error(`unknown process place ${String(exhaustive)}`);
    }
  }
}

/** Drop the link and the id the name was bound to, so the next host to answer on its route binds it. */
export function forgetHost(state: DaemonState, params: ParamsOf<"host-forget">): ResultOf<"host-forget"> {
  state.hosts.link(params.name).close();
  unbindHostName(state.directory, params.name);
  return { name: params.name };
}
