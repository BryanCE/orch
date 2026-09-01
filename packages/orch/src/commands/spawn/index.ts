import { orchDir } from "../../presence/store.ts";
import { loadSettings } from "../../settings/read.ts";
import { agentIdentityEnv, spawnerIdentity, worktreeEnv } from "../../policy/spawner.ts";
import { workerPolicyFrom, workerTools } from "../../policy/workers.ts";
import { workerPrompt } from "../../worker-prompt.ts";
import { maySpawnFrom } from "../../policy/spawner.ts";
import { resolveAdapterOrDie } from "../selection.ts";
import { mintAgentId, serializeIdentity } from "../../backends/identity.ts";
import { resolveBackend } from "../../backends/registry.ts";
import { nextTilePlacement, planTilePlacement, readGroupLayout } from "../../backends/tiling.ts";
import { createAgentWorktree } from "../../worktree.ts";
import { errorMessage } from "../../util.ts";
import { callDaemon } from "../daemon.ts";
import { rpcRegisterSession } from "../../daemon/reach.ts";
import { die } from "../target.ts";
import { callerSpace, selfId } from "../../identity/self.ts";
import { LAUNCH_ENV, launchCredential } from "../../identity/launch.ts";
import { resolveTab } from "../panes.ts";
import { commandLogger } from "../logging.ts";
import type { Backend, BackendGroup, GroupHomeRole, GroupLayoutRole, TileFirstSplit } from "../../types/backend.ts";
import type { AgentAdapter } from "../../types/adapter.ts";
import { agentById } from "../../store/agent-rows.ts";
import type { CreatedAgent, PreparedAgent } from "../../types/command.ts";
import { resolveSpawnSettings, parseSpawnFlags } from "./flags.ts";
import type { SpawnSettings } from "./flags.ts";
import { assertSpawnCapacity, assertSpawnPolicy, assertNewSpaceGranted, admitSpawn } from "./admission.ts";
import { assertLaunchModelAllowed, pinModels, resolveAgentSettings } from "./models.ts";
import { claimSpawnNames, resolveSpawnNames } from "./names.ts";
import { findGroupInSpace, growFleetIntoGroup, resolveSpawnPlacement, spawnBackend, spawnOneIntoTab } from "./placement.ts";
import { awaitBridgeRegistration, printLayout, reportShortfall, reportSpawnResults, spawnLogger } from "./report.ts";


