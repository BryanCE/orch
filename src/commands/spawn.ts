import { bridgeRegistered, loadPresence, orchDir, recordSpawned, spawnedRecords, type PresenceEntry } from "../presence/store.ts";
import type { SpawnedRecord } from "../store/spawned-rows.ts";
import { loadConfig, resolveSetting, type OrchConfig } from "../config.ts";
import { assertNameFree, liveNamedRecords, nextNameIndex } from "../policy/name.ts";
import { agentIdentityEnv, spawnerIdentity, worktreeEnv } from "../policy/spawner.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { workerPolicyFrom, workerTools, type WorkerPolicy } from "../policy/workers.ts";
import { resolveAdapter as resolveRegisteredAdapter } from "../adapters/registry.ts";
import type { AdapterId, AgentAdapter } from "../adapters/adapter.ts";
import { repickCommand } from "../adapters/prerequisites.ts";
import { workerHeaderFor, type WorkerHeaderContext } from "../worker-prompt.ts";
import { mintAgentId, serializeIdentity } from "../backends/identity.ts";
import type { Backend, BackendGroup, BackendHandle, BackendId } from "../backends/backend.ts";
import { detachedBackend, resolveBackend } from "../backends/registry.ts";
import { nextTilePlacement, planTilePlacement, readGroupLayout, type TilePlacement } from "../backends/tiling.ts";
import { createAgentWorktree } from "../worktree.ts";
import { refreshStaleShims } from "../doctor/runner.ts";
import { errorMessage } from "../util.ts";
import { callDaemon, daemonOutage } from "./daemon.ts";
import { callerOwnerToken, callerWorkspace, die } from "./target.ts";
import { resolveTab } from "./panes.ts";

/** Wait for every agent to write its bridge dir; returns the ones that never did. */
async function awaitBridgeRegistration(created: { key: string; pane: string; name: string }[], json = false): Promise<CreatedAgent[]> {
  const pending = new Map(created.map((c) => [c.key, c]));
  const deadline = Date.now() + 60_000;
  if (!json) process.stdout.write("\nWaiting for agents to register:\n");
  while (pending.size && Date.now() < deadline) {
    for (const [key, agent] of [...pending]) {
      if (bridgeRegistered(key)) {
        pending.delete(key);
        if (!json) process.stdout.write(`  ok      ${agent.pane}  ${agent.name}\n`);
      }
    }
    await delay(500);
  }
  // A stalled agent is a failed spawn: it holds its name and answers no control
  // traffic. Reporting it on stderr while exiting 0 is what let a scripted fleet
  // launch read as success and dispatch into panes that never came up.
  for (const agent of pending.values())
    process.stderr.write(`  STALLED ${agent.pane}  ${agent.name} - no bridge dir; try: orch restart ${agent.name}\n`);
  if (pending.size) process.exitCode = 1;
  return [...pending.values()];
}

/** A launch that placed fewer agents than were asked for FAILED; a warning line
 *  and a zero exit is how "spawn 3" quietly delivering 1 read as success. */
function reportShortfall(requested: number, placed: number): void {
  if (placed >= requested) return;
  process.stderr.write(`placed ${placed} of ${requested} requested agent(s)\n`);
  process.exitCode = 1;
}

/** How many agents actually came up, or `null` when the harness cannot say.
 *  A harness with no start-up presence signal leaves a launch unverifiable, and reporting
 *  an unverified launch as a success is how a fleet of ghosts reads as a healthy one. */
async function confirmAgentsCameUp(adapter: AgentAdapter, created: CreatedAgent[], json: boolean): Promise<number | null> {
  if (adapter.caps.registersPresenceOnStart) {
    const stalled = await awaitBridgeRegistration(created, json);
    return created.length - stalled.length;
  }
  process.stderr.write(`warning: ${adapter.id} writes no presence record at session start - ${created.length} agent(s) UNVERIFIED; check 'orch status' before dispatching\n`);
  return null;
}

function printLayout(backend: Backend, group: string, header: string) {
  const layout = readGroupLayout(backend, group);
  if (!layout) return;
  const names = new Map((backend.inventory?.() ?? []).map((target) => [String(target.handle), target.name ?? "-"]));
  process.stdout.write(header + "\n");
  const rows = layout.panes.map((p) => [
    String(p.handle),
    names.get(String(p.handle)) ?? "-", 
    `${p.rect.width}x${p.rect.height} @${p.rect.x},${p.rect.y}`,
  ]);
  const w0 = Math.max(...rows.map((r) => r[0]!.length), 4);
  const w1 = Math.max(...rows.map((r) => r[1]!.length), 4);
  for (const r of rows)
    process.stdout.write(`  ${r[0]!.padEnd(w0)}  ${r[1]!.padEnd(w1)}  ${r[2]!}\n`);
}

