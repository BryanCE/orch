// `spawn` and `tile`, done by orchd. The caller's plexer runs on this machine, so orchd admits the
// launch, places it in that plexer (or launches headless, or on a linked host), makes each
// agent's worktree, and launches every agent. The CLI waits for them to come up and reports.
import { heldBackend } from "../../../backends/registry.ts";
import { FORM_STDIO } from "../../../types/form.ts";
import { compactionEnv } from "../../../policy/workers.ts";
import { withLaunchPoints } from "../../../policy/compaction.ts";
import { workerPolicyFrom, workerTools } from "../../../policy/workers.ts";
import { workerPrompt, workerRules } from "../../../worker-prompt.ts";
import { mintAgentId } from "../../../shared/agent-id.ts";
import { takesModel } from "../../../shared/harness.ts";
import { planTilePlacement } from "../../../shared/tiling.ts";
import { nextTilePlacement, readGroupLayout } from "../../../backends/tiling.ts";
import { SpawnRefusalError } from "../../../refusal.ts";
import { errorMessage } from "../../../util.ts";
import { callerSelf } from "../handlers/self.ts";
import { spawnHeadless } from "../handlers/lifecycle.ts";
import { resolveTabFor } from "../tabs.ts";
import { adapterCommand, admitLaunchModel, offeredModels, resolveAdapterOrDie } from "./models.ts";
import { localAgentPlan, planSpawn, plexerRequest, selectBackend, selectSpawnForm, worktreeIntent, type SpawnAgentPlan, type SpawnSettings } from "./plan.ts";
import { admitSpawn, assertNewSpaceGranted, assertSpaceCapacity, assertSpawnCapacity, assertSpawnPolicy, assertTabCapacity, claimSpawnNames, liveFleet, type CallerSelf } from "./admission.ts";
import { discardUnusedWorkspace, findGroupInSpace, growFleetIntoGroup, openFleetHome, prepareWorkspace, resolveSpawnPlacement, spawnBackend, spawnEnv, spawnOneIntoTab, type SpawnNotes } from "./placement.ts";
import { freeTabLabel, liveTabLabels } from "./tab-label.ts";
import { openViewers, planViewers, viewerHost } from "./viewers.ts";
import type { AgentAdapter } from "../../../types/adapter.ts";
import type { Backend, BackendGroup, CreatedHome, GroupHomeRole, GroupLayoutRole, TileFirstSplit } from "../../../types/backend.ts";
import type { CreatedAgent, PreparedAgent, SpawnPlacement, TabSpawnSpec } from "../../../types/command.ts";
import type { CallerCredential } from "../../../types/core.ts";
import type { OrchSettings } from "../../../types/settings.ts";
import type { AgentEnvironment } from "../../../types/store.ts";
import type { HarnessTraits, ParamsOf, ResultOf } from "../../client/protocol.ts";
import type { DaemonState } from "../state.ts";

type SpawnResult = ResultOf<"spawn">;
type SpawnedAgent = Extract<SpawnResult, { outcome: "spawned" }>["agents"][number];

/** An environment without the role a launch needs cannot do it. That is an answer, never a throw. */
function noEnvironmentRole(text: string): { outcome: "answer"; reason: "no-environment-role"; text: string } {
  return { outcome: "answer", reason: "no-environment-role", text };
}

/** Who asked, from the credential the CLI sent. A launch from no caller is refused. */
function spawner(state: DaemonState, caller: CallerCredential | undefined): CallerSelf {
  if (caller === undefined) throw new SpawnRefusalError("a spawn names its caller; this request carried no credential");
  return callerSelf(state.directory, { caller });
}

/** The caller's recorded place: every spawn starts from where the caller is. */
function callerEnvironment(self: CallerSelf): AgentEnvironment {
  const environment = self.view?.environment;
  if (environment === undefined) throw new SpawnRefusalError(`spawner ${self.id} has no agent row`);
  return environment;
}

/** What the CLI needs to know of a harness after a launch. */
function harnessTraits(adapter: AgentAdapter): HarnessTraits {
  const startup = adapter.bridge ? "bridge" : adapter.hooks?.reports.includes("start") ? "start" : null;
  return { id: adapter.id, startup, takesModel: takesModel(adapter) };
}

