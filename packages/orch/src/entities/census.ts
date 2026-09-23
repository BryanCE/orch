import { allBackends } from "../backends/registry.ts";
import { onAgentRefreshed } from "../store/agent-view.ts";
import { registerMemoReset } from "../store/connection.ts";
import type { Backend, BackendTarget } from "../types/backend.ts";
import type { OrchSettings } from "../types/settings.ts";
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

/** The census as orch holds it: listed once per enabled plexer, trusted until an agent record changes. */
export function heldCensus(settings: OrchSettings): Census {
  const census = new Map<string, ReadonlyMap<string, BackendTarget>>();
  for (const backend of enabledBackends(settings)) {
    const inventory = backend.placementInventory;
    if (!inventory) continue;
    const current = held.get(backend.id) ?? listPanes(backend, inventory);
    held.set(backend.id, current);
    census.set(backend.id, current);
  }
  return census;
}
