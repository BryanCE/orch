import { agentIdentityEnv, maySpawnFrom, spawnerIdentity, worktreeEnv } from "../../policy/spawner.ts";
import { workerPolicyFrom, workerTools } from "../../policy/workers.ts";
import { workerPrompt, workerRules } from "../../worker-prompt.ts";
import { agentFlags, resolveAdapterOrDie } from "../selection.ts";
import { parseCommand } from "../registry.ts";
import { mintAgentId } from "../../backends/identity.ts";
import { resolveBackend } from "../../backends/registry.ts";
import { nextTilePlacement, planTilePlacement, readGroupLayout } from "../../backends/tiling.ts";
import { createAgentWorktree } from "../../worktree.ts";
import { errorMessage } from "../../util.ts";
import { callDaemon } from "../daemon.ts";
import { rpcRegisterSession } from "../../daemon/client/reach.ts";
import { die } from "../target.ts";
import { callerSpace, selfId } from "../../identity/self.ts";
import { LAUNCH_ENV, launchCredential } from "../../identity/launch.ts";
import { resolveTab } from "../panes.ts";
import type { Backend, BackendGroup, CreatedHome, GroupHomeRole, GroupLayoutRole, TileFirstSplit } from "../../types/backend.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import { agentById } from "../../store/agent-rows.ts";
import { environmentOf } from "../../store/agent-view.ts";
import type { CreatedAgent, PreparedAgent, SpawnPlacement, Spawner } from "../../types/command.ts";
import type { DaemonClient, Services } from "../../types/services.ts";
import type { OrchDir } from "../../types/core.ts";
import type { OrchSettings } from "../../types/settings.ts";
import { resolveSpawnAgentSettings, resolveSpawnSettings, parseSpawnFlags } from "./flags.ts";
import type { SpawnSettings } from "./flags.ts";
import { assertSpawnCapacity, assertSpawnPolicy, assertNewSpaceGranted, assertTabCapacity, admitSpawn } from "./admission.ts";
import { admitLaunchModel, pinModels } from "./models.ts";
import { claimSpawnNames, resolveSpawnNames } from "./names.ts";
import { findGroupInSpace, growFleetIntoGroup, openFleetHome, resolveSpawnPlacement, spawnBackend, spawnOneIntoTab } from "./placement.ts";
import { awaitBridgeAttach, printLayout, reportShortfall, reportSpawnResults, spawnLogger } from "./report.ts";


