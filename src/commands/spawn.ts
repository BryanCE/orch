import { bridgeRegistered, loadPresence, orchDir, recordSpawned, spawnedRecords, type PresenceEntry } from "../presence/store.ts";
import type { SpawnedRecord } from "../store/sqlite.ts";
import { loadConfig, resolveSetting, type OrchConfig } from "../config.ts";
import { assertNameFree } from "../policy/name.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { workerPolicyFrom, workerTools, type WorkerPolicy } from "../policy/workers.ts";
import { resolveAdapter as resolveRegisteredAdapter } from "../adapters/registry.ts";
import type { AdapterId, AgentAdapter } from "../adapters/adapter.ts";
import { workerHeaderFor } from "../worker-prompt.ts";
import { mintAgentId, serializeIdentity } from "../backends/identity.ts";
import type { Backend, BackendGroup, BackendHandle, BackendId } from "../backends/backend.ts";
import { resolveBackend } from "../backends/registry.ts";
import { nextTilePlacement, planTilePlacement, readGroupLayout, type TilePlacement } from "../backends/tiling.ts";
import { createAgentWorktree } from "../worktree.ts";
import { errorMessage } from "../util.ts";
import { writeRpc } from "./daemon.ts";
import { callerOwnerToken, callerWorkspace, die } from "./target.ts";
import { resolveTab } from "./panes.ts";

async function awaitBridgeRegistration(created: { key: string; pane: string; name: string }[], json = false) {
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
}

/** A launch that placed fewer agents than were asked for FAILED; a warning line
 *  and a zero exit is how "spawn 3" quietly delivering 1 read as success. */
function reportShortfall(requested: number, placed: number): void {
  if (placed >= requested) return;
  process.stderr.write(`placed ${placed} of ${requested} requested agent(s)\n`);
  process.exitCode = 1;
}

/** Confirm the agents actually came up, or say plainly that it could not be confirmed.
 *  A harness with no start-up presence signal leaves a launch unverifiable, and reporting
 *  an unverified launch as a success is how a fleet of ghosts reads as a healthy one. */
async function confirmAgentsCameUp(adapter: AgentAdapter, created: CreatedAgent[], json: boolean): Promise<void> {
  if (adapter.caps.registersPresenceOnStart) {
    await awaitBridgeRegistration(created, json);
    return;
  }
  process.stderr.write(`warning: ${adapter.id} writes no presence record at session start - ${created.length} agent(s) UNVERIFIED; check 'orch status' before dispatching\n`);
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

export function adapterCommand(adapter: string, config = loadConfig(orchDir())): string {
  const resolved = resolveAdapterOrDie(adapter);
  const opts = { tools: workerTools(config), workers: workerPolicyFrom(config) };
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
      await writeRpc("set-model", { target: key, model });
      return null;
    } catch (error: unknown) {
      reason = errorMessage(error);
    }
  }
  return reason;
}

export async function pinModels(created: { key: string; pane: string; name: string }[], model: string): Promise<void> {
  const results = await Promise.all(created.map(async ({ key, pane, name }) => ({
    pane,
    name,
    failure: await deliverModelPin(key, model),
  })));
  for (const result of results) {
    if (result.failure) process.stderr.write(`warning: could not pin ${result.name} (${result.pane}) to ${model}: ${result.failure}\n`);
  }
  if (results.some((result) => result.failure)) process.exitCode = 1;
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
  if (!model) die(`no model selected for ${adapter.id} - pass --model <model[:thinking]> or set defaults.models.${adapter.id} in $ORCH_DIR/settings.json`);
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
  return { adapter, backend: backend.id, model: launchModel(flags, config, harness) };
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
  fleet: OrchConfig["fleet"];
};

