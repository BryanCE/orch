import { loadPresence, orchDir, spawnedRecords } from "../presence/store.ts";
import { agentById } from "../store/agent-rows.ts";
import { tryParseIdentity } from "../backends/identity.ts";
import type { SpawnedRecord } from "../store/spawned-rows.ts";

function agentName(key: string): string | null {
  const id = tryParseIdentity(key)?.id;
  if (!id) return null;
  try { return agentById(orchDir(), id)?.name ?? null; } catch { return null; }
}

export function assertValidAgentName(name: string): void {
  if (!/^[a-z][a-z0-9_-]{0,31}$/.test(name)) {
    throw new Error(`invalid agent name "${name}": must match ^[a-z][a-z0-9_-]{0,31}$`);
  }
}

export function assertNameFree(name: string, workspace: string): void {
  assertValidAgentName(name);
  const presence = loadPresence();
  const taken = [...spawnedRecords().values()].find((record) =>
    agentName(record.pane) === name && record.workspace === workspace && presence.get(record.pane)?.alive);
  if (taken) throw new Error(`name "${name}" is already live as ${taken.pane}; close it or pick another name`);
}

export function liveNamedRecords(prefix: string, workspace: string): SpawnedRecord[] {
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}-\\d+$`);
  const presence = loadPresence();
  return [...spawnedRecords().values()].filter((record) => {
    const name = agentName(record.pane);
    return name !== null && pattern.test(name) && record.workspace === workspace && presence.get(record.pane)?.alive;
  });
}

export function nextNameIndex(prefix: string, workspace: string): number {
  const indices = liveNamedRecords(prefix, workspace)
    .map((record) => Number(agentName(record.pane)!.slice(prefix.length + 1)));
  return indices.length === 0 ? 1 : Math.max(...indices) + 1;
}
