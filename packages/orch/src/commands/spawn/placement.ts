import { basename } from "node:path";
import { orchDir } from "../../presence/writer.ts";
import { assertNameFree } from "../../policy/name.ts";
import { agentIdentityEnv, spawnerIdentity, worktreeEnv } from "../../policy/spawner.ts";
import { resolveAdapterOrDie } from "../selection.ts";
import { mintAgentId, serializeIdentity } from "../../backends/identity.ts";
import { headlessBackend, resolveBackend } from "../../backends/registry.ts";
import { nextTilePlacement } from "../../backends/tiling.ts";
import { createAgentWorktree } from "../../worktree.ts";
import { errorMessage } from "../../util.ts";
import { registerSpawnedAgent } from "../../store/spawn-registration.ts";
import { callerOwnerToken, die } from "../target.ts";
import { LAUNCH_ENV } from "../../identity/launch.ts";
import { callerPlexer } from "../../identity/self.ts";
import { commandLogger } from "../logging.ts";
import type { Backend, BackendGroup, BackendHandle, CreatedHome, GroupLayoutRole, TileFirstSplit } from "../../types/backend.ts";
import { homeHandle, openHome } from "../../store/home-rows.ts";
import type { CreatedAgent, OpenFleetHomeRequest, SpawnPlacement, SpawnPlacementRequest, TabSpawnSpec } from "../../types/command.ts";
import type { HomeSubject } from "../../types/backend.ts";
import type { SpawnSettings } from "./flags.ts";


/**
 * The name a home orch opens for itself carries: the directory the fleet works
 * in. A workspace called `orch/orch` says which repo is inside it; the fleet's
 * first slice name, which this used to take, said only what the first agent was
 * doing at the time.
 */
function homeName(cwd: string, subject: HomeSubject): string {
  return basename(cwd) || subject.id;
}

/**
 * Where this fleet goes: orch's own space and the plexer's workspace, apart.
 *
 * The coordinate a plexer hands back is NOT an orch noun. This used to return it
 * as the space id, which both printed a plexer's
 * word as a name a human chose and produced a space `requireSpace` then refused.
 *
 * E8 — an orch spawning into a plexer it is not itself inside gets its own new
 * home so its pack is visibly separate from other orchs' work and from the
 * human's own agents. Allowable, but never unmarked, and never unasked. This
 * decides that a home is owed and asks for it; {@link openFleetHome} opens it.
 *
 * A7 — a space is user-created and OPTIONAL. Nothing here mints one; with none
 * set the reachability boundary is the repo root.
 */
export function resolveSpawnPlacement(request: SpawnPlacementRequest): SpawnPlacement {
  const { directory, backend, space, packRootId, callerPlexer, grantNewHome } = request;
  // A space the user named is where the agents are FILED, whether or not this
  // plexer holds a home for it. A home recorded in another plexer is not this
  // one's to drive, so its absence here is simply no coordinate.
  if (space !== null) {
    return { space, workspace: homeHandle(directory, { kind: "space", id: space }, backend.id) ?? undefined, homeToOpen: null };
  }
  // Whether this environment can hold a home at all is read from the COMPOSED
  // ROLE, never from whether a method happens to exist (E13). Its absence is the
  // answer, not a failure (E14): the plexer places the fleet on its own default.
  // Already inside this plexer: the fleet lands beside the caller, so there is no
  // window to open and nothing to ask the human for. WHERE the caller sits is an
  // environment fact orch RECORDED at spawn or registration (Rule 11). It arrives
  // as a fact; this function probes nothing.
  const inside = callerPlexer !== null && callerPlexer === backend.id;
  if (backend.spaceHome === null || inside || packRootId === null) return { space: null, workspace: undefined, homeToOpen: null };
  const subject: HomeSubject = { kind: "pack", id: packRootId };
  const existing = homeHandle(directory, subject, backend.id);
  if (existing !== null) return { space: null, workspace: existing, homeToOpen: null };
  grantNewHome();
  return { space: null, workspace: undefined, homeToOpen: subject };
}

/** Open the home {@link resolveSpawnPlacement} said this fleet is owed. The
 *  home's root place is opened under the first agent's environment, because
 *  that agent launches in it: a second group beside an empty root is the tab
 *  nobody asked for. */
export function openFleetHome(request: OpenFleetHomeRequest): CreatedHome {
  const { directory, backend, subject, cwd, env } = request;
  const role = backend.spaceHome;
  if (role === null) die(`${backend.id} cannot open a home for this fleet`);
  try {
    return openHome({ directory, subject, plexerId: backend.id, home: role, cwd, label: homeName(cwd, subject), env });
  } catch (error: unknown) {
    die(`could not open a home for this fleet: ${errorMessage(error)}`);
  }
}