// Headless agents are launched BY THE DAEMON, not here: orchd outlives this CLI
// and already owns delivery. Each runs the prompt it was launched with and exits.
async function executeHeadlessSpawn(services: Pick<Services, "orchDir" | "logger" | "settings">, settingsFile: OrchSettings, settings: SpawnSettings, backend: Backend, spawnerAgentId: string | null): Promise<void> {
  if (settings.commandFlag) die("--cmd requires a backend that places agents; headless launches use the selected adapter.");
  // A headless agent has no TTY to idle on: it runs its prompt and exits, so work
  // dispatched after launch would arrive at a dead process.
  if (settings.agents.some((agent) => !agent.prompt?.trim())) die(`a ${settings.backend} spawn needs its work up front: pass --prompt "<text>" or --file <path> (a headless agent runs it and exits)`);
  // Headless agents mint their identity under the backend's own grouping (headless → "local"),
  // never the caller's herdr identity; the cap check must match that same bucket, not callerSpace().
  const space = settings.space ?? "local";
  assertSpawnPolicy(services.orchDir, settings, space, settings.agents.length);
  assertSpawnCapacity(services.orchDir, settings, space, settings.agents.length);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const maySpawn = maySpawnFrom(services.orchDir, selfId(services.orchDir), settingsFile.fleet.max_depth);
  const created: CreatedAgent[] = [];
  const names = claimSpawnNames(services.orchDir, settings.agents.map((agent) => agent.name), space);
  for (const [index, name] of names.entries()) {
    const plan = settings.agents[index];
    if (plan === undefined) die(`missing spawn plan for ${name}`);
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.workspaceTrust?.preTrustWorkspace(cwd, settings.cmd);
    try {
      // ONE key per agent: mint the name-based identity BEFORE launch and pass
      // it as the launch credential, exactly like the placed path (spawnOneIntoTab).
      // The backend records the OS pid separately for close ownership; the key
      // never encodes it, and the backend never re-mints a second identity.
      const key = mintAgentId();
      const spawner = spawnerIdentity(services.orchDir);
      // orchd launches a real harness process inside this call, so it gets the adapter-command
      // budget, not the 5s default meant for a question orchd answers from memory.
      await callDaemon(services, "spawn-headless", {
        key,
        adapter: settings.adapter,
        cwd,
        // The daemon launches the process, but the IDENTITY of the spawner is
        // this CLI's: orchd's own env knows nothing about the calling session.
        env: {
          ...agentIdentityEnv(name, spawner),
          ...worktreeEnv(settings.worktree ? cwd : undefined, settings.worktree ? `orch/${name}` : undefined),
          ...(spawnerAgentId ? { ORCH_SPAWNER_AGENT_ID: spawnerAgentId } : {}),
        },
        model: plan.model,
        thinking: plan.thinking,
        // A JSON array over the wire, never a joined string: the harness's own quicklist
        // syntax is the adapter's to write, at the far end of the launch.
        preferredModels: [...settings.preferredModels],
        prompt: workerPrompt(plan.prompt ?? "", false, adapter, { maySpawn, spawnerRepliable: spawner.key !== null, ...workerRules(settingsFile) }),
        tools: settings.tools,
        workers: settings.workers,
      }, {}, settingsFile.timeouts.adapter_command_ms);
      // A headless agent is placed nowhere, so its key is the handle every display uses.
      created.push({ key, handle: key, name });
      if (!settings.json) process.stdout.write(`${key}  ${name}  [${settings.backend}]\n`);
    } catch (error: unknown) {
      // Stop asking for more, but report the agents already launched: a caller told
      // only "failed" retries the whole spawn and ends up with a duplicate fleet.
      const message = errorMessage(error);
      services.logger.error("spawn.failed", { backend: settings.backend, name, error: message });
      process.stdout.write(`${settings.backend} spawn failed for ${name}: ${message}\n`);
      break;
    }
  }
  // Same gate the placed path uses: an adapter with a bridge is only reachable once
  // its bridge has come up (P2-3 makes "up" mean attached), so returning before that
  // hands the caller a key it cannot dispatch to yet.
  reportShortfall(services.logger, settings.agents.length, created.length);
  const registered = adapter.bridge ? await awaitBridgeAttach(services.orchDir, services.logger, created, settingsFile.timeouts, settings.json) : [];
  const stalled = created.filter((agent) => !registered.some((candidate) => candidate.key === agent.key));
  if (stalled.length > 0) process.exitCode = 1;
  if (settings.json) process.stdout.write(JSON.stringify({
    backend: settings.backend,
    agents: created,
    requested: settings.agents.length,
    created: created.length,
    registered: registered.length,
  }) + "\n");
  else {
    process.stdout.write(`\nSpawned ${created.length} headless agent(s); nothing shows them.\n`);
    process.stdout.write("'orch status' shows the fleet.\n");
  }
}

/** Spawn every requested agent into an already-open tab, balancing as it fills. */
async function spawnIntoExistingTab(services: Pick<Services, "orchDir" | "logger" | "settings">, settingsFile: OrchSettings, settings: SpawnSettings, group: BackendGroup, space: string | null, workspace: string | undefined, backend: Backend, names: readonly string[], spawnerAgentId: string | null, role: GroupLayoutRole): Promise<void> {
  const created = await growFleetIntoGroup(services, settings, space, workspace, group.id, backend, names, spawnerAgentId, role);
  await reportSpawnResults(services, services.logger, settingsFile, settings, group.id, group.label ?? group.id, created, backend);
}

/** Announce a fleet whose control plane is down, and fail the launch. Agents without
 *  orchd are UNMANAGED: no steer, model pin, or result reaches them, and printing
 *  the tiling and "Spawned N agent(s)" over that silence is what sent an operator
 *  dispatching into a fleet that answered nothing. Null when orchd answers. */
/** An environment with no group layout cannot tile. That is an ANSWER with exit
 *  0, never a throw and never a silent empty result. */
function answerNoGroupLayout(json: boolean): void {
  const answer = { outcome: "answer", reason: "no-environment-role", text: "this environment does not provide group layout" };
  if (json) process.stdout.write(JSON.stringify(answer) + "\n");
  else process.stdout.write(`${answer.text}\n`);
}

