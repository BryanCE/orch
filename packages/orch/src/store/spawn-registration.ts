import type { OrchDir } from "../types/core.ts";
import { eq } from "drizzle-orm";
import { agentById, ensureHarness, ensureHost, ensurePlexer, insertAgent, setWorktree } from "./agent-rows.ts";
import { hostname } from "node:os";
import { hostOs } from "../host.ts";
import { recordProcess, setAgentPlexer, setHandle, setSpace, setTuning } from "./interval-rows.ts";
import { spaces } from "../db/schema.ts";
import { acquireLease } from "./lease-rows.ts";
import { orm, withTransaction } from "./connection.ts";
import type { SpawnRegistration } from "../types/store.ts";

/**
 * Write the normalized agent model for one successfully spawned process.
 *
 * Identity is the minted id inside `key` and nothing else; every environment
 * axis below is STATED by the caller and written to the table that owns it, so
 * an agent that moves keeps the identity it was minted with.
 */
export function registerSpawnedAgent(directory: OrchDir, input: SpawnRegistration): string {
  // One transaction: the daemon reaps any agent row without a live process on
  // its liveness tick, so the row and its process must land together.
  return withTransaction(directory, () => writeSpawnedAgent(directory, input));
}

function writeSpawnedAgent(directory: OrchDir, input: SpawnRegistration): string {
  const agentId = input.key;
  const now = input.now ?? Date.now();
  const spawnerId = input.spawner && agentById(directory, input.spawner) ? input.spawner : null;
  if (input.placed && input.handle === undefined) throw new Error("a placed agent requires a handle");

  // A space is USER-CREATED (A7): a spawn naming one that does not exist is a
  // refusal, never a licence to conjure the place. This gate lived in the second
  // writer, and deleting that writer without it would have made every unknown
  // space silently succeed.
  if (input.space !== undefined) requireSpace(directory, input.space);
  ensureHarness(directory, input.harnessId, input.harnessId, now);
  const host = hostname();
  ensureHost(directory, host, host, hostOs(), now);
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
  writeEnvironment(directory, agentId, now, host, input);
  // Ownership is the LAST word: `owner` is who holds the agent now, the spawner
  // only the fallback for a launch that named nobody else. An agent never holds
  // its own lease (`agent_leases_not_self`). A holder is an agent orch already
  // registered; orch never conjures one.
  const holder = input.owner ?? spawnerId;
  if (holder !== null && holder !== undefined && holder !== agentId) {
    if (!agentById(directory, holder)) throw new Error(`orch: holder ${holder} is not a registered agent`);
    acquireLease(directory, agentId, holder, now);
  }
  return agentId;
}

/** Every environment axis a spawn states, each on its own interval table:
 *  plexer, handle, process, space, tuning, worktree. */
function writeEnvironment(directory: OrchDir, agentId: string, now: number, host: string, input: SpawnRegistration): void {
  if (input.backendId !== undefined) setAgentPlexer(directory, agentId, input.backendId);
  if (input.handle !== undefined) setHandle(directory, agentId, now, input.handle);
  recordProcess(directory, agentId, now, { hostId: host, pid: input.process.pid, startToken: input.process.startToken });
  // The space is an axis in its own right, on its own timeline: an agent can be
  // moved between spaces without touching the plexer it sits in, and neither is
  // part of the identity that named it. Writing the plexer here and leaving the
  // space unwritten is what forced every other reader to go on parsing it back
  // out of the key.
  if (input.space !== undefined) setSpace(directory, agentId, now, input.space);
  // The effort is STATED by the launch that resolved it. Splitting it back out of
  // `model` recorded NULL for every spawn, because the launch hands over the bare
  // id — so the row said the fleet ran at no effort while every pin said `high`.
  setTuning(directory, agentId, now, { model: input.model, thinking: input.thinking });
  if (input.worktree) setWorktree(directory, agentId, input.worktree.path, input.worktree.branch);
}

/** A7 — a space is the user's to create; a spawn into an unknown one is refused
 *  rather than inventing the place it names. */
function requireSpace(directory: OrchDir, spaceId: string): void {
  if (!orm(directory).select({ id: spaces.id }).from(spaces).where(eq(spaces.id, spaceId)).get()) {
    throw new Error(`orch: no space named "${spaceId}". Create it first with 'orch space create ${spaceId}'.`);
  }
}