/** The plan an agent launched from. A claimed name is the planned name. */
function planFor(settings: SpawnSettings, name: string): SpawnAgentPlan {
  const plan = settings.agents.find((candidate) => candidate.name === name);
  if (plan === undefined) throw new Error(`missing spawn plan for ${name}`);
  return plan;
}

/** A created agent, with the tuning its plan launched it on. */
function spawned(settings: SpawnSettings, agent: CreatedAgent): SpawnedAgent {
  const plan = planFor(settings, agent.name);
  return { ...agent, harness: plan.adapter, model: plan.model, thinking: plan.thinking };
}

/** The spawn's answer: the agents that started and what the CLI needs to watch them come up. */
function spawnedResult(settings: SpawnSettings, created: readonly CreatedAgent[], fields: { headless: boolean; tab: string | null; panes: ReadonlyMap<string, string>; notes: SpawnNotes }): SpawnResult {
  const harnesses = [...new Set(created.map((agent) => planFor(settings, agent.name).adapter))].map((id) => harnessTraits(resolveAdapterOrDie(id)));
  return {
    outcome: "spawned",
    backend: settings.backend,
    headless: fields.headless,
    host: settings.host?.name ?? null,
    tab: fields.tab,
    requested: settings.agents.length,
    agents: created.map((agent) => spawned(settings, agent)),
    panes: [...fields.panes].map(([key, handle]) => ({ key, handle })),
    harnesses,
    notes: fields.notes,
  };
}

// Headless agents run their prompt and exit. An agent in a process orchd holds, on a linked host
// or here, is shown in a pane of the caller's own plexer.
async function executeHeadlessSpawn(state: DaemonState, params: ParamsOf<"spawn">, self: CallerSelf, settings: SpawnSettings, environment: AgentEnvironment, notes: SpawnNotes): Promise<SpawnResult> {
  const services = state.services;
  const settingsFile = services.settings.current();
  if (settings.commandFlag) throw new SpawnRefusalError("--cmd requires a backend that places agents; headless launches use the selected adapter.");
  // A headless agent here has no TTY to idle on: it runs its prompt and exits, so work
  // dispatched after launch would arrive at a dead process. An agent on a linked host runs in
  // a PTY that host's orchd holds, and idles there waiting for a dispatch like any other.
  if (settings.host === null && settings.agents.some((agent) => agent.form !== null && FORM_STDIO[agent.form] === "none" && !agent.prompt?.trim())) throw new SpawnRefusalError(`a ${settings.backend} spawn needs its work up front: pass --prompt "<text>" or --file <path> (a headless agent runs it and exits)`);
  // Headless agents have no placement environment; without an explicit space, use NULL
  // rather than inventing a space that the caller's environment does not belong to.
  const space = settings.space ?? null;
  const { views, presence } = liveFleet(state.directory);
  assertSpawnPolicy(settingsFile, space, settings.agents.length, views, presence, self.id);
  // A host's total is its own: agents bound for a linked host are counted and ruled on there.
  if (settings.host === null) assertSpawnCapacity(settingsFile, space, settings.agents.length, views, presence);
  else assertSpaceCapacity(settingsFile, space, settings.agents.length, views, presence);
  const maySpawn = self.depth + 1 < settingsFile.fleet.max_depth;
  const viewers = planViewers({ services, settings, environment, actor: self.id });
  const created: CreatedAgent[] = [];
  const names = claimSpawnNames(views, presence, settings.agents.map((agent) => agent.name), space);
  for (const name of names) {
    const plan = planFor(settings, name);
    const adapter = resolveAdapterOrDie(plan.adapter);
    // On another host, --dir names a directory there: nothing here is made or trusted for it.
    const { cwd, worktree } = settings.host === null
      ? prepareWorkspace(settings.cwd, settings.worktree, name, adapter, plan.cmd)
      : { cwd: settings.cwd, worktree: undefined };
    try {
      // ONE key per agent, minted before launch and passed as the launch credential.
      const key = mintAgentId();
      await spawnHeadless(state, {
        form: settings.host === null ? plan.form : plan.requestedForm,
        key,
        name,
        // orchd launches the process, but the spawner is the caller.
        spawner: self.id,
        worktree,
        adapter: plan.adapter,
        cwd,
        model: plan.model,
        thinking: plan.thinking,
        preferredModels: [...plan.preferredModels],
        // An agent on a linked host spawned with no work idles there until its first dispatch.
        prompt: plan.prompt?.trim() ? workerPrompt(plan.prompt, false, adapter, { maySpawn, cwd, ...(worktree === undefined ? {} : { worktreeBranch: worktree.branch }), spawnerRepliable: self.id !== null, ...workerRules(settingsFile) }) : null,
        tools: settings.tools,
        workers: settings.workers,
        env: compactionEnv(adapter, plan.model, settings.workers),
        ...(settings.host === null ? {} : { host: settings.host.name }),
        ...(params.actor === undefined ? {} : { actor: params.actor }),
      });
      // A headless agent is placed nowhere, so its key is the handle every display uses.
      created.push({ key, handle: key, name, cwd, branch: worktree?.branch ?? null });
    } catch (error: unknown) {
      // Stop asking for more, but report the agents already launched: a caller told
      // only "failed" retries the whole spawn and ends up with a duplicate fleet.
      const message = errorMessage(error);
      discardUnusedWorkspace(services.logger, settings.worktree, worktree);
      services.logger.error("spawn.failed", { backend: settings.backend, name, error: message });
      notes.push(`${settings.backend} spawn failed for ${name}: ${message}`);
      break;
    }
  }
  const panes = viewers === null
    ? new Map<string, string>()
    : openViewers(viewers, { orchDir: state.directory, logger: services.logger, cwd: environment.cwd, notes }, viewerHost(settings), created);
  return spawnedResult(settings, created, { headless: true, tab: null, panes, notes });
}