/** Mint every identity, worktree and environment up front, before a tab exists. */
function prepareAgents(orchDir: OrchDir, settings: SpawnSettings, adapter: AgentAdapter, names: readonly string[]): PreparedAgent[] {
  return names.map((name) => {
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.workspaceTrust?.preTrustWorkspace(cwd, settings.cmd);
    const key = mintAgentId();
    const branch = settings.worktree ? `orch/${name}` : undefined;
    const env = {
      ...agentIdentityEnv(name, spawnerIdentity(orchDir)),
      ...worktreeEnv(settings.worktree ? cwd : undefined, branch),
      [LAUNCH_ENV]: key, ORCH_DIR: orchDir,
    };
    return { name, cwd, key, env, branch, handle: undefined };
  });
}

/** Create the group and hand its root place to the first prepared agent. */
function createSpawnGroup(
  groupHome: GroupHomeRole,
  workspace: string | undefined,
  label: string,
  prepared: readonly PreparedAgent[],
): BackendGroup {
  const root = prepared[0]!;
  try {
    const created = groupHome.create({ workspace, cwd: root.cwd, label, env: root.env });
    root.handle = created.rootHandle;
    return created.group;
  } catch (error: unknown) {
    die(`group create failed: ${errorMessage(error)}`);
  }
}

/** Place every prepared agent after the first, which already holds the group's
 *  root. A place that fails to open costs that agent, never the group. */
function placeRemainingAgents(
  logger: Services["logger"],
  backend: Backend,
  prepared: readonly PreparedAgent[],
  groupId: string,
  workspace: string | undefined,
  firstSplit: TileFirstSplit,
): void {
  for (let index = 1; index < prepared.length; index++) {
    const item = prepared[index]!;
    try {
      const role = backend.groupLayout;
      if (!role) continue;
      const tile = nextTilePlacement(role, groupId, firstSplit);
      if (!backend.placement) throw new Error("environment cannot place an agent");
      item.handle = backend.placement.open({ cwd: item.cwd, workspace, group: groupId, split: tile.split, targetHandle: tile.targetHandle, env: item.env }).handle;
    } catch (error: unknown) {
      const message = errorMessage(error);
      logger.warn("spawn.place-failed", { name: item.name, error: message });
      process.stdout.write(`warning: could not place ${item.name}: ${message}\n`);
      item.handle = undefined;
    }
  }
}

/** Launch an agent into every place that opened. A launch failure costs that
 *  agent; the caller rules on what an empty result means. */
async function launchPrepared(
  services: DaemonClient,
  prepared: readonly PreparedAgent[],
  context: { settings: SpawnSettings; settingsFile: OrchSettings; backend: Backend; adapter: AgentAdapter; space: string | null; workspace: string | undefined; groupId: string; spawnerAgentId: string | null },
): Promise<CreatedAgent[]> {
  const { settings, settingsFile, backend, adapter, space, workspace, groupId, spawnerAgentId } = context;
  const created: CreatedAgent[] = [];
  for (const [index, item] of prepared.entries()) {
    if (item.handle === undefined) continue;
    const plan = settings.agents[index];
    if (plan === undefined) throw new Error(`missing spawn plan for ${item.name}`);
    try {
      created.push(await spawnOneIntoTab(services, {
        backend, adapter, adapterId: settings.adapter, name: item.name, cwd: item.cwd, space, workspace, group: groupId,
        model: plan.model, thinking: plan.thinking, preferredModels: settings.preferredModels,
        reportTimeoutMs: settingsFile.daemon.report_timeout_ms,
        tools: settings.tools, workers: settings.workers, cmd: settings.commandFlag ? settings.cmd : undefined,
        worktree: settings.worktree ? item.cwd : undefined, branch: item.branch,
        spawnerAgentId, intoHandle: item.handle, key: item.key, env: item.env,
      }));
    } catch (error: unknown) {
      const message = errorMessage(error);
      spawnLogger(services.logger, item.key).error("spawn.launch-failed", { name: item.name, error: message });
      process.stdout.write(`warning: could not launch agent ${item.name}: ${message}\n`);
    }
  }
  return created;
}

/** Where this spawn lands, and whether it fits there.
 *
 *  orch's own grouping and the plexer's coordinate are used for different
 *  things and are never interchanged: capacity, names and the agent record are
 *  orch's; the group and placement requests take the coordinate. */
