import { orchDir } from "../../presence/store.ts";
import { recordGrantRequest, spendGrant } from "../../store/grant-rows.ts";
import { assertValidAgentName } from "../../policy/name.ts";
import { spawnerIdentity } from "../../policy/spawner.ts";
import { term } from "../../policy/vocabulary.ts";
import { depthOf } from "../../policy/provenance.ts";
import { SpawnRefusalError } from "../../refusal.ts";
import { refreshStaleShims } from "../../doctor/runner.ts";
import { errorMessage } from "../../util.ts";
import { agentViewIndex, die, presenceById } from "../target.ts";
import { callerSpace } from "../../identity/self.ts";
import type { Backend } from "../../types/backend.ts";
import type { AgentView, GrantAction } from "../../types/store.ts";
import type { PresenceEntry } from "../../types/presence.ts";
import type { OrchConfig } from "../../types/config.ts";
import type { SpawnSettings } from "./flags.ts";
import { assertLaunchModelAllowed } from "./models.ts";


/** Live agents per space. Both maps are keyed by the minted id: a space is an
 *  environment axis composed onto the agent, and presence answers for the same
 *  identity — joining the two on a pane key is what lost the detached fleet. */
export function liveSpawnCounts(
  views: ReadonlyMap<string, AgentView>,
  presence: ReadonlyMap<string, PresenceEntry>,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [id, view] of views) {
    const space = view.environment.space;
    if (!presence.get(id)?.alive || space === null) continue;
    counts.set(space, (counts.get(space) ?? 0) + 1);
  }
  return counts;
}

// A8: the role noun is never spelled here; the one map spells it, so renaming
// the term renames this message with it.
const SPAWN_POLICY_OFFERS = `bind the task to a live ${term("slave")} (orch dispatch <name>) or put it on the pack queue (orch queue add)`;


/** Return a spawn policy refusal without allocating a pane, tab, worktree, or queue entry. */
export function spawnPolicyError(
  settings: Pick<OrchConfig, "fleet">,
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
  // A bare operator session has no pack; its scope is the space it is spawning into.
  let live = 0;
  for (const [id, view] of views) {
    const samePack = packRoot === null ? view.environment.space === space : view.rootAgentId === packRoot;
    if (samePack && presence.get(id)?.alive) live++;
  }
  // The root itself counts as a live member when it holds no row of its own.
  if (packRoot === null || !views.has(packRoot)) live++;
  const cap = settings.fleet.max_agents_per_pack;
  if (live + requested > cap) {
    return `pack cap ${cap} exceeded (${live} live member${live === 1 ? "" : "s"} + ${requested} requested; fleet.max_agents_per_pack). ${SPAWN_POLICY_OFFERS}`;
  }
  return null;
}

export function assertSpawnPolicy(settings: Pick<OrchConfig, "fleet">, space: string | null, requested: number): void {
  const refusal = spawnPolicyError(settings, space, requested, agentViewIndex(), presenceById(), spawnerIdentity().key);
  if (refusal) throw new SpawnRefusalError(`spawn refused: ${refusal}`);
}

export function assertSpawnCapacity(
  settings: Pick<OrchConfig, "fleet">,
  space: string | null,
  requested: number,
  views: ReadonlyMap<string, AgentView> = agentViewIndex(),
  presence: ReadonlyMap<string, PresenceEntry> = presenceById(),
): void {
  const counts = liveSpawnCounts(views, presence);
  const live = [...counts.values()].reduce((total, count) => total + count, 0);
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

// Detached agents are launched BY THE DAEMON, not here: orchd outlives this CLI
// and already owns delivery. Each runs the prompt it was launched with and exits —
// there is no pane for it to idle in.
/** Exactly what opening a space for this fleet would do. Every field the
 *  human must see is here: it is both what they read and what the grant is
 *  bound to, so the two can never describe different actions. */
export function newSpaceAction(settings: SpawnSettings, backend: Backend): GrantAction {
  return {
    kind: "spawn.new-space",
    params: { plexer: backend.id, cwd: settings.cwd, panes: String(settings.n), name: settings.prefix },
  };
}

/** Opening a space puts a window on the human's screen, so a caller with no
 *  space of its own may not take one unasked. There is no flag to pass here:
 *  a flag is typed by whoever runs the command, which is the agent. */
export function assertNewSpaceGranted(settings: SpawnSettings, backend: Backend, callerAgentId: string | null): void {
  const action = newSpaceAction(settings, backend);
  if (spendGrant(orchDir(), action, callerAgentId)) return;
  const request = recordGrantRequest(orchDir(), action, callerAgentId);
  die(`orch is not running inside a ${backend.id} pane, so this spawn would open a NEW ${backend.id} space.\n`
    + `Ask the user to approve it in another terminal:\n\n    orch grant ${request.id}\n\n`
    + `then retry this exact command. Or pass --space <id> to place the fleet in an open space,`
    + ` or --backend headless with --prompt to launch detached.`);
}
/** Everything that can refuse a spawn, run before it creates anything. A refused
 *  spawn leaves no tab, no pane, no worktree and no queue entry. */
export async function admitSpawn(settings: SpawnSettings): Promise<void> {
  // Provenance depth and pack size come first: before a backend is resolved and
  // before any space is allocated.
  assertSpawnPolicy(settings, settings.space ?? callerSpace(), settings.n);
  assertLaunchModelAllowed(settings.adapter, settings.model);
  // Shim refresh is a launch side effect, so it happens only after policy
  // accepts, and only for the harness actually being launched.
  await refreshStaleShims(orchDir(), [settings.adapter]);
  // Herdr rejects an invalid prefix, so no placement side effect may precede it.
  try {
    assertValidAgentName(settings.prefix);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}
