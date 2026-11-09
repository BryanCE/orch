import { paneOf, type AgentPane } from "../store/agent-view.ts";
import { hereAgents, hereOrNull, placeAgentIfAny } from "../process-place.ts";
import type { BackendId } from "../types/backend.ts";
import type { OrchDir } from "../types/core.ts";
import type { HostId } from "../types/host.ts";
import type { LinkedHost } from "../types/process.ts";
import { isAgentId } from "../shared/agent-id.ts";

/** The pane an agent sits in on this machine, read through the agent placed here; null when
 *  the store holds no such agent or it runs on another host, which has no pane here. `linked`
 *  is `linkedHosts`, read once by a caller that places many agents. */
export function herePane(orchDir: OrchDir, id: string, linked?: ReadonlyMap<HostId, LinkedHost>): AgentPane | null {
  const place = placeAgentIfAny(orchDir, id, linked);
  const agent = place === null ? null : hereOrNull(place);
  return agent === null ? null : paneOf(orchDir, agent);
}

/** The pane of every agent among `ids` that runs here, by id, read through each agent placed
 *  here. An agent on another host has no pane here and is absent, as is an id the store does
 *  not hold. */
export function herePanes(orchDir: OrchDir, ids: Iterable<string>): ReadonlyMap<string, AgentPane> {
  return new Map(hereAgents(orchDir, ids).map((agent) => [agent.id, paneOf(orchDir, agent)]));
}

/** The handle of the pane an agent sits in on this machine, under `backendId`. An agent on
 *  another host has no pane here. */
export function resolvePaneHandle(id: string | null, orchDir: OrchDir, backendId: BackendId): string | null {
  if (!isAgentId(id)) return null;
  try {
    const pane = herePane(orchDir, id);
    return pane?.plexer === backendId ? pane.handle : null;
  } catch {
    return null;
  }
}

export function hasPaneHandle(id: string | null, orchDir: OrchDir, backendId: BackendId): boolean {
  return resolvePaneHandle(id, orchDir, backendId) !== null;
}
