import { assertNameFree, assertValidAgentName } from "../../policy/name.ts";
import { SpawnRefusalError } from "../../refusal.ts";
import { errorMessage } from "../../util.ts";
import { usageError, type CommandAt } from "../../cli/usage.ts";
import type { AgentView } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";

/** The positional arguments ARE the names, one per agent. Pure, so a malformed list
 *  is refused with the command's usage before any tab, pane, or worktree exists. */
export function resolveSpawnNames(at: CommandAt, positional: readonly string[]): string[] {
  if (positional.length === 0) throw usageError(at, "every agent must be named at creation; naming is part of creating it.");
  const count = positional.find((candidate) => /^\d+$/.test(candidate));
  if (count !== undefined) throw usageError(at, `"${count}" is a count, not a name; give one name per agent.`);
  const duplicate = positional.find((candidate, index) => positional.indexOf(candidate) !== index);
  if (duplicate !== undefined) throw usageError(at, `duplicate name "${duplicate}"; every agent needs its own name.`);
  try {
    for (const name of positional) assertValidAgentName(name);
  } catch (error: unknown) {
    throw usageError(at, errorMessage(error));
  }
  return [...positional];
}

/** Assert every already-resolved name is free in this space, before anything
 *  is created. Separate from resolution because freeness reads live state. */
export function claimSpawnNames(
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  names: readonly string[],
  space: string | null,
): string[] {
  try {
    for (const name of names) assertNameFree(views, presence, name, space);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
  return [...names];
}