function resolveSpawnSettings(flags: SpawnFlags): SpawnSettings {
  const config = loadConfig(orchDir());
  const settings = resolveAgentSettings(flags, config);
  const spawnCap = resolveSetting({ flag: flags.spawnCapFlag, env: "ORCH_SPAWN_CAP", config: config.fleet.spawn_cap, fallback: config.fleet.spawn_cap });
  const worktree = resolveSetting({ flag: flags.worktreeFlag, env: "ORCH_WORKTREE", config: config.defaults.worktree, fallback: config.defaults.worktree });
  if (!Number.isInteger(spawnCap) || spawnCap < 1) die(`Invalid spawn cap ${spawnCap}; expected a positive integer.`);
  const n = parseInt(flags.positional[0]!, 10);
  if (!Number.isFinite(n) || n < 1)
    die("usage: orch spawn <N> [--tab <label>] [--cwd <path>] [--cmd <command>] [--name <prefix>] [--model <model[:thinking]>] [--agent <adapter>] [--backend <backend>] [--spawn-cap <N>] [--worktree]");
  if (n > spawnCap) die(`Refusing to spawn ${n} panes - cap is ${spawnCap}.`);
  resolveAdapterOrDie(settings.adapter);
  const tools = workerTools(config);
  const workers = workerPolicyFrom(config);
  const cmd = flags.commandFlag ? flags.cmd : adapterCommand(settings.adapter, config);
  // --tab names the tab; --name names the agents. Each defaults to the other so
  // one flag still produces a sensibly-labeled tab, but they are never conflated.
  const tabLabel = flags.tabLabel ?? flags.namePrefix ?? flags.label;
  const prefix = flags.namePrefix ?? flags.tabLabel ?? flags.label;
  return { ...settings, tools, workers, json: flags.json, label: tabLabel, tabExplicit: flags.tabLabel !== null, cwd: flags.cwd, cmd, commandFlag: flags.commandFlag, workspace: flags.workspace, prefix, n, worktree, fleet: config.fleet };
}

interface SpawnRoot { root: string; key: string; workspace: string; tabId: string; tabLabel: string; rootCwd: string; rootName: string }

export interface CreatedAgent { key: string; pane: string; name: string }

export function liveSpawnCounts(records: Map<string, SpawnedRecord>, presence: Map<string, PresenceEntry>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [key] of records) {
    const entry = presence.get(key);
    const workspace = entry?.status?.workspace;
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

// Detached agents are launched BY THE DAEMON, not here: the process holding an
// agent's stdin pipe is the process the agent's life is tied to, and this CLI
// exits in milliseconds. orchd outlives them and already owns delivery.
async function executeDetachedSpawn(settings: SpawnSettings, backend: Backend): Promise<void> {
  if (settings.commandFlag) die("--cmd requires a pane backend; detached launches use the selected adapter.");
  // Detached agents mint their identity under the backend's own workspace (headless → "local"),
  // never the caller's herdr identity; the cap check must match that same bucket, not callerWorkspace().
  const workspace = settings.workspace ?? "local";
  assertSpawnCapacity(settings, workspace, settings.n);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const created: CreatedAgent[] = [];
  for (let index = 1; index <= settings.n; index++) {
    const name = `${settings.prefix}-${index}`;
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.preTrustWorkspace?.(cwd, settings.cmd);
    try {
      // ONE key per agent: mint the name-based identity BEFORE launch and pass
      // it via ORCH_AGENT_KEY, exactly like the pane paths (spawnOneIntoTab).
      // The backend records the OS pid separately for close ownership; the key
      // never encodes it, and the backend never re-mints a second identity.
      assertNameFree(name, workspace);
      const key = serializeIdentity({ backend: backend.id, workspace, id: mintAgentId() });
      await writeRpc("spawn-detached", {
        key,
        adapter: settings.adapter,
        cwd,
        model: settings.model,
        tools: settings.tools,
        workers: settings.workers,
      });
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
      });
      if (!settings.json) process.stdout.write(`${key}  ${name}  [${settings.backend}]\n`);
    } catch (error: unknown) {
      die(`headless spawn failed for ${name}: ${errorMessage(error)}`);
    }
  }
  // Same gate the pane path uses: an inbox adapter is only reachable once it has
  // written its presence dir, so returning before that hands the caller a key it
  // cannot dispatch to yet.
  if (adapter.caps.steer === "inbox") await awaitBridgeRegistration(created, settings.json);
  if (settings.json) process.stdout.write(JSON.stringify({ backend: settings.backend, agents: created }) + "\n");
  else {
    process.stdout.write(`\nSpawned ${created.length} detached agent(s) (no panes).\n`);
    process.stdout.write("'orch status' shows the fleet.\n");
  }
}

