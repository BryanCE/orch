import { parseIdentity } from "../backends/identity.ts";
import { splitThinkingSuffix } from "../policy/thinking.ts";
import { agentById, ensureHarness, ensurePlexer, insertAgent, setWorktree } from "./agent-rows.ts";
import { setAgentPlexer, setHandle, setTuning } from "./interval-rows.ts";
import { acquireLease } from "./lease-rows.ts";

export interface SpawnRegistration {
  key: string;
  harnessId: string;
  backendId: string;
  /** Whether this backend exposes the agent in a pane. */
  pane: boolean;
  handle?: string;
  cwd: string;
  name: string;
  model: string;
  /** The hello-registered agent id of the spawning session, when it has one. */
  spawner: string | null;
  worktree?: { path: string; branch: string };
  now?: number;
}

/**
 * Write the normalized agent model for one successfully spawned process.
 * The legacy spawned row is intentionally written by the caller alongside this
 * registration until the registry-key replacement lands.
 */
export function registerSpawnedAgent(directory: string, input: SpawnRegistration): string {
  const agentId = parseIdentity(input.key).id;
  const now = input.now ?? Date.now();
  const spawnerId = input.spawner && agentById(directory, input.spawner) ? input.spawner : null;
  const tuning = splitThinkingSuffix(input.model);
  const handle = input.handle;
  if (input.pane && handle === undefined) throw new Error("pane spawn registration requires a handle");

  ensureHarness(directory, input.harnessId, input.harnessId, now);
  if (input.pane) ensurePlexer(directory, input.backendId, input.backendId, now);
  insertAgent(directory, {
    id: agentId,
    spawnedBy: spawnerId,
    harnessId: input.harnessId,
    cwd: input.cwd,
    name: input.name,
    createdAt: now,
  });
  if (input.pane) {
    setAgentPlexer(directory, agentId, input.backendId);
    setHandle(directory, agentId, now, handle!);
  }
  setTuning(directory, agentId, now, { model: tuning.bare, thinking: tuning.thinking });
  if (input.worktree) setWorktree(directory, agentId, input.worktree.path, input.worktree.branch);
  if (spawnerId) acquireLease(directory, agentId, spawnerId, now);
  return agentId;
}
