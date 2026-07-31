import { loadPresence, spawnedRecords } from "../presence/store.ts";

/**
 * Names are labels, not identities — two agents can never collide on identity,
 * because each mints its own id. Uniqueness is enforced only so `orch dispatch
 * review-1` stays a valid address; a dead agent's name is free immediately.
 */
export function assertNameFree(name: string, workspace: string): void {
  const presence = loadPresence();
  const taken = [...spawnedRecords().values()].find((record) =>
    record.name === name && record.workspace === workspace && presence.get(record.pane)?.alive);
  if (taken) throw new Error(`name "${name}" is already live as ${taken.pane}; close it or pick another name`);
}
