import { parseIdentity } from "../backends/identity.ts";
import { splitThinkingSuffix } from "../policy/thinking.ts";
import { agentById, ensureHarness, ensurePlexer, insertAgent, setWorktree } from "./agent-rows.ts";
import { setAgentPlexer, setHandle, setSpace, setTuning } from "./interval-rows.ts";
import { acquireLease } from "./lease-rows.ts";
import type { SpawnRegistration } from "../types/store.ts";

/**
 * Write the normalized agent model for one successfully spawned process.
 *
 * Identity is the minted id inside `key` and nothing else; every environment
 * axis below is STATED by the caller and written to the table that owns it, so
 * an agent that moves keeps the identity it was minted with.
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
  // The space is an axis in its own right, on its own timeline: an agent can be
  // moved between spaces without touching the plexer it sits in, and neither is
  // part of the identity that named it. Writing the plexer here and leaving the
  // space unwritten is what forced every other reader to go on parsing it back
  // out of the key.
  if (input.space !== undefined) setSpace(directory, agentId, now, input.space);
  setTuning(directory, agentId, now, { model: tuning.bare, thinking: tuning.thinking });
  if (input.worktree) setWorktree(directory, agentId, input.worktree.path, input.worktree.branch);
  if (spawnerId) acquireLease(directory, agentId, spawnerId, now);
  return agentId;
}
