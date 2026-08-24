import { loadPresence, spawnedRecords } from "../presence/store.ts";
import type { SpawnedRecord } from "../store/sqlite.ts";

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

/** Live agents named "<prefix>-<n>" in one workspace — the group a spawn extends. */
export function liveNamedRecords(prefix: string, workspace: string): SpawnedRecord[] {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-\\d+$`);
  const presence = loadPresence();
  return [...spawnedRecords().values()].filter((record) =>
    record.name !== undefined && pattern.test(record.name) && record.workspace === workspace && presence.get(record.pane)?.alive);
}

/** The index the next "<prefix>-<n>" agent takes: one past the highest live one. */
export function nextNameIndex(prefix: string, workspace: string): number {
  const indices = liveNamedRecords(prefix, workspace)
    .map((record) => Number(record.name!.slice(prefix.length + 1)));
  return indices.length === 0 ? 1 : Math.max(...indices) + 1;
}