// Detached agents are launched BY THE DAEMON, not here: orchd outlives this CLI
// and already owns delivery. Each runs the prompt it was launched with and exits —
// there is no pane for it to idle in.
async function executeDetachedSpawn(settings: SpawnSettings, backend: Backend, spawnerAgentId: string | null): Promise<void> {
  if (settings.commandFlag) die("--cmd requires a pane backend; detached launches use the selected adapter.");
  // A detached agent has no TTY to idle on: it runs its prompt and exits, so work
  // dispatched after launch would arrive at a dead process.
  if (settings.prompts.length === 0 || settings.prompts.some((prompt) => !prompt.trim())) die(`a ${settings.backend} spawn needs its work up front: pass --prompt "<text>" (a detached agent runs it and exits)`);
  // Detached agents mint their identity under the backend's own grouping (headless → "local"),
  // never the caller's herdr identity; the cap check must match that same bucket, not callerSpace().
  const space = settings.space ?? "local";
  assertSpawnPolicy(settings, space, settings.n);
  assertSpawnCapacity(settings, space, settings.n);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const settingsFile = loadSettings(orchDir());
  const maySpawn = maySpawnFrom(orchDir(), selfId(), settingsFile.fleet.max_depth);
  const created: CreatedAgent[] = [];
  const names = claimSpawnNames(settings.names, space);
  for (const [index, name] of names.entries()) {
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.workspaceTrust?.preTrustWorkspace(cwd, settings.cmd);
    try {
      // ONE key per agent: mint the name-based identity BEFORE launch and pass
      // it as the launch credential, exactly like the pane paths (spawnOneIntoTab).
      // The backend records the OS pid separately for close ownership; the key
      // never encodes it, and the backend never re-mints a second identity.
      const key = serializeIdentity({ id: mintAgentId() });
      const spawner = spawnerIdentity();
      // orchd launches a real harness process inside this call, so it gets the adapter-command
      // budget, not the 5s default meant for a question orchd answers from memory.
      await callDaemon("spawn-detached", {
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
        model: settings.model,
        thinking: settings.thinking,
        // A JSON array over the wire, never a joined string: the harness's own quicklist
        // syntax is the adapter's to write, at the far end of the launch.
        preferredModels: [...settings.preferredModels],
        prompt: workerPrompt(settings.prompts.length === 1 ? settings.prompts[0]! : settings.prompts[index]!, false, adapter, { maySpawn, lockedCommands: settingsFile.locked_commands, spawnerRepliable: spawner.key !== null }),
        tools: settings.tools,
        workers: settings.workers,
      }, {}, settingsFile.timeouts.adapter_command_ms);
      // A detached agent has no pane, so its key is the handle every display uses.
      created.push({ key, pane: key, name });
      if (!settings.json) process.stdout.write(`${key}  ${name}  [${settings.backend}]\n`);
    } catch (error: unknown) {
      // Stop asking for more, but report the agents already launched: a caller told
      // only "failed" retries the whole spawn and ends up with a duplicate fleet.
      const message = errorMessage(error);
      commandLogger().error("spawn.failed", { backend: settings.backend, name, error: message });
      process.stdout.write(`${settings.backend} spawn failed for ${name}: ${message}\n`);
      break;
    }
  }
  // Same gate the pane path uses: an inbox adapter is only reachable once it has
  // written its presence dir, so returning before that hands the caller a key it
  // cannot dispatch to yet.
  reportShortfall(settings.n, created.length);
  const registered = adapter.inboxSteering ? await awaitBridgeRegistration(created, settings.json) : [];
  const stalled = created.filter((agent) => !registered.some((candidate) => candidate.key === agent.key));
  if (stalled.length > 0) process.exitCode = 1;
  if (settings.json) process.stdout.write(JSON.stringify({
    backend: settings.backend,
    agents: created,
    requested: settings.n,
    created: created.length,
    registered: registered.length,
  }) + "\n");
  else {
    process.stdout.write(`\nSpawned ${created.length} detached agent(s) (no panes).\n`);
    process.stdout.write("'orch status' shows the fleet.\n");
  }
}

/** Spawn every requested agent into an already-open tab, balancing as it fills. */
async function spawnIntoExistingTab(settings: SpawnSettings, group: BackendGroup, space: string | null, workspace: string | undefined, backend: Backend, names: readonly string[], spawnerAgentId: string | null, role: GroupLayoutRole): Promise<void> {
  const created = growFleetIntoGroup(settings, space, workspace, group.id, backend, names, spawnerAgentId, role);
  await reportSpawnResults(settings, group.id, group.label ?? group.id, created, backend);
}

/** Announce a fleet whose control plane is down, and fail the launch. Panes without
 *  orchd are UNMANAGED: no steer, model pin, or result reaches them, and printing
 *  the tiling and "Spawned N agent(s)" over that silence is what sent an operator
 *  dispatching into a fleet that answered nothing. Null when orchd answers. */
/** An environment with no group layout cannot tile. That is an ANSWER with exit
 *  0, never a throw and never a silent empty result. */
function answerNoGroupLayout(json: boolean): void {
  const answer = { outcome: "answer", reason: "no-environment-role", text: "this pane environment does not provide group layout" };
  if (json) process.stdout.write(JSON.stringify(answer) + "\n");
  else process.stdout.write(`${answer.text}\n`);
}

/** Mint every identity, worktree and environment up front, before a tab exists. */
function prepareAgents(settings: SpawnSettings, adapter: AgentAdapter, names: readonly string[]): PreparedAgent[] {
  return names.map((name) => {
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.workspaceTrust?.preTrustWorkspace(cwd, settings.cmd);
    const key = serializeIdentity({ id: mintAgentId() });
    const branch = settings.worktree ? `orch/${name}` : undefined;
    const env = {
      ...agentIdentityEnv(name, spawnerIdentity()),
      ...worktreeEnv(settings.worktree ? cwd : undefined, branch),
      [LAUNCH_ENV]: key, ORCH_DIR: orchDir(),
    };
    return { name, cwd, key, env, branch, pane: undefined };
  });
}

/** Create the tab and hand its root pane to the first prepared agent. */
function createSpawnGroup(
  groupHome: GroupHomeRole,
  workspace: string | undefined,
  label: string,
  prepared: readonly PreparedAgent[],
): BackendGroup {
  const root = prepared[0]!;
  try {
    const created = groupHome.create({ workspace, cwd: root.cwd, label, env: root.env });
    root.pane = created.rootHandle;
    return created.group;
  } catch (error: unknown) {
    die(`group create failed: ${errorMessage(error)}`);
  }
}