function resolveSpawnWorkspace(requested: string | null): string {
  const workspace = requested ?? callerWorkspace();
  if (!workspace) die("Could not determine workspace id. Pass --workspace <id>.");
  return workspace;
}

function createSpawnRoot(settings: SpawnSettings, workspace: string, backend: Backend, adapter: AgentAdapter): SpawnRoot {
  const rootName = `${settings.prefix}-1`;
  const rootCwd = settings.worktree ? createAgentWorktree(settings.cwd, rootName) : settings.cwd;
  adapter.preTrustWorkspace?.(rootCwd, settings.cmd);
  if (!backend.createGroup) die(`backend ${backend.id} lacks group creation.`);
  let group: BackendGroup;
  let shellRoot: BackendHandle;
  try {
    const created = backend.createGroup({ workspace, cwd: rootCwd, label: settings.label });
    group = created.group;
    shellRoot = created.rootHandle;
  } catch (error: unknown) {
    die(`group create failed: ${errorMessage(error)}`);
  }
  // ONE key per agent: the identity passed via ORCH_AGENT_KEY is THE key — the
  // presence writer, registry, and daemon ack all join on it. The backend pane
  // handle is recorded as a field, never re-minted into a second key.
  assertNameFree(rootName, workspace);
  const key = serializeIdentity({ backend: backend.id, workspace, id: mintAgentId() });
  const handle = backend.spawn(adapter, { key, cwd: rootCwd, name: rootName, workspace, group: group.id, orchDir: orchDir(), model: settings.model, tools: settings.tools, workers: settings.workers, cmd: settings.commandFlag ? settings.cmd : undefined });
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
  const handle = spec.backend.spawn(spec.adapter, {
    key,
    cwd: spec.cwd,
    name: spec.name,
    workspace: spec.workspace,
    group: spec.group,
    split: spec.placement?.split,
    targetPane: spec.placement?.targetPane,
    orchDir: orchDir(),
    model: spec.model,
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
    tools: settings.tools,
    workers: settings.workers,
    cmd: settings.commandFlag ? settings.cmd : undefined,
    worktree: settings.worktree ? cwd : undefined,
    branch: settings.worktree ? `orch/${name}` : undefined,
  });
}

function launchAdditionalAgents(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[], backend: Backend): void {
  for (let i = 2; i <= settings.n; i++) {
    try {
      created.push(placeAgent(settings, `${settings.prefix}-${i}`, root.workspace, root.tabId, nextTilePlacement(backend, root.tabId), backend));
    } catch (error: unknown) {
      process.stderr.write(`warning: could not place agent #${i}: ${errorMessage(error)}\n`);
    }
  }
}

/** Find a tab by id or label in the target workspace, for `spawn --tab <existing>`. */
function findGroupInWorkspace(backend: Backend, workspace: string, target: string): BackendGroup | undefined {
  return (backend.groups?.() ?? []).find((group) =>
    (group.id === target || group.label === target) && (group.workspace === null || group.workspace === workspace));
}

