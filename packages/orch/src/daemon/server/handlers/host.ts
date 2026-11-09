// The hosts orchd links to: bringing one up on request, and forgetting which machine
// a name meant once that machine has been replaced.
import { unbindHostName } from "../../../store/host-rows.ts";
import type { DaemonState } from "../state.ts";
import type { ParamsOf, ResultOf } from "../../client/protocol.ts";

/** Bring a host's link up and report it; refuses with why the host is offline. */
export async function checkHost(state: DaemonState, params: ParamsOf<"host-check">): Promise<ResultOf<"host-check">> {
  const link = state.hosts.link(params.name);
  await link.requireUp();
  return link.view();
}

/** Drop the link and the id the name was bound to, so the next host to answer on its route binds it. */
export function forgetHost(state: DaemonState, params: ParamsOf<"host-forget">): ResultOf<"host-forget"> {
  state.hosts.link(params.name).close();
  unbindHostName(state.directory, params.name);
  return { name: params.name };
}
