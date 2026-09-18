import { fleetCapacity, type HeldCapacity } from "../../policy/capacity.ts";
import { loadPresence } from "../../presence/store.ts";
import { agentViewIndex, onAgentRefreshed } from "../../store/agent-view.ts";
import { registerMemoReset } from "../../store/connection.ts";
import type { OrchDir } from "../../types/core.ts";
import type { OrchSettings } from "../../types/settings.ts";

const held = new Map<OrchDir, HeldCapacity>();
registerMemoReset(() => held.clear());
onAgentRefreshed((orchDir) => forgetCapacity(orchDir));

/** The fleet's capacity as orchd holds it: computed after a change, served as is until the next. */
export function heldCapacity(orchDir: OrchDir, settings: OrchSettings): HeldCapacity {
  const current = held.get(orchDir);
  if (current !== undefined) return current;
  const computed = fleetCapacity(agentViewIndex(orchDir), loadPresence(orchDir), settings);
  held.set(orchDir, computed);
  return computed;
}

export function forgetCapacity(orchDir: OrchDir): void {
  held.delete(orchDir);
}