/** Spawn every requested agent into an already-open tab, balancing as it fills. */
async function spawnIntoExistingTab(settings: SpawnSettings, group: BackendGroup, workspace: string, backend: Backend): Promise<void> {
  const created: CreatedAgent[] = [];
  for (let i = 1; i <= settings.n; i++) {
    try {
      created.push(placeAgent(settings, `${settings.prefix}-${i}`, workspace, group.id, nextTilePlacement(backend, group.id), backend));
    } catch (error: unknown) {
      process.stderr.write(`warning: could not place agent #${i}: ${errorMessage(error)}\n`);
    }
  }
  await reportSpawnResults(settings, group.id, group.label ?? group.id, created, backend);
}

async function reportSpawnResults(settings: SpawnSettings, group: string, tabLabel: string, created: CreatedAgent[], backend: Backend): Promise<void> {
  if (!settings.json) {
    for (const agent of created) process.stdout.write(`${agent.pane}  ${agent.name}  [${tabLabel}]  ${settings.cmd}\n`);
    process.stdout.write(`\nSpawned ${created.length} named agent(s) on tab "${tabLabel}" (no focus stolen).\n`);
    printLayout(backend, group, "\nFinal tiling:");
  }
  reportShortfall(settings.n, created.length);
  await confirmAgentsCameUp(resolveAdapterOrDie(settings.adapter), created, settings.json);
  await pinModels(created, settings.model);
  if (settings.json) process.stdout.write(JSON.stringify({ backend: settings.backend, tab: tabLabel, agents: created }) + "\n");
  else process.stdout.write(`\n'orch status' shows the fleet.\n`);
}

async function executeSpawn(settings: SpawnSettings): Promise<void> {
  const backend = resolveBackend({ configured: settings.backend });
  // A backend without group creation has no panes to tile into: spawn detached.
  if (!backend.createGroup) {
    await executeDetachedSpawn(settings, backend);
    return;
  }
  const workspace = resolveSpawnWorkspace(settings.workspace);
  assertSpawnCapacity(settings, workspace, settings.n);
  const adapter = resolveAdapterOrDie(settings.adapter);
  // `--tab <existing>` fills that tab instead of opening a new one; the tab
  // auto-balances as it fills, so no follow-up move/tile is needed.
  const existing = settings.tabExplicit ? findGroupInWorkspace(backend, workspace, settings.label) : undefined;
  if (existing) return spawnIntoExistingTab(settings, existing, workspace, backend);
  const root = createSpawnRoot(settings, workspace, backend, adapter);
  const created: CreatedAgent[] = [];
  recordSpawned(root.key, { adapter: settings.adapter, model: settings.model, backend: backend.id, workspace, handle: root.root, name: root.rootName, cwd: root.rootCwd, worktree: settings.worktree ? root.rootCwd : undefined, branch: settings.worktree ? `orch/${root.rootName}` : undefined, owner: callerOwnerToken() });
  created.push({ key: root.key, pane: root.root, name: root.rootName });
  launchAdditionalAgents(settings, root, created, backend);
  await reportSpawnResults(settings, root.tabId, root.tabLabel, created, backend);
}

export async function cmdSpawn(args: string[]) {
  await executeSpawn(resolveSpawnSettings(parseSpawnFlags(args)));
}

export async function cmdTile(args: string[]) {
  const flags = parseSpawnFlags(args);
  const config = loadConfig(orchDir());
  const { adapter, model } = resolveAgentSettings(flags, config);
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
      placement: planTilePlacement(layout),
      cmd: flags.commandFlag ? flags.cmd : undefined,
      // A tiled worker loads exactly what a spawned one does; dropping these is
      // how tiled agents lost the user's own harness extensions.
      tools: workerTools(config),
      workers: workerPolicyFrom(config),
      model,
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

export function workerPrompt(prompt: string, raw: boolean, adapter: AgentAdapter | undefined, lockedCommands: readonly string[] = []): string {
  return raw ? prompt : `${workerHeaderFor(adapter, lockedCommands)}\n\n${prompt}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