/** Mint every identity, worktree and environment up front, before a tab exists. */
function prepareAgents(state: DaemonState, settings: SpawnSettings, names: readonly string[]): PreparedAgent[] {
  const prepared: PreparedAgent[] = [];
  try {
    for (const name of names) {
      const plan = planFor(settings, name);
      const adapter = resolveAdapterOrDie(plan.adapter);
      const { cwd, worktree } = prepareWorkspace(settings.cwd, settings.worktree, name, adapter, plan.cmd);
      const key = mintAgentId();
      const env = spawnEnv(state.directory, key, adapter, plan.model, settings.workers);
      prepared.push({ name, cwd, key, env, worktree, handle: undefined });
    }
  } catch (error: unknown) {
    // No tab exists yet, so a fleet that cannot get all its worktrees leaves none behind.
    for (const item of prepared) discardUnusedWorkspace(state.services.logger, settings.worktree, item.worktree);
    throw error;
  }
  return prepared;
}

/** Create the group and hand its root place to the first prepared agent. */
function createSpawnGroup(groupHome: GroupHomeRole, workspace: string | undefined, label: string, prepared: readonly PreparedAgent[]): BackendGroup {
  const root = prepared[0]!;
  try {
    const created = groupHome.create({ workspace, cwd: root.cwd, label, env: root.env });
    root.handle = created.rootHandle;
    return created.group;
  } catch (error: unknown) {
    throw new SpawnRefusalError(`group create failed: ${errorMessage(error)}`);
  }
}

/** Place every prepared agent after the first, which already holds the group's root. A place
 *  that fails to open costs that agent, never the group. Returns each failure. */
function placeRemainingAgents(state: DaemonState, backend: Backend, prepared: readonly PreparedAgent[], place: { groupId: string; workspace: string | undefined; firstSplit: TileFirstSplit }, notes: SpawnNotes): string[] {
  const failures: string[] = [];
  for (let index = 1; index < prepared.length; index++) {
    const item = prepared[index]!;
    try {
      const role = backend.groupLayout;
      if (!role) continue;
      const tile = nextTilePlacement(role, place.groupId, place.firstSplit);
      if (!backend.placement) throw new Error("environment cannot place an agent");
      item.handle = backend.placement.open({ cwd: item.cwd, workspace: place.workspace, group: place.groupId, split: tile.split, targetHandle: tile.targetHandle, env: item.env }).handle;
    } catch (error: unknown) {
      const message = errorMessage(error);
      state.services.logger.warn("spawn.place-failed", { name: item.name, error: message });
      notes.push(`warning: could not place ${item.name}: ${message}`);
      failures.push(`could not place ${item.name}: ${message}`);
      item.handle = undefined;
    }
  }
  return failures;
}

/** What launching into a seated group needs. */
interface LaunchContext {
  readonly settings: SpawnSettings;
  readonly backend: Backend;
  readonly space: string | null;
  readonly workspace: string | undefined;
  readonly groupId: string;
  readonly self: CallerSelf;
}

