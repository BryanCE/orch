import { basename } from "node:path";
import { assertNameFree } from "../../../policy/name.ts";
import { mintAgentId } from "../../../shared/agent-id.ts";
import { headlessBackend, resolveBackend } from "../../../backends/registry.ts";
import { nextTilePlacement } from "../../../backends/tiling.ts";
import { createAgentWorktree, discardFreshWorktree, type WorktreeIntent } from "../../../worktrees/agent.ts";
import { errorMessage } from "../../../util.ts";
import { hostIdentity } from "../../../hosts/identity.ts";
import { SpawnRefusalError } from "../../../refusal.ts";
import { LAUNCH_ENV } from "../../../identity/launch.ts";
import { compactionEnv } from "../../../policy/workers.ts";
import { registerSpawnedAgent } from "../../../store/spawn-registration.ts";
import type { AgentAdapter } from "../../../types/adapter.ts";
import type { WorkerPolicy } from "../../../types/policy.ts";
import type { Backend, BackendGroup, BackendHandle, CreatedHome, GroupLayoutRole, TileFirstSplit } from "../../../types/backend.ts";
import type { Logger, OrchDir } from "../../../types/core.ts";
import type { DaemonClient } from "../../../types/services.ts";
import { listedHomeHandle, openHome } from "../home.ts";
import type { CreatedAgent, OpenFleetHomeRequest, SpawnPlacement, SpawnPlacementRequest, TabSpawnSpec } from "../../../types/command.ts";
import { liveFleet, type CallerSelf } from "./admission.ts";
import { resolveAdapterOrDie } from "./models.ts";
import type { HomeSubject } from "../../../types/backend.ts";
import type { AgentWorktree } from "../../../types/worktree.ts";
import type { SpawnAgentPlan, SpawnSettings } from "./plan.ts";

/** Lines a spawn reports to whoever asked for it, in the order they happened: warnings about an
 *  agent that did not come up, and why a launch went headless. */
export type SpawnNotes = string[];


/**
 * The name a home orch opens for itself carries: the directory the fleet works
 * in. A workspace called `orch/orch` says which repo is inside it; the fleet's
 * first slice name, which this used to take, said only what the first agent was
 * doing at the time.
 */
function homeName(directory: string, subject: HomeSubject): string {
  return basename(directory) || subject.id;
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
  const { services, backend, space, packRootId, callerPlexer, callerHandle, grantNewHome } = request;
  // A space the user named is where the agents are FILED, whether or not this
  // plexer holds a home for it. A home recorded in another plexer is not this
  // one's to drive, so its absence here is simply no coordinate.
  if (space !== null) {
    const listed = listedHomeHandle(services, { kind: "space", id: space }, backend.id, backend.spaceHome);
    return { space, workspace: listed ?? undefined, homeToOpen: null };
  }
  // Already inside this plexer: the fleet lands beside the caller, so there is no
  // window to open and nothing to ask the human for. WHERE the caller sits is an
  // environment fact orch RECORDED at spawn or registration (Rule 11). It arrives
  // as a fact; this function probes nothing. The plexer says which of its
  // coordinates holds that place.
  if (callerPlexer !== null && callerPlexer === backend.id) {
    return { space: null, workspace: callerCoordinate(backend, callerHandle), homeToOpen: null };
  }
  // Whether this environment can hold a home at all is read from the COMPOSED
  // ROLE, never from whether a method happens to exist (E13). Its absence is the
  // answer, not a failure (E14): the plexer places the fleet on its own default.
  if (backend.spaceHome === null || packRootId === null) return { space: null, workspace: undefined, homeToOpen: null };
  const subject: HomeSubject = { kind: "pack", id: packRootId };
  const existing = listedHomeHandle(services, subject, backend.id, backend.spaceHome);
  if (existing !== null) return { space: null, workspace: existing, homeToOpen: null };
  const grant = grantNewHome();
  return { space: null, workspace: undefined, homeToOpen: { subject, grant } };
}

/** The plexer coordinate holding the caller's recorded place. A caller with no
 *  recorded place, or one the plexer no longer lists, resolves no coordinate;
 *  the plexer then refuses to place rather than pick a workspace of its own. */
function callerCoordinate(backend: Backend, callerHandle: string | null): string | undefined {
  if (callerHandle === null || backend.placementInventory === null) return undefined;
  return backend.placementInventory.coordinateOf(callerHandle) ?? undefined;
}

/** Open the home {@link resolveSpawnPlacement} said this fleet is owed. The
 *  home's root place is opened under the first agent's environment, because
 *  that agent launches in it: a second group beside an empty root is the tab
 *  nobody asked for. */