export function resolveAdapterOrDie(id: string): AgentAdapter {
  try {
    return resolveRegisteredAdapter(id);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

/** The command one harness launches under, built by that harness's own adapter. `launch` carries
 *  what this launch selected — the model it starts on and the quicklist its picker shows — so a
 *  previewed command is the command the backend actually runs. */
export function adapterCommand(
  adapter: string,
  config = loadConfig(orchDir()),
  launch: { model?: string; preferredModels?: readonly string[] } = {},
): string {
  const resolved = resolveAdapterOrDie(adapter);
  const opts = { ...launch, tools: workerTools(config), workers: workerPolicyFrom(config) };
  return resolved.restrictedInteractiveCmd?.(opts) ?? resolved.interactiveCmd(opts);
}

/** Pin one agent's model, retrying while its bridge finishes registering.
 *  Re-delivering the same model is idempotent, so a bounded retry absorbs the
 *  routine race between a fresh spawn and its bridge coming up.
 *  Resolves to the agent's own refusal reason, never to a bare boolean: a pin
 *  that reports success without one is how a fleet silently ran the wrong model. */
async function deliverModelPin(key: string, model: string): Promise<string | null> {
  const backoffMs = [0, 200, 400, 800, 1200];
  let reason = "no attempt made";
  for (const wait of backoffMs) {
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    try {
      await callDaemon("set-model", { target: key, model });
      return null;
    } catch (error: unknown) {
      reason = errorMessage(error);
    }
  }
  return reason;
}

/** Pin every agent to the launch model and return the refusals as warning text.
 *  A pin is the last step of a launch whose panes already exist and are registered:
 *  its failure is a warning the caller reads, never an exit code that tells an
 *  automated caller to retry a spawn that already created panes. */
export async function pinModels(created: { key: string; pane: string; name: string }[], model: string): Promise<string[]> {
  const results = await Promise.all(created.map(async ({ key, pane, name }) => ({
    pane,
    name,
    failure: await deliverModelPin(key, model),
  })));
  const warnings = results
    .filter((result) => result.failure)
    .map((result) => `could not pin ${result.name} (${result.pane}) to ${model}: ${result.failure}`);
  for (const warning of warnings) process.stderr.write(`warning: ${warning}\n`);
  return warnings;
}

export interface AgentFlags {
  adapterFlag?: string;
  backendFlag?: string;
  modelFlag?: string;
}

export interface AgentSettings {
  adapter: AdapterId;
  backend: BackendId;
  model: string;
  /** The quicklist this harness's own picker/cycle is given; never a launch gate. */
  preferredModels: readonly string[];
}

/** The harness this command runs: flag, then ORCH_ADAPTER, then the configured default. */
export function pickAdapter(flags: AgentFlags, config: OrchConfig): AdapterId {
  const selected = resolveSetting({ flag: flags.adapterFlag, env: "ORCH_ADAPTER", config: config.defaults.adapter, fallback: "" });
  if (!selected) die("no harness selected - pass --agent <id> or run `orch setup` to pick one");
  // Validate the id here, at the boundary, so everything downstream carries AdapterId.
  return resolveAdapterOrDie(selected).id;
}

/** The model THIS command named, or null when the caller named none. NEVER the
 *  configured default: only a launch may apply that. A dispatch that fell back to
 *  it re-pinned every agent to the default and erased the model it spawned on. */
export function requestedModel(flags: AgentFlags): string | null {
  return resolveSetting({ flag: flags.modelFlag, env: "ORCH_MODEL", fallback: "" }) || null;
}

/** The model a fresh session runs on: what the caller named, else the configured
 *  default. With neither, refuse — an unpinned session silently runs whatever the
 *  harness happens to default to, which is never what the orchestrator asked for.
 *  Every path that starts a clean session (spawn, tile, reset) resolves it here, and
 *  the gate runs here too: the launch hands this string to the harness CLI, whose own
 *  resolver fuzzy-matches a shorthand onto whatever registry entry shares a prefix. A
 *  model the harness does not list must never reach that resolver. */
export function launchModel(flags: AgentFlags, config: OrchConfig, adapter: AgentAdapter): string {
  const model = requestedModel(flags) ?? config.defaults.models[adapter.id] ?? "";
  if (!model) die(`no model selected for ${adapter.id} - pass --model <model[:thinking]>, or record one with: ${repickCommand(adapter.id)}`);
  try {
    assertModelAllowed(orchDir(), adapter, model);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  return model;
}

export function resolveAgentSettings(flags: AgentFlags, config = loadConfig(orchDir())): AgentSettings {
  const adapter = pickAdapter(flags, config);
  const harness = resolveAdapterOrDie(adapter);
  // Selection flows through the backend factory: explicit flag/env, then config
  // default, then a capability-probed fallback. No per-backend branch is hard-coded here.
  let backend: Backend;
  try {
    backend = resolveBackend({
      explicit: flags.backendFlag ?? process.env.ORCH_BACKEND ?? null,
      configured: config.defaults.backend ?? null,
    });
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  return {
    adapter,
    backend: backend.id,
    model: launchModel(flags, config, harness),
    preferredModels: config.models.preferred[adapter] ?? [],
  };
}

type SpawnFlags = AgentFlags & {
  json: boolean;
  label: string;
  tabLabel: string | null;
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  workspace: string | null;
  namePrefix: string | null;
  spawnCapFlag?: number;
  worktreeFlag?: boolean;
  /** Initial task for a detached agent, which runs it and exits. */
  promptFlag?: string;
  positional: string[];
};

function readSpawnFlag(flags: SpawnFlags, args: string[], index: number): number {
  const argument = args[index];
  switch (argument) {
    case "--tab": flags.tabLabel = args[index + 1]!; return 1;
    case "--cwd": flags.cwd = args[index + 1]!; return 1;
    case "--cmd": flags.cmd = args[index + 1]!; flags.commandFlag = true; return 1;
    case "--name": flags.namePrefix = args[index + 1]!; return 1;
    case "--workspace": flags.workspace = args[index + 1]!; return 1;
    case "--model": flags.modelFlag = args[index + 1]!; return 1;
    case "--prompt": flags.promptFlag = args[index + 1]!; return 1;
    case "--agent":
    case "--adapter": flags.adapterFlag = args[index + 1]!; return 1;
    case "--backend": flags.backendFlag = args[index + 1]!; return 1;
    case "--spawn-cap":
    case "--cap": flags.spawnCapFlag = Number(args[index + 1]); return 1;
    default: return -1;
  }
}

export function parseSpawnFlags(args: string[]): SpawnFlags {
  const flags: SpawnFlags = {
    json: args.includes("--json"),
    label: "work", tabLabel: null, cwd: process.cwd(), cmd: "pi", commandFlag: false,
    workspace: null, namePrefix: null, positional: [],
  };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--worktree" || args[index] === "--json") { if (args[index] === "--worktree") flags.worktreeFlag = true; continue; }
    const consumed = readSpawnFlag(flags, args, index);
    if (consumed >= 0) { index += consumed; continue; }
    flags.positional.push(args[index]!);
  }
  return flags;
}

type SpawnSettings = AgentSettings & {
  tools: string | undefined;
  workers: WorkerPolicy;
  json: boolean;
  label: string;
  /** True when --tab named a tab: an existing match is joined, not recreated. */
  tabExplicit: boolean;
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  workspace: string | null;
  prefix: string;
  n: number;
  worktree: boolean;
  /** Initial task for a detached agent; empty for pane agents, which idle until dispatched. */
  prompt: string;
  fleet: OrchConfig["fleet"];
  tiling: OrchConfig["tiling"];
};

function resolveSpawnSettings(flags: SpawnFlags): SpawnSettings {
  const config = loadConfig(orchDir());
  const settings = resolveAgentSettings(flags, config);
  const spawnCap = resolveSetting({ flag: flags.spawnCapFlag, env: "ORCH_SPAWN_CAP", config: config.fleet.spawn_cap, fallback: config.fleet.spawn_cap });
  const worktree = resolveSetting({ flag: flags.worktreeFlag, env: "ORCH_WORKTREE", config: config.defaults.worktree, fallback: config.defaults.worktree });
  if (!Number.isInteger(spawnCap) || spawnCap < 1) die(`Invalid spawn cap ${spawnCap}; expected a positive integer.`);
  const n = parseInt(flags.positional[0]!, 10);
  if (!Number.isFinite(n) || n < 1)
    die("usage: orch spawn <N> [--tab <label>] [--cwd <path>] [--cmd <command>] [--name <prefix>] [--model <model[:thinking]>] [--agent <adapter>] [--backend <backend>] [--prompt <text>] [--spawn-cap <N>] [--worktree]");
  if (n > spawnCap) die(`Refusing to spawn ${n} panes - cap is ${spawnCap}.`);
  resolveAdapterOrDie(settings.adapter);
  const tools = workerTools(config);
  const workers = workerPolicyFrom(config);
  const cmd = flags.commandFlag
    ? flags.cmd
    : adapterCommand(settings.adapter, config, { model: settings.model, preferredModels: settings.preferredModels });
  // --tab names the tab; --name names the agents. Each defaults to the other so
  // one flag still produces a sensibly-labeled tab, but they are never conflated.
  const tabLabel = flags.tabLabel ?? flags.namePrefix ?? flags.label;
  const prefix = flags.namePrefix ?? flags.tabLabel ?? flags.label;
  return { ...settings, tools, workers, json: flags.json, label: tabLabel, tabExplicit: flags.tabLabel !== null, cwd: flags.cwd, cmd, commandFlag: flags.commandFlag, workspace: flags.workspace, prefix, n, worktree, prompt: flags.promptFlag ?? "", fleet: config.fleet, tiling: config.tiling };
}

interface SpawnRoot { root: string; key: string; workspace: string; tabId: string; tabLabel: string; rootCwd: string; rootName: string }

export interface CreatedAgent { key: string; pane: string; name: string }

export function liveSpawnCounts(records: Map<string, SpawnedRecord>, presence: Map<string, PresenceEntry>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [key] of records) {
    const entry = presence.get(key);
    const workspace = records.get(key)?.workspace;
    if (!entry?.alive || typeof workspace !== "string") continue;
    counts.set(workspace, (counts.get(workspace) ?? 0) + 1);
  }
  return counts;
}

function assertSpawnCapacity(settings: Pick<OrchConfig, "fleet">, workspace: string, requested: number): void {
  const counts = liveSpawnCounts(spawnedRecords(), loadPresence());
  const live = [...counts.values()].reduce((total, count) => total + count, 0);
  const workspaceLive = counts.get(workspace) ?? 0;
  const workspaceCap = settings.fleet.workspace_caps[workspace];
  if (workspaceCap !== undefined && workspaceLive + requested > workspaceCap) {
    die(`spawn refused: would put ${workspace} at ${workspaceLive + requested}/${workspaceCap} agents (${workspaceLive} live + ${requested} requested; fleet.workspace_caps.${workspace})`);
  }
  const globalCap = settings.fleet.max_agents;
  if (globalCap !== undefined && live + requested > globalCap) {
    die(`spawn refused: would put all workspaces at ${live + requested}/${globalCap} agents (${live} live + ${requested} requested; fleet.max_agents)`);
  }
}

// Detached agents are launched BY THE DAEMON, not here: orchd outlives this CLI
// and already owns delivery. Each runs the prompt it was launched with and exits —
// there is no pane for it to idle in.
async function executeDetachedSpawn(settings: SpawnSettings, backend: Backend): Promise<void> {
  if (settings.commandFlag) die("--cmd requires a pane backend; detached launches use the selected adapter.");
  // A detached agent has no TTY to idle on: it runs its prompt and exits, so work
  // dispatched after launch would arrive at a dead process.
  if (!settings.prompt.trim()) die(`a ${settings.backend} spawn needs its work up front: pass --prompt "<text>" (a detached agent runs it and exits)`);
  // Detached agents mint their identity under the backend's own workspace (headless → "local"),
  // never the caller's herdr identity; the cap check must match that same bucket, not callerWorkspace().
  const workspace = settings.workspace ?? "local";
  assertSpawnCapacity(settings, workspace, settings.n);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const config = loadConfig(orchDir());
  const created: CreatedAgent[] = [];
  for (const name of claimSpawnNames(settings.prefix, workspace, settings.n)) {
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.preTrustWorkspace?.(cwd, settings.cmd);
    try {
      // ONE key per agent: mint the name-based identity BEFORE launch and pass
      // it via ORCH_AGENT_KEY, exactly like the pane paths (spawnOneIntoTab).
      // The backend records the OS pid separately for close ownership; the key
      // never encodes it, and the backend never re-mints a second identity.
      const key = serializeIdentity({ backend: backend.id, workspace, id: mintAgentId() });
      const spawner = spawnerIdentity();
      // orchd launches a real harness process inside this call, so it gets the adapter-command
      // budget, not the 5s default meant for a question orchd answers from memory.
      await callDaemon("spawn-detached", {
        key,
        adapter: settings.adapter,
        cwd,
        // The daemon launches the process, but the IDENTITY of the spawner is
        // this CLI's: orchd's own env knows nothing about the calling session.
        env: { ...agentIdentityEnv(name, spawner), ...worktreeEnv(settings.worktree ? cwd : undefined, settings.worktree ? `orch/${name}` : undefined) },
        model: settings.model,
        // A JSON array over the wire, never a joined string: the harness's own quicklist
        // syntax is the adapter's to write, at the far end of the launch.
        preferredModels: [...settings.preferredModels],
        prompt: workerPrompt(settings.prompt, false, adapter, { lockedCommands: config.locked_commands, spawnerRepliable: spawner.key !== null }),
        tools: settings.tools,
        workers: settings.workers,
      }, {}, config.timeouts.adapter_command_ms);
      // A detached agent has no pane, so its key is the handle every display uses.
      created.push({ key, pane: key, name });
      recordSpawned(key, {
        adapter: settings.adapter,
        model: settings.model,
        backend: settings.backend,
        workspace,
        name,
        worktree: settings.worktree ? cwd : undefined,
        branch: settings.worktree ? `orch/${name}` : undefined,
        owner: callerOwnerToken(),
        spawnedBy: spawner.key ?? undefined,
        spawnedByLabel: spawner.label,
      });
      if (!settings.json) process.stdout.write(`${key}  ${name}  [${settings.backend}]\n`);
    } catch (error: unknown) {
      // Stop asking for more, but report the agents already launched: a caller told
      // only "failed" retries the whole spawn and ends up with a duplicate fleet.
      process.stderr.write(`${settings.backend} spawn failed for ${name}: ${errorMessage(error)}\n`);
      break;
    }
  }
  // Same gate the pane path uses: an inbox adapter is only reachable once it has
  // written its presence dir, so returning before that hands the caller a key it
  // cannot dispatch to yet.
  reportShortfall(settings.n, created.length);
  const stalled = adapter.caps.steer === "inbox" ? await awaitBridgeRegistration(created, settings.json) : [];
  if (settings.json) process.stdout.write(JSON.stringify({
    backend: settings.backend,
    agents: created,
    requested: settings.n,
    created: created.length,
    registered: created.length - stalled.length,
  }) + "\n");
  else {
    process.stdout.write(`\nSpawned ${created.length} detached agent(s) (no panes).\n`);
    process.stdout.write("'orch status' shows the fleet.\n");
  }
}

function resolveSpawnWorkspace(requested: string | null): string {
  const workspace = requested ?? callerWorkspace();
  if (!workspace) die("Could not determine workspace id. Pass --workspace <id>, or --backend headless with --prompt to launch detached.");
  return workspace;
}

function createSpawnRoot(settings: SpawnSettings, workspace: string, backend: Backend, adapter: AgentAdapter, rootName: string): SpawnRoot {
  const rootCwd = settings.worktree ? createAgentWorktree(settings.cwd, rootName) : settings.cwd;
  adapter.preTrustWorkspace?.(rootCwd, settings.cmd);
  if (!backend.createGroup) die(`backend ${backend.id} lacks group creation.`);
  // The name is ruled on BEFORE the backend allocates anything: a collision
  // discovered after createGroup left a phantom tab lingering on screen.
  try {
    assertNameFree(rootName, workspace);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  // ONE key per agent: the identity passed via ORCH_AGENT_KEY is THE key — the
  // presence writer, registry, and daemon ack all join on it. The backend pane
  // handle is recorded as a field, never re-minted into a second key.
  const key = serializeIdentity({ backend: backend.id, workspace, id: mintAgentId() });
  let group: BackendGroup;
  let shellRoot: BackendHandle;
  try {
    const created = backend.createGroup({ workspace, cwd: rootCwd, label: settings.label });
    group = created.group;
    shellRoot = created.rootHandle;
  } catch (error: unknown) {
    die(`group create failed: ${errorMessage(error)}`);
  }
  const spawner = spawnerIdentity();
  let handle: BackendHandle;
  try {
    handle = backend.spawn(adapter, { key, env: { ...agentIdentityEnv(rootName, spawner), ...worktreeEnv(settings.worktree ? rootCwd : undefined, settings.worktree ? `orch/${rootName}` : undefined) }, cwd: rootCwd, name: rootName, workspace, group: group.id, orchDir: orchDir(), model: settings.model, preferredModels: settings.preferredModels, tools: settings.tools, workers: settings.workers, cmd: settings.commandFlag ? settings.cmd : undefined });
  } catch (error: unknown) {
    // A tab holding no agent is pure pollution: close it before failing the launch.
    try { backend.closeGroup?.(group.id); } catch { /* the failure below is the report */ }
    die(`root spawn failed: ${errorMessage(error)}`);
  }
  backend.close(shellRoot);
  return { root: String(handle), key, workspace, tabId: group.id, tabLabel: group.label ?? settings.label, rootCwd, rootName };
}

export interface TabSpawnSpec {
  backend: Backend;
  adapter: AgentAdapter;
  adapterId: AdapterId;
  name: string;
  cwd: string;
  workspace: string;
  group: string;
  model: string;
  /** The quicklist this harness's own picker/cycle is given; never a launch gate. */
  preferredModels: readonly string[];
  /** Where the pane lands in the group, from the tiling planner. */
  placement?: TilePlacement;
  tools?: string;
  /** What this worker may load; absent lets the adapter apply no policy. */
  workers?: WorkerPolicy;
  /** Verbatim launch command from `--cmd`; absent lets the adapter build it. */
  cmd?: string;
  worktree?: string;
  branch?: string;
}

// The single spawn-into-a-tab pipeline shared by `orch spawn` (additional panes)
// and `orch tile`. ONE key per agent: the identity is minted before launch and
// passed via ORCH_AGENT_KEY — the name and the backend pane handle are recorded
// beside it as plain fields, never folded into it. The caller owns error policy
// (warn-and-continue vs die); this throws on backend failure.
export function spawnOneIntoTab(spec: TabSpawnSpec): CreatedAgent {
  assertNameFree(spec.name, spec.workspace);
  const key = serializeIdentity({ backend: spec.backend.id, workspace: spec.workspace, id: mintAgentId() });
  const spawner = spawnerIdentity();
  const handle = spec.backend.spawn(spec.adapter, {
    key,
    env: { ...agentIdentityEnv(spec.name, spawner), ...worktreeEnv(spec.worktree, spec.branch) },
    cwd: spec.cwd,
    name: spec.name,
    workspace: spec.workspace,
    group: spec.group,
    split: spec.placement?.split,
    targetPane: spec.placement?.targetPane,
    orchDir: orchDir(),
    model: spec.model,
    preferredModels: spec.preferredModels,
    tools: spec.tools,
    workers: spec.workers,
    cmd: spec.cmd,
  });
  recordSpawned(key, {
    adapter: spec.adapterId,
    model: spec.model,
    backend: spec.backend.id,
    workspace: spec.workspace,
    handle: String(handle),
    name: spec.name,
    cwd: spec.cwd,
    worktree: spec.worktree,
    branch: spec.branch,
    owner: callerOwnerToken(),
    spawnedBy: spawner.key ?? undefined,
    spawnedByLabel: spawner.label,
  });
  return { key, pane: String(handle), name: spec.name };
}

/** Spawn one named agent into a tab, at the spot the planner picked for it. */
function placeAgent(settings: SpawnSettings, name: string, workspace: string, group: string, placement: TilePlacement, backend: Backend): CreatedAgent {
  const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
  return spawnOneIntoTab({
    backend,
    adapter: resolveAdapterOrDie(settings.adapter),
    adapterId: settings.adapter,
    name,
    cwd,
    workspace,
    group,
    placement,
    model: settings.model,
    preferredModels: settings.preferredModels,
    tools: settings.tools,
    workers: settings.workers,
    cmd: settings.commandFlag ? settings.cmd : undefined,
    worktree: settings.worktree ? cwd : undefined,
    branch: settings.worktree ? `orch/${name}` : undefined,
  });
}

function launchAdditionalAgents(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[], backend: Backend, names: readonly string[]): void {
  for (const name of names) {
    try {
      created.push(placeAgent(settings, name, root.workspace, root.tabId, nextTilePlacement(backend, root.tabId, settings.tiling.first_split), backend));
    } catch (error: unknown) {
      process.stderr.write(`warning: could not place agent ${name}: ${errorMessage(error)}\n`);
    }
  }
}

/** Find a tab by id or label in the target workspace, for `spawn --tab <existing>`. */
function findGroupInWorkspace(backend: Backend, workspace: string, target: string): BackendGroup | undefined {
  return (backend.groups?.() ?? []).find((group) =>
    (group.id === target || group.label === target) && (group.workspace === null || group.workspace === workspace));
}

/** The tab housing this workspace's live "<prefix>-<n>" agents, when the backend
 *  can see one. It is what `spawn --name <existing-group>` grows into. */
function groupOfLivePrefix(backend: Backend, prefix: string, workspace: string): BackendGroup | undefined {
  const handles = new Set(liveNamedRecords(prefix, workspace).map((record) => record.handle).filter((handle) => handle !== undefined));
  if (handles.size === 0) return undefined;
  const housed = (backend.inventory?.() ?? []).find((target) => handles.has(String(target.handle)) && target.group !== null);
  return housed ? (backend.groups?.() ?? []).find((group) => group.id === housed.group) : undefined;
}

/** The names this launch will use, every one validated BEFORE any tab, pane, or
 *  worktree exists: numbering continues past live "<prefix>-<n>" agents, so
 *  spawning under a live name grows that fleet instead of colliding with it. */
function claimSpawnNames(prefix: string, workspace: string, count: number): string[] {
  const start = nextNameIndex(prefix, workspace);
  const names = Array.from({ length: count }, (_, offset) => `${prefix}-${start + offset}`);
  try {
    for (const name of names) assertNameFree(name, workspace);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  return names;
}

/** Spawn every requested agent into an already-open tab, balancing as it fills. */
async function spawnIntoExistingTab(settings: SpawnSettings, group: BackendGroup, workspace: string, backend: Backend, names: readonly string[]): Promise<void> {
  const created: CreatedAgent[] = [];
  for (const name of names) {
    try {
      created.push(placeAgent(settings, name, workspace, group.id, nextTilePlacement(backend, group.id, settings.tiling.first_split), backend));
    } catch (error: unknown) {
      process.stderr.write(`warning: could not place agent ${name}: ${errorMessage(error)}\n`);
    }
  }
  await reportSpawnResults(settings, group.id, group.label ?? group.id, created, backend);
}

/** Announce a fleet whose control plane is down, and fail the launch. Panes without
 *  orchd are UNMANAGED: no steer, model pin, or result reaches them, and printing
 *  the tiling and "Spawned N agent(s)" over that silence is what sent an operator
 *  dispatching into a fleet that answered nothing. Null when orchd answers. */
async function reportControlPlaneOutage(paneCount: number): Promise<string | null> {
  const outage = await daemonOutage();
  if (!outage) return null;
  process.stderr.write(`CONTROL PLANE UNREACHABLE - ${paneCount} pane(s) are UNMANAGED: ${outage}\n`);
  process.exitCode = 1;
  return outage;
}

async function reportSpawnResults(settings: SpawnSettings, group: string, tabLabel: string, created: CreatedAgent[], backend: Backend): Promise<void> {
  if (!settings.json) {
    for (const agent of created) process.stdout.write(`${agent.pane}  ${agent.name}  [${tabLabel}]  ${settings.cmd}\n`);
    process.stdout.write(`\nSpawned ${created.length} named agent(s) on tab "${tabLabel}" (no focus stolen).\n`);
    printLayout(backend, group, "\nFinal tiling:");
  }
  reportShortfall(settings.n, created.length);
  const registered = await confirmAgentsCameUp(resolveAdapterOrDie(settings.adapter), created, settings.json);
  const warnings = await pinModels(created, settings.model);
  const outage = warnings.length ? await reportControlPlaneOutage(created.length) : null;
  if (settings.json) process.stdout.write(JSON.stringify({
    backend: settings.backend,
    tab: tabLabel,
    agents: created,
    requested: settings.n,
    created: created.length,
    registered,
    warnings,
    daemon: outage ?? "ok",
  }) + "\n");
  else process.stdout.write(`\n'orch status' shows the fleet.\n`);
}

/**
 * A pane backend answers `isInsideSession` whenever its socket is up, which says
 * nothing about whether THIS process sits in one of its panes. When it cannot place
 * the caller there is no workspace to open a tab in, so the launch goes detached
 * rather than refusing: orch owns the agent either way and where it runs is placement
 * (Rule 11). An explicit `--workspace` always wins.
 */
function spawnBackend(settings: SpawnSettings): Backend {
  const backend = resolveBackend({ configured: settings.backend });
  if (!backend.createGroup || settings.workspace !== null) return backend;
  if (backend.currentIdentity?.()?.workspace) return backend;
  process.stderr.write(
    `orch is not running inside a ${backend.id} pane, so there is no workspace to open a tab in - spawning detached. `
    + `Pass --workspace <id> to place these agents in a ${backend.id} workspace instead.\n`,
  );
  return detachedBackend;
}

async function executeSpawn(settings: SpawnSettings): Promise<void> {
  const backend = spawnBackend(settings);
  // A backend without group creation has no panes to tile into: spawn detached.
  if (!backend.createGroup) {
    await executeDetachedSpawn(settings, backend);
    return;
  }
  const workspace = resolveSpawnWorkspace(settings.workspace);
  assertSpawnCapacity(settings, workspace, settings.n);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const names = claimSpawnNames(settings.prefix, workspace, settings.n);
  // `--tab <existing>` fills that tab instead of opening a new one, and a live
  // "<prefix>-<n>" fleet is grown in its own tab; both auto-balance as they
  // fill, so no follow-up move/tile is needed.
  const existing = (settings.tabExplicit ? findGroupInWorkspace(backend, workspace, settings.label) : undefined)
    ?? groupOfLivePrefix(backend, settings.prefix, workspace);
  if (existing) return spawnIntoExistingTab(settings, existing, workspace, backend, names);
  const root = createSpawnRoot(settings, workspace, backend, adapter, names[0]!);
  const created: CreatedAgent[] = [];
  const spawner = spawnerIdentity();
  recordSpawned(root.key, { adapter: settings.adapter, model: settings.model, backend: backend.id, workspace, handle: root.root, name: root.rootName, cwd: root.rootCwd, worktree: settings.worktree ? root.rootCwd : undefined, branch: settings.worktree ? `orch/${root.rootName}` : undefined, owner: callerOwnerToken(), spawnedBy: spawner.key ?? undefined, spawnedByLabel: spawner.label });
  created.push({ key: root.key, pane: root.root, name: root.rootName });
  launchAdditionalAgents(settings, root, created, backend, names.slice(1));
  await reportSpawnResults(settings, root.tabId, root.tabLabel, created, backend);
}

export async function cmdSpawn(args: string[]) {
  // A freshly updated orch never launches agents on the last version's bridge.
  await refreshStaleShims(orchDir());
  await executeSpawn(resolveSpawnSettings(parseSpawnFlags(args)));
}

export async function cmdTile(args: string[]) {
  const flags = parseSpawnFlags(args);
  const config = loadConfig(orchDir());
  const { adapter, model, preferredModels } = resolveAgentSettings(flags, config);
  const selectedBackend = resolveBackend({ explicit: flags.backendFlag ?? null, configured: config.defaults.backend ?? null });
  if (!selectedBackend.panes) die(`orch tile requires a pane-capable backend; ${selectedBackend.id} has no panes to tile.`);
  const selectedAdapter = resolveAdapterOrDie(adapter);
  const target = flags.positional[0];
  if (!target) die("usage: orch tile <tab-or-pane> [--name <name>] [--cmd <command>] [--cwd <path>] [--model <model[:thinking]>");

  const tab = resolveTab(target);
  const layout = readGroupLayout(selectedBackend, tab.id);
  if (!layout) die(`Could not read layout for group "${tab.id}".`);
  const autoName = flags.namePrefix ?? `tile-${layout.panes.length + 1}`;

  const workspace = tab.workspace ?? callerWorkspace();
  if (!workspace) die(`Could not determine workspace for group "${tab.id}".`);
  assertSpawnCapacity(config, workspace, 1);
  let agent: CreatedAgent;
  try {
    agent = spawnOneIntoTab({
      backend: selectedBackend,
      adapter: selectedAdapter,
      adapterId: adapter,
      name: autoName,
      cwd: flags.cwd,
      workspace,
      group: tab.id,
      // Same planner `spawn` uses, off the same tab-wide geometry.
      placement: planTilePlacement(layout, config.tiling.first_split),
      cmd: flags.commandFlag ? flags.cmd : undefined,
      // A tiled worker loads exactly what a spawned one does; dropping these is
      // how tiled agents lost the user's own harness extensions.
      tools: workerTools(config),
      workers: workerPolicyFrom(config),
      model,
      preferredModels,
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

export function workerPrompt(prompt: string, raw: boolean, adapter: AgentAdapter | undefined, context: WorkerHeaderContext = {}): string {
  return raw ? prompt : `${workerHeaderFor(adapter, context)}\n\n${prompt}`;
}

/** This session's own reply address, live only when it writes presence of its own.
 *  A worker is told to `orch_send target "spawner"` on the strength of this and
 *  nothing else — never on its own harness's steer capability. */
export function spawnerIsRepliable(): boolean {
  return spawnerIdentity().key !== null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