// The single spawn-into-a-group pipeline shared by `orch spawn` and `orch tile`.
// ONE key per agent: the identity is minted before launch and passed as the
// launch credential — the name and the backend handle are recorded
// beside it as plain fields, never folded into it. The caller owns error policy
// (warn-and-continue vs die); this throws on backend failure.
export function spawnOneIntoTab(spec: TabSpawnSpec): CreatedAgent {
  assertNameFree(spec.name, spec.space);
  const key = spec.key ?? serializeIdentity({ id: mintAgentId() });
  const spawner = spawnerIdentity();
  const env = spec.env ?? { ...agentIdentityEnv(spec.name, spawner), ...worktreeEnv(spec.worktree, spec.branch), [LAUNCH_ENV]: key, ORCH_DIR: orchDir() };
  let place: BackendHandle | undefined;
  if (spec.placement) {
    if (!spec.backend.placement) throw new Error("environment cannot place an agent");
    place = spec.backend.placement.open({ cwd: spec.cwd, workspace: spec.workspace, group: spec.group, split: spec.placement.split, targetHandle: spec.placement.targetHandle, env }).handle;
  } else {
    place = spec.intoHandle;
  }
  let handle: BackendHandle;
  try {
    handle = spec.backend.spawn(spec.adapter, {
      key, env, cwd: spec.cwd, name: spec.name, workspace: spec.workspace, group: spec.group,
      intoHandle: place, orchDir: orchDir(), model: spec.model, preferredModels: spec.preferredModels,
      tools: spec.tools, workers: spec.workers, cmd: spec.cmd,
    });
  } catch (error: unknown) {
    if ((spec.placement !== undefined || spec.intoHandle !== undefined) && spec.backend.placement) {
      if (place !== undefined) {
        try { spec.backend.placement.close(place); } catch { /* best effort */ }
      }
    }
    throw error;
  }
  // ONE writer for one record (2.1). This states every axis the agent has —
  // harness, plexer, handle, space, model, worktree, holder — because a second
  // writer filling in the rest is how the two came to disagree about which
  // record was authoritative.
  registerSpawnedAgent(orchDir(), {
    key, harnessId: spec.adapterId, backendId: spec.backend.id, placed: spec.backend.placementInventory !== null,
    handle: String(handle), cwd: spec.cwd, name: spec.name, model: spec.model, space: spec.space ?? undefined,
    spawner: spec.spawnerAgentId ?? null,
    owner: callerOwnerToken(),
    worktree: spec.worktree && spec.branch ? { path: spec.worktree, branch: spec.branch } : undefined,
  });
  return { key, handle: String(handle), name: spec.name };
}

/** Add one agent to a group at the spot the planner picks for it against the
 *  group's live geometry. This is the whole of `orch tile`, and growing a fleet
 *  is tiling one agent at a time — the balance only holds while every agent is
 *  placed by the same planner reading the same layout. */
export function tileAgentIntoGroup(spec: Omit<TabSpawnSpec, "placement">, firstSplit: TileFirstSplit, role: GroupLayoutRole): CreatedAgent {
  return spawnOneIntoTab({ ...spec, placement: nextTilePlacement(role, spec.group, firstSplit) });
}

/** Tile one of this launch's named agents, in its own worktree when asked. */
function placeAgent(settings: SpawnSettings, name: string, space: string | null, workspace: string | undefined, group: string, backend: Backend, spawnerAgentId: string | null, role: GroupLayoutRole): CreatedAgent {
  const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
  return tileAgentIntoGroup({
    backend,
    adapter: resolveAdapterOrDie(settings.adapter),
    adapterId: settings.adapter,
    name,
    cwd,
    space,
    workspace,
    group,
    model: settings.model,
    thinking: settings.thinking,
    preferredModels: settings.preferredModels,
    tools: settings.tools,
    workers: settings.workers,
    cmd: settings.commandFlag ? settings.cmd : undefined,
    worktree: settings.worktree ? cwd : undefined,
    branch: settings.worktree ? `orch/${name}` : undefined,
    spawnerAgentId,
  }, settings.tiling.first_split, role);
}

/** Fill a group with named agents. An agent that fails to come up is named and the
 *  rest still launch — a fleet short one worker beats no fleet. */
export function growFleetIntoGroup(settings: SpawnSettings, space: string | null, workspace: string | undefined, group: string, backend: Backend, names: readonly string[], spawnerAgentId: string | null, role: GroupLayoutRole): CreatedAgent[] {
  const created: CreatedAgent[] = [];
  for (const name of names) {
    try {
      created.push(placeAgent(settings, name, space, workspace, group, backend, spawnerAgentId, role));
    } catch (error: unknown) {
      const message = errorMessage(error);
      commandLogger().warn("spawn.place-failed", { backend: backend.id, name, error: message });
      process.stdout.write(`warning: could not place agent ${name}: ${message}\n`);
    }
  }
  return created;
}

/** Find a tab by id or label in the target space, for `spawn --tab <existing>`. */
/** `group.workspace` is the PLEXER's coordinate, so the match is against the
 *  workspace this spawn resolved — never against orch's space id (E10). With no
 *  coordinate resolved, any group carrying the label is the one meant. */
export function findGroupInSpace(backend: Backend, workspace: string | undefined, target: string): BackendGroup | undefined {
  return [...(backend.groupHome?.list() ?? [])].find((group) =>
    (group.id === target || group.label === target)
    && (group.workspace === null || workspace === undefined || group.workspace === workspace));
}
/**
 * Where the fleet runs is placement, never identity (Rule 11). Inside a plexer the
 * fleet lands beside the caller. Outside every plexer the default is headless: a
 * plexer the caller did not name is a window nobody asked for. A plexer named with
 * `--backend` opens its own home, and that opening is what the human grants.
 */
export function spawnBackend(settings: Pick<SpawnSettings, "backend" | "space" | "backendExplicit">): Backend {
  const backend = resolveBackend({ configured: settings.backend });
  if (!backend.groupHome || settings.space !== null) return backend;
  if (callerPlexer() === backend.id) return backend;
  if (settings.backendExplicit && backend.spaceHome) return backend;
  const reason = settings.backendExplicit
    ? `${backend.id} cannot open a space of its own`
    : `no --backend was named`;
  commandLogger().warn("spawn.headless-fallback", { backend: backend.id, explicit: settings.backendExplicit });
  process.stdout.write(
    `orch is not running inside ${backend.id} and ${reason} - spawning headless. `
    + `Pass --backend ${backend.id} to open a ${backend.id} home for these agents (the user grants it),`
    + ` or --space <id> to place them in an open space.\n`,
  );
  return headlessBackend;
}
