import { fleetCapacity, type HeldCapacity } from "../../policy/capacity.ts";
import { loadPresence } from "../../presence/store.ts";
import { agentViewIndex, onAgentRefreshed } from "../../store/agent-view.ts";
import { registerMemoReset } from "../../store/connection.ts";
import type { OrchDir } from "../../types/core.ts";
import type { OrchSettings } from "../../types/settings.ts";

interface CapacityFor { readonly settings: OrchSettings; readonly capacity: HeldCapacity }

const held = new Map<OrchDir, CapacityFor>();
registerMemoReset(() => held.clear());
onAgentRefreshed((orchDir) => forgetCapacity(orchDir));

/** The fleet's capacity as orchd holds it: computed again after an agent changes or the settings reload. */
export function heldCapacity(orchDir: OrchDir, settings: OrchSettings): HeldCapacity {
  const current = held.get(orchDir);
  if (current?.settings === settings) return current.capacity;
  const capacity = fleetCapacity(agentViewIndex(orchDir), loadPresence(orchDir), settings);
  held.set(orchDir, { settings, capacity });
  return capacity;
}

export function forgetCapacity(orchDir: OrchDir): void {
  held.delete(orchDir);
}
