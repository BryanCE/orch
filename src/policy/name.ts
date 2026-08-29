import { loadPresence, orchDir, spawnedRecords } from "../presence/store.ts";
import { sameSpace } from "./space.ts";

export function assertValidAgentName(name: string): void {
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(name)) {
    throw new Error(`invalid agent name "${name}": must match ^[a-z][a-z0-9_-]{0,31}$`);
  }
}

/**
 * Refuse a name a live agent in the same space already answers to.
 *
 * A1 / CLAUDE.md Rule 11: the space is read from the agent's composed
 * ENVIRONMENT, never sliced out of its identity key. Scoping uniqueness by a
 * key segment pinned the name to the space the agent was BORN in — a moved or
 * adopted agent went on holding a name where it no longer was, and left the
 * space it actually occupied open to a duplicate. The name itself is the
 * agent's mutable label on the hub row, read through the same composed view.
 */
export function assertNameFree(name: string, space: string): void {
  assertValidAgentName(name);
  const presence = loadPresence();
  const taken = [...spawnedRecords(orchDir()).values()].find((view) =>
    view.name === name
    && sameSpace(view.environment.space, space)
    && presence.get(view.id)?.alive === true);
  if (taken) throw new Error(`name "${name}" is already live as ${taken.id}; close it or pick another name`);
}