/** Launch an agent into every place that opened. A launch failure costs that agent; the caller
 *  rules on what an empty result means. */
function launchPrepared(state: DaemonState, prepared: readonly PreparedAgent[], context: LaunchContext, notes: SpawnNotes): { created: CreatedAgent[]; failures: string[] } {
  const { settings, backend, space, workspace, groupId, self } = context;
  const created: CreatedAgent[] = [];
  const failures: string[] = [];
  for (const item of prepared) {
    if (item.handle === undefined) continue;
    const plan = localAgentPlan(planFor(settings, item.name));
    try {
      created.push(spawnOneIntoTab(state.services, {
        backend, adapter: resolveAdapterOrDie(plan.adapter), adapterId: plan.adapter, name: item.name, cwd: item.cwd, space, workspace, group: groupId,
        form: plan.form, model: plan.model, thinking: plan.thinking, preferredModels: plan.preferredModels,
        tools: settings.tools, workers: settings.workers, cmd: settings.commandFlag ? plan.cmd : undefined,
        worktree: item.worktree,
        spawner: self.id, owner: self.id ?? undefined,
        intoHandle: item.handle, key: item.key, env: item.env,
      }));
    } catch (error: unknown) {
      const message = errorMessage(error);
      state.services.logger.forAgent(item.key).error("spawn.launch-failed", { name: item.name, error: message });
      notes.push(`warning: could not launch agent ${item.name}: ${message}`);
      failures.push(`could not launch ${item.name}: ${message}`);
    }
  }
  return { created, failures };
}

/** Where this spawn lands, and whether it fits there. orch's own grouping and the plexer's
 *  coordinate are never interchanged: capacity, names and the agent record are orch's; the
 *  group and placement requests take the coordinate. */
function placeSpawn(state: DaemonState, settings: SpawnSettings, backend: Backend, self: CallerSelf, environment: AgentEnvironment): SpawnPlacement {
  const settingsFile = state.services.settings.current();
  const placement = resolveSpawnPlacement({
    services: state.services, backend, space: settings.space ?? self.space,
    packRootId: self.view?.rootAgentId ?? null,
    callerPlexer: environment.plexer,
    callerHandle: environment.handle,
    grantNewHome: () => assertNewSpaceGranted(state.directory, self.id, settings, backend),
  });
  const { views, presence } = liveFleet(state.directory);
  // No space is NULL, never "": a sentinel string is a space name nobody created.
  assertSpawnCapacity(settingsFile, placement.space, settings.agents.length, views, presence);
  return placement;
}

/** Seat the fleet in the home it was owed: the root group takes the fleet's label and the first
 *  agent takes the root place, so the home opens with the fleet in it and no empty group beside it. */
function seatFleetInHome(backend: Backend, groupHome: GroupHomeRole, home: CreatedHome, label: string, prepared: readonly PreparedAgent[]): BackendGroup {
  groupHome.rename(home.rootGroup, label);
  prepared[0]!.handle = home.rootHandle;
  const group = findGroupInSpace(backend, home.coordinate, home.rootGroup);
  if (!group) throw new SpawnRefusalError(`${backend.id} opened home ${home.coordinate} but does not list its root group ${home.rootGroup}`);
  return group;
}

/** The group this fleet fills and the coordinate it sits at. A fleet owed a home opens one and
 *  takes its root group; any other fleet opens a group where placement put it. */
function seatFleet(state: DaemonState, seat: { backend: Backend; groupHome: GroupHomeRole; placement: SpawnPlacement; self: CallerSelf }, settings: SpawnSettings, label: string, prepared: readonly PreparedAgent[]): { group: BackendGroup; workspace: string | undefined } {
  const { backend, groupHome, placement, self } = seat;
  if (placement.homeToOpen === null) {
    return { group: createSpawnGroup(groupHome, placement.workspace, label, prepared), workspace: placement.workspace };
  }
  const home = openFleetHome({ services: state.services, backend, home: placement.homeToOpen, cwd: prepared[0]!.cwd, labelDirectory: settings.cwd, env: prepared[0]!.env, actor: self.id });
  return { group: seatFleetInHome(backend, groupHome, home, label, prepared), workspace: home.coordinate };
}

