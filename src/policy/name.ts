import { loadPresence, orchDir, spawnedRecords } from "../presence/store.ts";
import { agentById } from "../store/agent-rows.ts";
import { tryParseIdentity } from "../backends/identity.ts";

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
