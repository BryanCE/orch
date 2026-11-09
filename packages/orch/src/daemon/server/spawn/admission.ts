import { assertNameFree, assertValidAgentName } from "../../../policy/name.ts";
import { term } from "../../../policy/vocabulary.ts";
import { depthOf } from "../../../policy/provenance.ts";
import { SpawnRefusalError } from "../../../refusal.ts";
import { refreshStaleShims } from "../doctor/runner.ts";
import { countOf, errorMessage } from "../../../util.ts";
import { indexPresenceById } from "../../../shared/lookup.ts";
import { agentViews } from "../../../store/agent-view.ts";
import { loadPresence } from "../../../presence/store.ts";
import type { Backend } from "../../../types/backend.ts";
import type { ModelCatalogue } from "../../../types/adapter.ts";
import type { Logger, OrchDir } from "../../../types/core.ts";
import type { AgentView, GrantAction } from "../../../types/store.ts";
import type { PresenceEntry } from "../../../types/presence.ts";
import type { OrchSettings } from "../../../types/settings.ts";
import type { ResultOf } from "../../client/protocol.ts";
import type { SpawnSettings } from "./plan.ts";
import { admitLaunchModel, offeredModels } from "./models.ts";
import { admitHome } from "../handlers/grant.ts";
import { withLaunchPoints } from "../../../policy/compaction.ts";
import { computeFleetCapacity, liveSpawnCounts, packsUsed } from "../../../policy/capacity.ts";
import { availableMemoryMb, memoryRefusal } from "../../../policy/memory.ts";

/** Who asked for the spawn, as orchd resolved its credential. */
export type CallerSelf = ResultOf<"self">;

/** The live fleet as the admission checks read it, from the store: live views by id, presence by id. */
export interface LiveFleet {
  readonly views: ReadonlyMap<string, AgentView>;
  readonly presence: ReadonlyMap<string, PresenceEntry>;
}

export function liveFleet(directory: OrchDir): LiveFleet {
  const views = new Map<string, AgentView>(agentViews(directory)
    .filter((view) => view.endedAt === null)
    .map((view): [string, AgentView] => [view.id, view]));
  return { views, presence: indexPresenceById(loadPresence(directory).values()) };
}

// A8: the role noun is never spelled here; the one map spells it, so renaming
// the term renames this message with it.
const SPAWN_POLICY_OFFERS = `bind the task to a live ${term("slave")} (orch dispatch <name>) or put it on the pack queue (orch queue add)`;


/** Live members of the spawner's pack, the spawner itself included. A bare
 *  operator session has no pack: its scope is the space it spawns into, and
 *  with no space named it fills nothing but the fleet it asks for. */
function livePackMembers(
  settings: Pick<OrchSettings, "fleet">,
  space: string | null,
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  packRoot: string | null,
): number {
  if (packRoot === null && space === null) return 1;
  const capacity = computeFleetCapacity(views, presence, { fleet: settings.fleet }, {
    packRootId: packRoot,
    packSpace: packRoot === null ? space : undefined,
  });
  // The root itself counts as a live member when it holds no row of its own.
  const rootWithoutRow = packRoot === null || !views.has(packRoot) ? 1 : 0;
  return packsUsed(capacity) + rootWithoutRow;
}

/** Return a spawn policy refusal without allocating a handle, worktree, or queue entry. */
export function spawnPolicyError(
  settings: Pick<OrchSettings, "fleet">,
  space: string | null,
  requested: number,
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  spawnerId: string | null,
): string | null {
  // Depth is read off the ONE provenance walk (`policy/provenance.ts`); the
  // pack root is the fact the store already holds (`agents.root_agent_id`), so
  // nothing here re-derives what a row states. A spawner with no row of its own
  // (a self-registered orch) is its own root at depth 0.
  const depth = spawnerId === null ? 0 : depthOf((id) => views.get(id), spawnerId);
  const maxDepth = settings.fleet.max_depth;
  if (depth >= maxDepth) {
    return `maximum spawn depth is ${maxDepth} (this spawner is at depth ${depth}; fleet.max_depth). ${SPAWN_POLICY_OFFERS} Raise it with \`orch settings\`.`;
  }
  const packRoot = spawnerId === null ? null : views.get(spawnerId)?.rootAgentId ?? spawnerId;
  const live = livePackMembers(settings, space, views, presence, packRoot);
  const cap = settings.fleet.max_agents_per_pack;
  if (live + requested > cap) {
    return `pack cap ${cap} exceeded (${countOf(live, "live member")} + ${requested} requested; fleet.max_agents_per_pack). ${SPAWN_POLICY_OFFERS}`;
  }
  return null;
}

export function assertSpawnPolicy(
  settings: Pick<OrchSettings, "fleet">,
  space: string | null,
  requested: number,
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  spawnerId: string | null,
): void {
  const refusal = spawnPolicyError(settings, space, requested, views, presence, spawnerId);
  if (refusal) throw new SpawnRefusalError(`spawn refused: ${refusal}`);
}

