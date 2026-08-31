import { assertNameFree, assertValidAgentName } from "../../policy/name.ts";
import { SpawnRefusalError } from "../../refusal.ts";
import { errorMessage } from "../../util.ts";


/**
 * The names this launch will use. Naming an agent is part of CREATING it
 * The positional arguments ARE the names, one per pane, and how many you give is
 * how many panes you get. There is no default name and no prefix numbering — an
 * ordinal like `fix-1` says nothing about the slice that pane holds, and renaming
 * afterwards costs N commands and leaves the pane border stale.
 *
 * Pure: it validates the argument list and nothing else, so a refusal happens
 * before any tab, pane, or worktree exists.
 */
export function resolveSpawnNames(positional: readonly string[]): string[] {
  if (positional.length === 0) {
    throw new SpawnRefusalError("orch spawn <name> [<name>...]: every agent must be named at creation; naming is part of creating it.");
  }
  for (const candidate of positional) {
    // A count is not a name. `orch spawn 4` used to mean four ordinal-named panes;
    // it now names nothing, and a nameless pane is what this refusal exists to stop.
    if (/^\d+$/.test(candidate)) {
      throw new SpawnRefusalError(`"${candidate}" is a count, not a name; give one name per agent: orch spawn <name> [<name>...]`);
    }
  }
  const seen = new Set<string>();
  for (const candidate of positional) {
    if (seen.has(candidate)) throw new SpawnRefusalError(`duplicate name "${candidate}"; every agent needs its own name.`);
    seen.add(candidate);
  }
  try {
    for (const name of positional) assertValidAgentName(name);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
  return [...positional];
}

/** Assert every already-resolved name is free in this space, before anything
 *  is created. Separate from resolution because freeness reads live state. */
export function claimSpawnNames(requested: readonly string[], space: string | null): string[] {
  const names = resolveSpawnNames(requested);
  try {
    for (const name of names) assertNameFree(name, space);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
  return names;
}
