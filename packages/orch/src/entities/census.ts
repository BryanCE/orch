import { allBackends } from "../backends/registry.ts";
import { onAgentRefreshed } from "../store/agent-view.ts";
import { registerMemoReset } from "../store/connection.ts";
import type { Backend, BackendTarget } from "../types/backend.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { AgentView } from "../types/store.ts";
import { errorMessage } from "../util.ts";

/** What each environment answers it still holds, by handle, keyed by backend id. */
export type Census = ReadonlyMap<string, ReadonlyMap<string, BackendTarget>>;

const held = new Map<string, ReadonlyMap<string, BackendTarget>>();
registerMemoReset(() => held.clear());
onAgentRefreshed(() => held.clear());

/** The plexers the settings enable; setup and doctor settled whether they exist. */
export function enabledBackends(settings: OrchSettings): Backend[] {
  const enabled = new Set(settings.enabled.backends);
  return allBackends().filter((backend) => enabled.has(backend.id));
}

function listPanes(backend: Backend, inventory: NonNullable<Backend["placementInventory"]>): ReadonlyMap<string, BackendTarget> {
  try {
    return new Map(inventory.list().map((target) => [String(target.handle), target]));
  } catch (error) {
    throw new Error(`${backend.id} did not list its panes: ${errorMessage(error)}. Run: orch doctor`);
  }
}

/** The enabled plexers orch has a reason to ask: the default, and each one a live agent sits in. */
function plexersInUse(settings: OrchSettings, views: ReadonlyMap<string, AgentView>): Backend[] {
  const used = new Set<string>(settings.defaults.backend === undefined ? [] : [settings.defaults.backend]);
  for (const view of views.values()) {
    if (view.endedAt === null && view.environment.plexer !== null) used.add(view.environment.plexer);
  }
  return enabledBackends(settings).filter((backend) => used.has(backend.id));
}

/** The census as orch holds it: listed once per plexer in use, trusted until an agent record changes. */
export function heldCensus(settings: OrchSettings, views: ReadonlyMap<string, AgentView>): Census {
  const census = new Map<string, ReadonlyMap<string, BackendTarget>>();
  for (const backend of plexersInUse(settings, views)) {
    const inventory = backend.placementInventory;
    if (!inventory) continue;
    const current = held.get(backend.id) ?? listPanes(backend, inventory);
    held.set(backend.id, current);
    census.set(backend.id, current);
  }
  return census;
}