export function openFleetHome(request: OpenFleetHomeRequest): CreatedHome {
  const { services, backend, home: { subject, grant }, cwd, labelDirectory, env, actor } = request;
  const role = backend.spaceHome;
  if (role === null) throw new SpawnRefusalError(`${backend.id} cannot open a home for this fleet`);
  try {
    return openHome({ services, subject, plexerId: backend.id, home: role, cwd, label: homeName(labelDirectory, subject), env, grant, actor });
  } catch (error: unknown) {
    throw new SpawnRefusalError(`could not open a home for this fleet: ${errorMessage(error)}`);
  }
}

// The single spawn-into-a-group pipeline shared by `orch spawn` and `orch tile`.
// ONE key per agent: the identity is minted before launch and passed as the
// launch credential — the name and the backend handle are recorded
// beside it as plain fields, never folded into it. The caller owns error policy
// (warn-and-continue vs die); this throws on backend failure.
/** The env one agent launches into: its credential, the orch dir, and its harness's
 *  compaction point for its model when one is set. */
export function spawnEnv(orchDir: OrchDir, key: string, adapter: AgentAdapter, model: string | undefined, workers: WorkerPolicy | undefined): Record<string, string> {
  return { [LAUNCH_ENV]: key, ORCH_DIR: orchDir, ...compactionEnv(adapter, model, workers) };
}

function resolveSpawnPlace(spec: TabSpawnSpec, env: Readonly<Record<string, string>>): BackendHandle | undefined {
  let place: BackendHandle | undefined;
  if (spec.placement) {
    if (!spec.backend.placement) throw new Error("environment cannot place an agent");
    place = spec.backend.placement.open({ cwd: spec.cwd, workspace: spec.workspace, group: spec.group, split: spec.placement.split, targetHandle: spec.placement.targetHandle, env }).handle;
  } else {
    place = spec.intoHandle;
  }
  return place;
}