/** Open a pane for every prepared agent after the first, which already holds the
 *  group's root. A pane that fails to open costs that agent, never the tab. */
function openPanesForGroup(
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
      if (!backend.paneHost) throw new Error("backend has no pane host");
      item.pane = backend.paneHost.open({ cwd: item.cwd, workspace, group: groupId, split: tile.split, targetPane: tile.targetPane, env: item.env }).handle;
    } catch (error: unknown) {
      const message = errorMessage(error);
      spawnLogger(item.key).warn("spawn.pane-open-failed", { name: item.name, error: message });
      process.stdout.write(`warning: could not open a pane for ${item.name}: ${message}\n`);
      item.pane = undefined;
    }
  }
}

/** Launch an agent into every pane that opened. A launch failure costs that
 *  agent; the caller rules on what an empty result means. */
function launchPrepared(
  prepared: readonly PreparedAgent[],
  context: { settings: SpawnSettings; backend: Backend; adapter: AgentAdapter; space: string | null; workspace: string | undefined; groupId: string; spawnerAgentId: string | null },
): CreatedAgent[] {
  const { settings, backend, adapter, space, workspace, groupId, spawnerAgentId } = context;
  const created: CreatedAgent[] = [];
  for (const item of prepared) {
    if (item.pane === undefined) continue;
    try {
      created.push(spawnOneIntoTab({
        backend, adapter, adapterId: settings.adapter, name: item.name, cwd: item.cwd, space, workspace, group: groupId,
        model: settings.model, thinking: settings.thinking, preferredModels: settings.preferredModels,
        tools: settings.tools, workers: settings.workers, cmd: settings.commandFlag ? settings.cmd : undefined,
        worktree: settings.worktree ? item.cwd : undefined, branch: item.branch,
        spawnerAgentId, intoPane: item.pane, key: item.key, env: item.env,
      }));
    } catch (error: unknown) {
      const message = errorMessage(error);
      spawnLogger(item.key).error("spawn.launch-failed", { name: item.name, error: message });
      process.stdout.write(`warning: could not launch agent ${item.name}: ${message}\n`);
    }
  }
  return created;
}

/** Where this spawn lands, and whether it fits there.
 *
 *  orch's own grouping and the plexer's coordinate are used for different
 *  things and are never interchanged: capacity, names and the agent record are
 *  orch's; the group and pane requests take the coordinate. */
function placeSpawn(
  settings: SpawnSettings,
  backend: Backend,
  spawnerAgentId: string | null,
): { space: string | null; workspace: string | undefined } {
  const placement = resolveSpawnPlacement({
    directory: orchDir(), backend, space: settings.space ?? callerSpace(),
    packRootId: spawnerAgentId === null ? null : agentById(orchDir(), spawnerAgentId)?.rootAgentId ?? null,
    cwd: settings.cwd, label: settings.label,
    grantNewHome: () => { assertNewSpaceGranted(settings, backend, spawnerAgentId); },
  });
  // A7/Rule 11: no space is NULL, never "" — a sentinel string is a space name
  // nobody created, and registration rightly refuses it.
  const space = placement.space;
  assertSpawnCapacity(settings, space, settings.n);
  return { space, workspace: placement.workspace };
}

async function executeSpawn(settings: SpawnSettings): Promise<void> {
  await admitSpawn(settings);
  // A spawned agent already carries its id; only a driving session registers.
  const spawnerAgentId = launchCredential() ?? (await rpcRegisterSession(orchDir())).id;
  const backend = spawnBackend(settings);
  // A backend without group creation has no panes to tile into: spawn detached.
  if (!backend.groupHome) return executeDetachedSpawn(settings, backend, spawnerAgentId);
  const groupLayout = backend.groupLayout;
  if (!groupLayout) return answerNoGroupLayout(settings.json);
  const { space, workspace } = placeSpawn(settings, backend, spawnerAgentId);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const names = claimSpawnNames(settings.names, space);
  // `--tab <existing>` fills that tab instead of opening a new one, auto-balancing
  // as it fills, so no follow-up move/tile is needed. There is no implicit
  // "grow the fleet under this prefix" path: names are per-slice and unnumbered
  // so the tab is named explicitly or it is a new one.
  const existing = settings.tabExplicit ? findGroupInSpace(backend, workspace, settings.label) : undefined;
  if (existing) return spawnIntoExistingTab(settings, existing, space, workspace, backend, names, spawnerAgentId, groupLayout);
  const groupHome = backend.groupHome;
  const prepared = prepareAgents(settings, adapter, names);
  const group = createSpawnGroup(groupHome, workspace, settings.label, prepared);
  openPanesForGroup(backend, prepared, group.id, workspace, settings.tiling.first_split);
  const created = launchPrepared(prepared, { settings, backend, adapter, space, workspace, groupId: group.id, spawnerAgentId });
  if (created.length === 0) {
    try { groupHome.close(group.id); } catch { /* best effort */ }
    die("all spawns failed");
  }
  await reportSpawnResults(settings, group.id, group.label ?? settings.label, created, backend);
}