/** Open a tab under `label`, seat the fleet in it, and launch every agent that got a place. */
function spawnIntoNewTab(state: DaemonState, context: { self: CallerSelf; settings: SpawnSettings; backend: Backend; groupHome: GroupHomeRole; placement: SpawnPlacement }, label: string, names: readonly string[], notes: SpawnNotes): SpawnResult {
  const { self, settings, backend, groupHome, placement } = context;
  const logger = state.services.logger;
  assertTabCapacity(settings, label, 0, names.length);
  const prepared = prepareAgents(state, settings, names);
  const { group, workspace } = seatFleet(state, { backend, groupHome, placement, self }, settings, label, prepared);
  const placeFailures = placeRemainingAgents(state, backend, prepared, { groupId: group.id, workspace, firstSplit: settings.tiling.first_split }, notes);
  const { created, failures } = launchPrepared(state, prepared, { settings, backend, space: placement.space, workspace, groupId: group.id, self }, notes);
  const launched = new Set(created.map((agent) => agent.key));
  for (const item of prepared) if (!launched.has(item.key)) discardUnusedWorkspace(logger, settings.worktree, item.worktree);
  if (created.length === 0) {
    try { groupHome.close(group.id); } catch { /* best effort */ }
    throw new SpawnRefusalError(`all spawns failed: ${[...placeFailures, ...failures].join("; ")}`);
  }
  return spawnedResult(settings, created, { headless: false, tab: group.label ?? label, panes: new Map(), notes });
}

/** `spawn`: admit, place and launch the caller's agents. */
export async function spawnAgents(state: DaemonState, params: ParamsOf<"spawn">): Promise<SpawnResult> {
  const services = state.services;
  const settingsFile = services.settings.current();
  const self = spawner(state, params.caller);
  const environment = callerEnvironment(self);
  const notes: SpawnNotes = [];
  const requested = plexerRequest(params, settingsFile);
  const chosen = params.host === null
    ? spawnBackend(services.logger, { backend: requested.backend.id, space: params.space, backendChosen: requested.backendChosen }, environment.plexer, notes)
    : requested.backend;
  const settings = await admitSpawn(state.directory, self, settingsFile, planSpawn(params, settingsFile, chosen), services.logger, services.models);
  const partitions = new Map<string, SpawnAgentPlan[]>();
  for (const agent of settings.agents) {
    const partition = partitions.get(agent.backend.id);
    if (partition === undefined) partitions.set(agent.backend.id, [agent]);
    else partition.push(agent);
  }
  const results: Extract<SpawnResult, { outcome: "spawned" }>[] = [];
  for (const [backend, agents] of partitions) {
    const result = await spawnPartition(state, params, self, { ...settings, backend, agents }, environment, notes);
    if (result.outcome !== "spawned") return result;
    results.push(result);
  }
  const first = results[0];
  if (first === undefined) throw new SpawnRefusalError("spawn requires at least one agent");
  return { ...first, requested: settings.agents.length, agents: results.flatMap((result) => result.agents), panes: results.flatMap((result) => result.panes), harnesses: results.flatMap((result) => result.harnesses), notes, headless: results.every((result) => result.headless) };
}

async function spawnPartition(state: DaemonState, params: ParamsOf<"spawn">, self: CallerSelf, settings: SpawnSettings, environment: AgentEnvironment, notes: SpawnNotes): Promise<SpawnResult> {
  const services = state.services;
  const backend = settings.agents[0]?.backend;
  if (backend === undefined) throw new SpawnRefusalError("spawn requires at least one agent");
  // An environment that creates no group can place nothing: spawn headless.
  if (!backend.groupHome) return executeHeadlessSpawn(state, params, self, settings, environment, notes);
  const groupLayout = backend.groupLayout;
  if (!groupLayout) return noEnvironmentRole("this environment does not provide group layout");
  const placement = placeSpawn(state, settings, backend, self, environment);
  const { space } = placement;
  const { views, presence } = liveFleet(state.directory);
  const names = claimSpawnNames(views, presence, settings.agents.map((agent) => agent.name), space);
  // `--tab <existing>` fills that tab, balancing as it fills. A home not yet open holds no tab
  // to fill. With no --tab the fleet opens a tab under a rolled label.
  const existing = settings.tab !== null && placement.homeToOpen === null ? findGroupInSpace(backend, placement.workspace, settings.tab) : undefined;
  if (existing) {
    assertTabCapacity(settings, existing.label ?? existing.id, readGroupLayout(groupLayout, existing.id).placements.length, names.length);
    const created = growFleetIntoGroup(services, settings, { space, workspace: placement.workspace, group: existing.id }, backend, names, self, groupLayout, notes);
    return spawnedResult(settings, created, { headless: false, tab: existing.label ?? existing.id, panes: new Map(), notes });
  }
  const label = settings.tab ?? freeTabLabel(liveTabLabels(backend, views, presence));
  return spawnIntoNewTab(state, { self, settings, backend, groupHome: backend.groupHome, placement }, label, names, notes);
}

