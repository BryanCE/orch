// An agent's project directory: the one directory its whole fleet shares.
import { selectAgentStatus } from "../../../store/status-rows.ts";
import { projectOf } from "../../../store/agent-rows.ts";
import type { OrchDir } from "../../../types/core.ts";

/** The project directory `agentId` has on record: the one its launch decided, else the one it
 *  reported, which is how an agent orch did not launch says it. Null when it has neither yet. */
export function recordedProject(orchDir: OrchDir, agentId: string): string | null {
  return projectOf(orchDir, agentId) ?? selectAgentStatus(orchDir, agentId)?.project ?? null;
}

/** The project directory `agent` has recorded, else `fallback`.
 *
 *  A spawn asks with its spawner and the directory the spawn was asked from: the new agent
 *  takes its spawner's project, so a fleet shares one whatever directory each agent launches
 *  in, and an agent the human spawns takes the directory the human asked from. A relaunch asks
 *  with the agent itself and the directory it runs in. It is never orchd's own directory. */
export function projectDirectory(orchDir: OrchDir, agent: string | null, fallback: string): string {
  return (agent === null ? null : recordedProject(orchDir, agent)) ?? fallback;
}
