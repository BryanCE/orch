import type { OrchDir } from "../types/core.ts";
import { eq } from "drizzle-orm";
import { agentById, ensureHarness, ensurePlexer, insertAgent, originOf, setOrigin, setWorktree } from "./agent-rows.ts";
import { recordProcess, setAgentPlexer, setHandle, setSpace, setTuning } from "./interval-rows.ts";
import { hostIdentity } from "../host.ts";
import { placeHere } from "../process-place.ts";
import { spaces } from "../db/schema.ts";
import { acquireLease } from "./lease-rows.ts";
import { orm, withTransaction } from "./connection.ts";
import type { HostedSpawnRegistration, SpawnRegistration } from "../types/store.ts";
import type { HostIdentity } from "../types/host.ts";
import type { HereAgent } from "../types/agent-place.ts";

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

/**
 * Record the reference for an agent a linked host runs for this orchd: the agent row, the
 * host it runs on, the tuning it was launched with, and its spawner's lease. Its process,
 * environment, logs and runs are that host's to record; nothing here names a pid.
 */
export function registerHostedAgent(directory: OrchDir, input: HostedSpawnRegistration): string {
  return withTransaction(directory, () => {
    const now = input.now ?? Date.now();
    const spawnerId = insertSpawnedRow(directory, input, input.host, now);
    setTuning(directory, input.key, now, { model: input.model, thinking: input.thinking });
    holdSpawned(directory, input.key, spawnerId, now);
    return input.key;
  });
}

function writeSpawnedAgent(directory: OrchDir, input: SpawnRegistration): string {
  const agentId = input.key;
  const now = input.now ?? Date.now();
  if (input.placed && input.handle === undefined) throw new Error("a placed agent requires a handle");
  // orchd records a process only for an agent on its own host; one another host runs is
  // that host's orchd's to record, and here it is a reference (`registerHostedAgent`).
  const host = hostIdentity();
  if (input.process.host !== host.id) throw new Error(`orch: ${agentId} runs on host ${input.process.host}, not on this one; only that host's orchd records its process`);

  // A space is USER-CREATED (A7): a spawn naming one that does not exist is a
  // refusal, never a licence to conjure the place. This gate lived in the second
  // writer, and deleting that writer without it would have made every unknown
  // space silently succeed.
  if (input.space !== undefined) requireSpace(directory, input.space);
  // The plexer is STATED, never derived from whether a pane exists: a headless
  // agent runs in the headless plexer just as truly as a herdr agent runs in
  // herdr, and a capless agent states none. Deriving it from `pane` is what
  // forced a SECOND writer to come along behind this one and fill it in (2.1).
  if (input.backendId !== undefined) ensurePlexer(directory, input.backendId, input.backendId, now);
  const spawnerId = insertSpawnedRow(directory, input, host, now);
  // Provenance: stated by a spawn another host asked for, inherited from a spawner that
  // carries one, so the asking host's whole tree stays its own.
  const origin = input.origin ?? (spawnerId === null ? null : originOf(directory, spawnerId));
  if (origin !== null) setOrigin(directory, agentId, origin);
  writeEnvironment(directory, placeHere(directory, agentId), now, input);
  holdSpawned(directory, agentId, input.owner ?? spawnerId, now);
  return agentId;
}

/** The agent row every spawn writes, wherever the agent runs, with its harness and the host
 *  it runs on recorded. Answers with the spawner, when it is an agent registered here. */
function insertSpawnedRow(directory: OrchDir, input: Pick<SpawnRegistration, "key" | "harnessId" | "cwd" | "name" | "spawner">, host: HostIdentity, now: number): string | null {
  const spawnerId = input.spawner && agentById(directory, input.spawner) ? input.spawner : null;
  ensureHarness(directory, input.harnessId, input.harnessId, now);
  insertAgent(directory, {
    id: input.key,
    spawnedBy: spawnerId,
    harnessId: input.harnessId,
    host,
    cwd: input.cwd,
    name: input.name,
    createdAt: now,
  });
  return spawnerId;
}

/** Ownership is the LAST word: `holder` is who holds the agent now, the spawner only the
 *  fallback for a launch that named nobody else. An agent never holds its own lease
 *  (`agent_leases_not_self`). A holder is an agent orch already registered; orch never
 *  conjures one. */
function holdSpawned(directory: OrchDir, agentId: string, holder: string | null, now: number): void {
  if (holder === null || holder === agentId) return;
  if (!agentById(directory, holder)) throw new Error(`orch: holder ${holder} is not a registered agent`);
  acquireLease(directory, agentId, holder, now);
}

/** Every environment axis a spawn states, each on its own interval table:
 *  plexer, handle, process, space, tuning, worktree. The agent runs here, so it has all of them. */
function writeEnvironment(directory: OrchDir, agent: HereAgent, now: number, input: SpawnRegistration): void {
  const agentId = agent.id;
  if (input.backendId !== undefined) setAgentPlexer(directory, agent, input.backendId);
  if (input.handle !== undefined) setHandle(directory, agent, now, input.handle);
  recordProcess(directory, agent, now, { pid: input.process.pid, startToken: input.process.startToken });
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
  if (input.worktree) setWorktree(directory, agent, input.worktree);
}

/** A7 — a space is the user's to create; a spawn into an unknown one is refused
 *  rather than inventing the place it names. */
function requireSpace(directory: OrchDir, spaceId: string): void {
  if (!orm(directory).select({ id: spaces.id }).from(spaces).where(eq(spaces.id, spaceId)).get()) {
    throw new Error(`orch: no space named "${spaceId}". Create it first with 'orch space create ${spaceId}'.`);
  }
}