/** The tab's tiling as it reads now: each place, the name the plexer shows for it, and its size. */
function tabLayout(backend: Backend, role: GroupLayoutRole, group: string): Extract<ResultOf<"tile">, { outcome: "tiled" }>["layout"] {
  const names = new Map((backend.placementInventory?.list() ?? []).map((target) => [String(target.handle), target.name ?? "-"]));
  return readGroupLayout(role, group).placements.map((place) => ({
    handle: String(place.handle),
    name: names.get(String(place.handle)) ?? "-",
    size: `${place.rect.width}x${place.rect.height} @${place.rect.x},${place.rect.y}`,
  }));
}

/** `tile`: add one agent to an open tab, at the spot the planner picks against the tab's live
 *  geometry. Growing a fleet is tiling one agent at a time, so `spawn` places by the same planner. */
export function tileAgent(state: DaemonState, params: ParamsOf<"tile">): ResultOf<"tile"> {
  const services = state.services;
  const settingsFile: OrchSettings = services.settings.current();
  const backend = selectBackend(params.plexer, settingsFile);
  if (!backend.placementInventory) throw new SpawnRefusalError(`orch tile requires an environment that places agents; ${backend.id} places none.`);
  if (!backend.groupHome || !backend.groupLayout) return noEnvironmentRole("this environment does not provide groups");
  const { agent } = params;
  const adapter = resolveAdapterOrDie(agent.harness);
  const model = admitLaunchModel(settingsFile, agent.harness, services.models, agent.model);
  const self = spawner(state, params.caller);
  const { views, presence } = liveFleet(state.directory);
  const tab = resolveTabFor(state, backend, backend.groupHome, params.caller, params.tab);
  const layout = readGroupLayout(backend.groupLayout, tab.id);
  // `tab.workspace` is the plexer's coordinate; orch's space is the caller's own, and the two
  // are never interchanged.
  const space = self.space;
  assertSpawnCapacity(settingsFile, space, 1, views, presence);
  assertTabCapacity(settingsFile, tab.label ?? tab.id, layout.placements.length, 1);
  const preferredModels = settingsFile.models.preferred[agent.harness] ?? [];
  const intent = worktreeIntent(params.worktree, settingsFile);
  const launchCommand = params.cmd ?? adapterCommand(agent.harness, settingsFile, { model, thinking: agent.thinking, preferredModels });
  const { cwd, worktree } = prepareWorkspace(params.cwd, intent, agent.name, adapter, launchCommand);
  const spec: TabSpawnSpec = {
    backend, adapter, adapterId: agent.harness, name: agent.name, cwd, worktree, space,
    form: selectSpawnForm(null, settingsFile.defaults.forms, adapter, backend, heldBackend).form,
    workspace: tab.workspace ?? undefined,
    group: tab.id,
    // Same planner `spawn` uses, off the same tab-wide geometry.
    placement: planTilePlacement(layout, settingsFile.tiling.first_split),
    ...(params.cmd === null ? {} : { cmd: params.cmd }),
    // A tiled worker loads exactly what a spawned one does.
    tools: workerTools(settingsFile),
    workers: withLaunchPoints(workerPolicyFrom(settingsFile), offeredModels(services.models)),
    model,
    thinking: agent.thinking,
    preferredModels,
    spawner: self.id,
    owner: self.id ?? undefined,
  };
  let created: CreatedAgent;
  try {
    created = spawnOneIntoTab(services, spec);
  } catch (error: unknown) {
    discardUnusedWorkspace(services.logger, intent, worktree);
    throw new SpawnRefusalError(`tile failed: ${errorMessage(error)}`);
  }
  return {
    outcome: "tiled",
    tab: layout.group,
    agent: { ...created, harness: agent.harness, model, thinking: agent.thinking },
    harness: harnessTraits(adapter),
    layout: tabLayout(backend, backend.groupLayout, tab.id),
  };
}
