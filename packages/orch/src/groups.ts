// Finding a plexer group by what a caller typed: its id or label exactly, else its label in
// any case. Shared by the CLI's tab verbs and orchd's pane moves.
import type { BackendGroup } from "./types/backend.ts";

/** Every group `target` names: the exact matches, else the case-insensitive label matches. */
export function groupsNamed(groups: readonly BackendGroup[], target: string): BackendGroup[] {
  const exact = groups.filter((group) => group.id === target || group.label === target);
  if (exact.length) return exact;
  return groups.filter((group) => (group.label ?? "").toLowerCase() === target.toLowerCase());
}