async function placeSpawn(
  services: DaemonClient,
  settings: SpawnSettings,
  backend: Backend,
  spawner: Spawner,
): Promise<SpawnPlacement> {
  const orchDir = services.orchDir;
  const placement = await resolveSpawnPlacement({
    services, backend, space: settings.space ?? spawner.environment.space,
    packRootId: agentById(orchDir, spawner.id)?.rootAgentId ?? null,
    callerPlexer: spawner.environment.plexer,
    callerHandle: spawner.environment.handle,
    grantNewHome: () => assertNewSpaceGranted(services, settings, backend),
  });
  // A7/Rule 11: no space is NULL, never "" — a sentinel string is a space name
  // nobody created, and registration rightly refuses it.
  assertSpawnCapacity(orchDir, settings, placement.space, settings.agents.length);
  return placement;
}

/** Seat the fleet in the home it was owed: the root group takes the fleet's
 *  label and the first agent takes the root place, so the home opens with the
 *  fleet in it and no empty group beside it. */
function seatFleetInHome(backend: Backend, groupHome: GroupHomeRole, home: CreatedHome, label: string, prepared: readonly PreparedAgent[]): BackendGroup {
  groupHome.rename(home.rootGroup, label);
  prepared[0]!.handle = home.rootHandle;
  const group = findGroupInSpace(backend, home.coordinate, home.rootGroup);
  if (!group) die(`${backend.id} opened home ${home.coordinate} but does not list its root group ${home.rootGroup}`);
  return group;
}

/** The group this fleet fills and the coordinate it sits at. A fleet owed a
 *  home opens one and takes its root group; any other fleet opens a group where
 *  placement put it. */
async function seatFleet(services: DaemonClient, backend: Backend, groupHome: GroupHomeRole, placement: SpawnPlacement, settings: SpawnSettings, prepared: readonly PreparedAgent[]): Promise<{ group: BackendGroup; workspace: string | undefined }> {
  if (placement.homeToOpen === null) {
    return { group: createSpawnGroup(groupHome, placement.workspace, settings.label, prepared), workspace: placement.workspace };
  }
  const home = await openFleetHome({ services, backend, subject: placement.homeToOpen, cwd: settings.cwd, env: prepared[0]!.env });
  return { group: seatFleetInHome(backend, groupHome, home, settings.label, prepared), workspace: home.coordinate };
}

async function executeSpawn(services: Pick<Services, "orchDir" | "logger" | "settings" | "models">, settingsFile: OrchSettings, requested: SpawnSettings): Promise<void> {
  const settings = await admitSpawn(services.orchDir, settingsFile, requested, services.logger, services.models);
  // A spawned agent already carries its id; only a driving session registers.
  const spawnerAgentId = launchCredential() ?? (await rpcRegisterSession(services.orchDir, services.logger)).id;
  const spawner: Spawner = { id: spawnerAgentId, environment: environmentOf(services.orchDir, spawnerAgentId) };
  const backend = spawnBackend(services.logger, settings, spawner.environment.plexer);
  // An environment that creates no group can place nothing: spawn headless.
  if (!backend.groupHome) return executeHeadlessSpawn(services, settingsFile, settings, backend, spawnerAgentId);
  const groupLayout = backend.groupLayout;
  if (!groupLayout) return answerNoGroupLayout(settings.json);
  const placement = await placeSpawn(services, settings, backend, spawner);
  const { space } = placement;
  const adapter = resolveAdapterOrDie(settings.adapter);
  const names = claimSpawnNames(services.orchDir, settings.agents.map((agent) => agent.name), space);
  // `--tab <existing>` fills that tab instead of opening a new one, auto-balancing
  // as it fills, so no follow-up move/tile is needed. There is no implicit
  // "grow the fleet under this prefix" path: names are per-slice and unnumbered
  // so the tab is named explicitly or it is a new one. A home not yet open holds
  // no tab to fill.
  const existing = settings.tabExplicit && placement.homeToOpen === null ? findGroupInSpace(backend, placement.workspace, settings.label) : undefined;
  if (existing) {
    assertTabCapacity(settings, existing.label ?? existing.id, readGroupLayout(groupLayout, existing.id).placements.length, names.length);
    return spawnIntoExistingTab(services, settingsFile, settings, existing, space, placement.workspace, backend, names, spawnerAgentId, groupLayout);
  }
  assertTabCapacity(settings, settings.label, 0, names.length);
  const groupHome = backend.groupHome;
  const prepared = prepareAgents(services.orchDir, settings, adapter, names);
  const { group, workspace } = await seatFleet(services, backend, groupHome, placement, settings, prepared);
  placeRemainingAgents(services.logger, backend, prepared, group.id, workspace, settings.tiling.first_split);
  const created = await launchPrepared(services, prepared, { settings, settingsFile, backend, adapter, space, workspace, groupId: group.id, spawnerAgentId });
  if (created.length === 0) {
    try { groupHome.close(group.id); } catch { /* best effort */ }
    die("all spawns failed");
  }
  await reportSpawnResults(services, services.logger, settingsFile, settings, group.id, group.label ?? settings.label, created, backend);
}