export async function cmdSpawn(args: string[]) {
  await executeSpawn(resolveSpawnSettings(parseSpawnFlags(args)));
}

export async function cmdTile(args: string[]) {
  const flags = parseSpawnFlags(args);
  const settingsFile = loadSettings(orchDir());
  const { adapter, model, preferredModels } = resolveAgentSettings(flags, settingsFile);
  const selectedBackend = resolveBackend({ explicit: flags.backendFlag ?? null, configured: settingsFile.defaults.backend ?? null });
  if (!selectedBackend.paneInventory) die(`orch tile requires a pane-capable environment; ${selectedBackend.id} has no pane inventory.`);
  if (!selectedBackend.groupHome || !selectedBackend.groupLayout) {
    const answer = { outcome: "answer", reason: "no-environment-role", text: "this environment does not provide groups" };
    if (flags.json) process.stdout.write(JSON.stringify(answer) + "\n");
    else process.stdout.write(`${answer.text}\n`);
    return;
  }
  const selectedAdapter = resolveAdapterOrDie(adapter);
  assertLaunchModelAllowed(adapter, model);
  const target = flags.positional[0];
  const requestedName = flags.positional[1];
  // Tile CREATES an agent, so it names one too. A pane
  // called `tile-3` says nothing about the slice it holds.
  if (!target || !requestedName) die("usage: orch tile <tab-or-pane> <name> [--cmd <command>] [--cwd <path>] [--model <model[:thinking]>]");

  const tab = resolveTab(target);
  const role = selectedBackend.groupLayout;
  if (!role) return;
  const layout = readGroupLayout(role, tab.id);
  if (!layout) die(`Could not read layout for group "${tab.id}".`);
  const autoName = resolveSpawnNames([requestedName])[0]!;

  // E10: `tab.workspace` is the plexer's coordinate; orch's space is the caller's
  // own (A7: optional), and the two are never interchanged.
  const space = callerSpace();
  const workspace = tab.workspace ?? undefined;
  assertSpawnCapacity(settingsFile, space, 1);
  // A spawned agent already carries its id; only a driving session registers.
  const spawnerAgentId = launchCredential() ?? (await rpcRegisterSession(orchDir())).id;
  let agent: CreatedAgent;
  try {
    agent = spawnOneIntoTab({
      backend: selectedBackend,
      adapter: selectedAdapter,
      adapterId: adapter,
      name: autoName,
      cwd: flags.cwd,
      space,
      workspace,
      group: tab.id,
      // Same planner `spawn` uses, off the same tab-wide geometry.
      placement: planTilePlacement(layout, settingsFile.tiling.first_split),
      cmd: flags.commandFlag ? flags.cmd : undefined,
      // A tiled worker loads exactly what a spawned one does; dropping these is
      // how tiled agents lost the user's own harness extensions.
      tools: workerTools(settingsFile),
      workers: workerPolicyFrom(settingsFile),
      model,
      preferredModels,
      spawnerAgentId,
    });
  } catch (e: unknown) {
    die(`tile failed: ${errorMessage(e)}`);
  }
  if (flags.json) process.stdout.write(JSON.stringify({ pane: agent.pane, key: agent.key, name: autoName, tab: layout.group, added: true }) + "\n");
  else {
    process.stdout.write(`Added ${agent.pane} (${autoName}) to group ${layout.group} running ${adapter}.\n`);
    printLayout(selectedBackend, tab.id, "\nFinal tiling:");
  }
  await pinModels([{ key: agent.key, pane: agent.pane, name: autoName }], model);
}