/** Refuse a spawn or tile that would crowd one tab past `fleet.max_agents_per_tab`.
 *  `occupied` is what the tab holds now: a new tab holds nothing, an existing one
 *  is counted through the environment's layout capability, never a plexer call. */
export function assertTabCapacity(settings: Pick<OrchSettings, "fleet">, tab: string, occupied: number, requested: number): void {
  const cap = settings.fleet.max_agents_per_tab;
  if (occupied + requested <= cap) return;
  throw new SpawnRefusalError(`spawn refused: would put tab ${tab} at ${occupied + requested}/${cap} agents (${occupied} placed + ${requested} requested; fleet.max_agents_per_tab). Open another tab: orch spawn <name>... --tab <tab>.`);
}

export function assertSpawnCapacity(
  settings: Pick<OrchSettings, "fleet">,
  space: string | null,
  requested: number,
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
): void {
  const counts = liveSpawnCounts(views, presence);
  const capacity = computeFleetCapacity(views, presence, settings);
  const live = capacity.total.used;
  const spaceLive = space === null ? 0 : counts.get(space) ?? 0;
  const spaceCap = space === null ? undefined : settings.fleet.max_agents_per_space[space];
  if (spaceCap !== undefined && spaceLive + requested > spaceCap) {
    throw new SpawnRefusalError(`spawn refused: would put ${space} at ${spaceLive + requested}/${spaceCap} agents (${spaceLive} live + ${requested} requested; fleet.max_agents_per_space.${space})`);
  }
  const globalCap = settings.fleet.max_agents_total;
  if (globalCap !== undefined && live + requested > globalCap) {
    throw new SpawnRefusalError(`spawn refused: would put all spaces at ${live + requested}/${globalCap} agents (${live} live + ${requested} requested; fleet.max_agents_total)`);
  }
}

/** Exactly what opening a space for this fleet would do. Every field the
 *  human must see is here: it is both what they read and what the grant is
 *  bound to, so the two can never describe different actions. */
function newSpaceAction(settings: SpawnSettings, backend: Backend): GrantAction {
  return {
    kind: "spawn.new-space",
    params: { plexer: backend.id, cwd: settings.cwd, agents: String(settings.agents.length), name: settings.prefix },
  };
}

/** Opening a space puts a window on the human's screen, so a caller with no
 *  space of its own may not take one unasked. There is no flag to pass here:
 *  a flag is typed by whoever runs the command, which is the agent. */
export function assertNewSpaceGranted(directory: OrchDir, actor: string | null, settings: SpawnSettings, backend: Backend): GrantAction {
  const action = newSpaceAction(settings, backend);
  const admitted = admitHome(directory, action, actor);
  if (admitted.granted) return action;
  throw new SpawnRefusalError(`orch is not running inside a ${backend.id} space, so this spawn would open a NEW ${backend.id} space.\n`
    + `Ask the user to approve it in another terminal:\n\n    orch grant ${admitted.requestId}\n\n`
    + `then retry this exact command. Or pass --space <space> to place the fleet in an open space,`
    + ` or drop --plexer and pass --prompt to launch headless with no space at all.`);
}
/** Everything that can refuse a spawn, run before it creates anything. A refused
 *  spawn leaves no handle, no worktree and no queue entry. Returns the settings the
 *  launch runs on: every agent's model admitted, so a short name is expanded once
 *  here and the plans downstream carry the spec the harness receives. */
export async function admitSpawn(
  directory: OrchDir,
  self: CallerSelf,
  settingsFile: OrchSettings,
  settings: SpawnSettings,
  logger: Logger,
  catalogue: ModelCatalogue,
): Promise<SpawnSettings> {
  const { views, presence } = liveFleet(directory);
  // Provenance depth and pack size come first: before a backend is resolved and
  // before any space is allocated.
  assertSpawnPolicy(settings, settings.space ?? self.space, settings.agents.length, views, presence, self.id);
  const lowMemory = memoryRefusal(settings, availableMemoryMb());
  if (lowMemory) throw new SpawnRefusalError(`spawn refused: ${lowMemory}`);
  const agents = settings.agents.map((agent) => ({ ...agent, model: admitLaunchModel(settingsFile, agent.adapter, catalogue, agent.model) }));
  // Shim refresh is a launch side effect, so it happens only after policy
  // accepts, and only for the harnesses actually being launched.
  await refreshStaleShims(directory, logger, [...new Set(agents.map((agent) => agent.adapter))], settingsFile);
  // Herdr rejects an invalid prefix, so no placement side effect may precede it.
  try {
    assertValidAgentName(settings.prefix);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
  return { ...settings, agents, workers: withLaunchPoints(settings.workers, offeredModels(catalogue)) };
}

/** Assert every already-resolved name is free in this space, before anything
 *  is created. Separate from resolution because freeness reads live state. */
export function claimSpawnNames(
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
  names: readonly string[],
  space: string | null,
): string[] {
  try {
    for (const name of names) assertNameFree(views, presence, name, space);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
  return [...names];
}