export async function cmdSpawn(services: Services, args: string[]) {
  const settingsFile = services.settings.current();
  await executeSpawn(services, settingsFile, resolveSpawnSettings(parseSpawnFlags(args), settingsFile));
}

export async function cmdTile(services: Services, args: string[]) {
  const { flags, positional } = parseCommand("tile", args);
  const json = flags.has("--json");
  const launch = agentFlags(flags);
  const settingsFile = services.settings.current();
  const { adapter, model: named, thinking, preferredModels } = resolveSpawnAgentSettings(launch, settingsFile);
  const selectedBackend = resolveBackend({ explicit: launch.backendFlag ?? null, configured: settingsFile.defaults.backend ?? null });
  if (!selectedBackend.placementInventory) die(`orch tile requires an environment that places agents; ${selectedBackend.id} places none.`);
  if (!selectedBackend.groupHome || !selectedBackend.groupLayout) {
    const answer = { outcome: "answer", reason: "no-environment-role", text: "this environment does not provide groups" };
    if (json) process.stdout.write(JSON.stringify(answer) + "\n");
    else process.stdout.write(`${answer.text}\n`);
    return;
  }
  const selectedAdapter = resolveAdapterOrDie(adapter);
  const model = admitLaunchModel(settingsFile, adapter, services.models, named);
  const target = positional[0];
  const requestedName = positional[1];
  // Tile CREATES an agent, so it names one too. An agent
  // called `tile-3` says nothing about the slice it holds.
  if (!target || !requestedName) die("usage: orch tile <target> <name> [--cmd <command>] [--dir <path>] [--model <model[:thinking]>]");

  const tab = resolveTab(services, target);
  const role = selectedBackend.groupLayout;
  if (!role) return;
  const layout = readGroupLayout(role, tab.id);
  if (!layout) die(`Could not read layout for group "${tab.id}".`);
  const autoName = resolveSpawnNames([requestedName])[0]!;

  // E10: `tab.workspace` is the plexer's coordinate; orch's space is the caller's
  // own (A7: optional), and the two are never interchanged.
  const space = callerSpace(services.orchDir);
  const workspace = tab.workspace ?? undefined;
  assertSpawnCapacity(services.orchDir, settingsFile, space, 1);
  assertTabCapacity(settingsFile, tab.label ?? tab.id, layout.placements.length, 1);
  // A spawned agent already carries its id; only a driving session registers.
  const spawnerAgentId = launchCredential() ?? (await rpcRegisterSession(services.orchDir, services.logger)).id;
  let agent: CreatedAgent;
  try {
    agent = await spawnOneIntoTab(services, {
      backend: selectedBackend,
      adapter: selectedAdapter,
      adapterId: adapter,
      name: autoName,
      cwd: flags.value("--dir") ?? process.cwd(),
      space,
      workspace,
      group: tab.id,
      // Same planner `spawn` uses, off the same tab-wide geometry.
      placement: planTilePlacement(layout, settingsFile.tiling.first_split),
      cmd: flags.value("--cmd"),
      // A tiled worker loads exactly what a spawned one does; dropping these is
      // how tiled agents lost the user's own harness extensions.
      tools: workerTools(settingsFile),
      workers: workerPolicyFrom(settingsFile),
      model,
      thinking,
      preferredModels,
      reportTimeoutMs: settingsFile.daemon.report_timeout_ms,
      spawnerAgentId,
    });
  } catch (e: unknown) {
    die(`tile failed: ${errorMessage(e)}`);
  }
  if (json) process.stdout.write(JSON.stringify({ handle: agent.handle, key: agent.key, name: autoName, tab: layout.group, added: true }) + "\n");
  else {
    process.stdout.write(`Added ${agent.handle} (${autoName}) to group ${layout.group} running ${adapter}.\n`);
    printLayout(selectedBackend, tab.id, "\nFinal tiling:");
  }
  await pinModels(services, services.logger, [{ key: agent.key, handle: agent.handle, name: autoName, model, thinking }]);
}

