import { liveAgents } from "../store/agent-rows.ts";
import { currentLease } from "../store/lease-rows.ts";
import { recordedProcessIsLive } from "../store/interval-rows.ts";
import type { OrchDir } from "../types/core.ts";
import type { AgentRow } from "../types/store.ts";
import type { UnleasedAgent } from "../types/daemon.ts";

/** An orphan has a spawner and no live holder. A root, like a terminal or a harness session, is never one. */
export function isOrphan(orchDir: OrchDir, agent: Pick<AgentRow, "id" | "spawnedBy">): boolean {
  if (agent.spawnedBy === null) return false;
  const lease = currentLease(orchDir, agent.id);
  return lease === null || !recordedProcessIsLive(orchDir, lease.orchId);
}

/** Every live orphan, by id. */
export function orphanAgents(orchDir: OrchDir): UnleasedAgent[] {
  return liveAgents(orchDir)
    .filter((agent) => isOrphan(orchDir, agent))
    .map((agent) => ({ id: agent.id, name: agent.name }));
}
