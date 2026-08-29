import { eq } from "drizzle-orm";
import { parseIdentity } from "../backends/identity.ts";
import { splitThinkingSuffix } from "../policy/thinking.ts";
import { agentById, ensureHarness, ensurePlexer, insertAgent, setWorktree } from "./agent-rows.ts";
import { setAgentPlexer, setHandle, setSpace, setTuning } from "./interval-rows.ts";
import { spaces } from "../db/schema.ts";
import { acquireLease } from "./lease-rows.ts";
import { orm } from "./connection.ts";
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

  // A space is USER-CREATED (A7): a spawn naming one that does not exist is a
  // refusal, never a licence to conjure the place. This gate lived in the second
  // writer, and deleting that writer without it would have made every unknown
  // space silently succeed.
  if (input.space !== undefined) requireSpace(directory, input.space);
  ensureHarness(directory, input.harnessId, input.harnessId, now);
  // The plexer is STATED, never derived from whether a pane exists: a headless
  // agent runs in the headless plexer just as truly as a herdr agent runs in
  // herdr, and a capless agent states none. Deriving it from `pane` is what
  // forced a SECOND writer to come along behind this one and fill it in (2.1).
  if (input.backendId !== undefined) ensurePlexer(directory, input.backendId, input.backendId, now);
  insertAgent(directory, {
    id: agentId,
    spawnedBy: spawnerId,
    harnessId: input.harnessId,
    cwd: input.cwd,
    name: input.name,
    createdAt: now,
  });
  if (input.backendId !== undefined) setAgentPlexer(directory, agentId, input.backendId);
  if (handle !== undefined) setHandle(directory, agentId, now, handle);
  // The space is an axis in its own right, on its own timeline: an agent can be
  // moved between spaces without touching the plexer it sits in, and neither is
  // part of the identity that named it. Writing the plexer here and leaving the
  // space unwritten is what forced every other reader to go on parsing it back
  // out of the key.
  if (input.space !== undefined) setSpace(directory, agentId, now, input.space);
  setTuning(directory, agentId, now, { model: tuning.bare, thinking: tuning.thinking });
  if (input.worktree) setWorktree(directory, agentId, input.worktree.path, input.worktree.branch);
  // Ownership is the LAST word: `owner` is who holds the agent now, the spawner
  // only the fallback for a launch that named nobody else. An agent never holds
  // its own lease (`agent_leases_not_self`).
  const holder = input.owner ?? spawnerId;
  if (holder !== null && holder !== undefined && holder !== agentId) {
    ensureOrchAgent(directory, holder, input.harnessId, now);
    acquireLease(directory, agentId, holder, now);
  }
  return agentId;
}

/** Rule 11: an orchestrator IS an agent. A holder orch has never registered gets
 *  a row in the ONE agent table rather than a second id space beside it. */
/** A7 — a space is the user's to create; a spawn into an unknown one is refused
 *  rather than inventing the place it names. */
function requireSpace(directory: string, spaceId: string): void {
  if (!orm(directory).select({ id: spaces.id }).from(spaces).where(eq(spaces.id, spaceId)).get()) {
    throw new Error(`orch: no space named "${spaceId}". Create it first with 'orch space create ${spaceId}'.`);
  }
}

export function ensureOrchAgent(directory: string, orchId: string, harnessId: string, now: number): void {
  if (agentById(directory, orchId)) return;
  ensureHarness(directory, harnessId, harnessId, now);
  insertAgent(directory, { id: orchId, harnessId, cwd: process.cwd(), name: orchId, createdAt: now });
}