function launchSpawnBackend(orchDir: OrchDir, spec: TabSpawnSpec, key: string, env: Readonly<Record<string, string>>, place: BackendHandle | undefined, thinking: NonNullable<TabSpawnSpec["thinking"]>): BackendHandle {
  let handle: BackendHandle;
  try {
    handle = spec.backend.spawn(spec.adapter, {
      key, env, cwd: spec.cwd, name: spec.name, workspace: spec.workspace, group: spec.group,
      intoHandle: place, orchDir, model: spec.model, thinking, preferredModels: spec.preferredModels,
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
  return handle;
}

function registerSpawnedTabAgent(services: DaemonClient, spec: TabSpawnSpec, key: string, handle: BackendHandle, thinking: NonNullable<TabSpawnSpec["thinking"]>): CreatedAgent {
  // ONE writer for one record (2.1). This states every axis the agent has —
  // harness, plexer, handle, space, model, worktree, holder, process — because a
  // second writer filling in the rest is how the two came to disagree about
  // which record was authoritative.
  registerSpawnedAgent(services.orchDir, {
    key, harnessId: spec.adapterId, backendId: spec.backend.id, placed: spec.backend.placementInventory !== null,
    handle: String(handle), cwd: spec.cwd, name: spec.name, model: spec.model, thinking, space: spec.space ?? undefined,
    spawner: spec.spawner,
    owner: spec.owner,
    worktree: spec.worktree,
    // The pane opened on this machine, so its process runs on this host.
    process: { ...spec.backend.process.running(handle), host: hostIdentity().id },
  });
  return { key, handle: String(handle), name: spec.name, cwd: spec.cwd, branch: spec.worktree?.branch ?? null };
}

export function spawnOneIntoTab(services: DaemonClient, spec: TabSpawnSpec): CreatedAgent {
  const orchDir = services.orchDir;
  const { views, presence } = liveFleet(orchDir);
  assertNameFree(views, presence, spec.name, spec.space);
  const key = spec.key ?? mintAgentId();
  const env = spec.env ?? spawnEnv(orchDir, key, spec.adapter, spec.model, spec.workers);
  const thinking = spec.thinking;
  if (thinking === undefined) throw new Error(`spawn requires a resolved thinking level for ${spec.name}`);
  const place = resolveSpawnPlace(spec, env);
  const handle = launchSpawnBackend(orchDir, spec, key, env, place, thinking);
  return registerSpawnedTabAgent(services, spec, key, handle, thinking);
}

/** Add one agent to a group at the spot the planner picks for it against the
 *  group's live geometry. This is the whole of `orch tile`, and growing a fleet
 *  is tiling one agent at a time — the balance only holds while every agent is
 *  placed by the same planner reading the same layout. */
function tileAgentIntoGroup(services: DaemonClient, spec: Omit<TabSpawnSpec, "placement">, firstSplit: TileFirstSplit, role: GroupLayoutRole): CreatedAgent {
  return spawnOneIntoTab(services, { ...spec, placement: nextTilePlacement(role, spec.group, firstSplit) });
}

/** Where one agent works: its own worktree when the launch asked for one. */
export interface AgentWorkspace {
  readonly cwd: string;
  readonly worktree: AgentWorktree | undefined;
}

/** Make the agent's workspace and have its harness trust it. A worktree is a
 *  directory no harness has seen, so every launch path comes through here. */
export function prepareWorkspace(from: string, intent: WorktreeIntent | null, name: string, adapter: AgentAdapter, cmd: string): AgentWorkspace {
  const workspace = intent === null ? { cwd: from, worktree: undefined } : createAgentWorktree(intent, from, name);
  adapter.workspaceTrust?.preTrustWorkspace(workspace.cwd, cmd);
  return workspace;
}

/** Take back a worktree whose agent never came up, so a retry can use the name. */
export function discardUnusedWorkspace(logger: Logger, intent: WorktreeIntent | null, worktree: AgentWorktree | undefined): void {
  if (intent === null || worktree === undefined) return;
  discardFreshWorktree(worktree, intent.config, (message) => { logger.warn("spawn.worktree-discard-failed", { message }); });
}

/** Tile one of this launch's named agents, in its own worktree when asked. */
function placeAgent(services: DaemonClient, settings: SpawnSettings, plan: SpawnAgentPlan, space: string | null, workspace: string | undefined, group: string, backend: Backend, self: CallerSelf, role: GroupLayoutRole): CreatedAgent {
  const name = plan.name;
  const adapter = resolveAdapterOrDie(plan.adapter);
  const { cwd, worktree } = prepareWorkspace(settings.cwd, settings.worktree, name, adapter, plan.cmd);
  try {
    return tileAgentIntoGroup(services, {
    backend,
    adapter,
    adapterId: plan.adapter,
    name,
    cwd,
    space,
    workspace,
    group,
    model: plan.model,
    thinking: plan.thinking,
    preferredModels: plan.preferredModels,
    tools: settings.tools,
    workers: settings.workers,
    cmd: settings.commandFlag ? plan.cmd : undefined,
    worktree,
    spawner: self.id,
    owner: self.id ?? undefined,
    }, settings.tiling.first_split, role);
  } catch (error: unknown) {
    discardUnusedWorkspace(services.logger, settings.worktree, worktree);
    throw error;
  }
}

/** Fill a group with named agents. An agent that fails to come up is named and the
 *  rest still launch — a fleet short one worker beats no fleet. */
export function growFleetIntoGroup(services: DaemonClient, settings: SpawnSettings, place: { space: string | null; workspace: string | undefined; group: string }, backend: Backend, names: readonly string[], self: CallerSelf, role: GroupLayoutRole, notes: SpawnNotes): CreatedAgent[] {
  const { space, workspace, group } = place;
  const logger = services.logger;
  const created: CreatedAgent[] = [];
  for (const name of names) {
    const plan = settings.agents.find((agent) => agent.name === name);
    if (plan === undefined) {
      logger.warn("spawn.plan-missing", { name });
      continue;
    }
    try {
      created.push(placeAgent(services, settings, plan, space, workspace, group, backend, self, role));
    } catch (error: unknown) {
      const message = errorMessage(error);
      logger.warn("spawn.place-failed", { backend: backend.id, name, error: message });
      notes.push(`warning: could not place agent ${name}: ${message}`);
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
 * fleet lands beside the caller. A plexer the human chose — `--plexer` or
 * `settings.json` — opens its own home, and that opening is
 * what the human grants. Outside every plexer, with none chosen, the default is
 * headless: a plexer orch only probed is a window nobody asked for.
 */
export function spawnBackend(logger: Logger, settings: Pick<SpawnSettings, "backend" | "space" | "backendChosen">, callerPlexer: string | null, notes: SpawnNotes): Backend {
  const backend = resolveBackend({ configured: settings.backend });
  if (!backend.groupHome || settings.space !== null) return backend;
  if (callerPlexer === backend.id) return backend;
  if (settings.backendChosen && backend.spaceHome) return backend;
  const reason = settings.backendChosen
    ? `${backend.id} cannot open a space of its own`
    : `no backend was chosen`;
  logger.warn("spawn.headless-fallback", { backend: backend.id, chosen: settings.backendChosen });
  notes.push(
    `orch is not running inside ${backend.id} and ${reason} - spawning headless. `
    + `Pass --plexer ${backend.id} or set defaults.backend to open a ${backend.id} home for these agents (the user grants it),`
    + ` or --space <space> to place them in an open space.`,
  );
  return headlessBackend;
}
