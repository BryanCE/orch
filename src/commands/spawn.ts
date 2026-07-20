import { bridgeRegistered, loadPresence, orchDir, recordSpawned, spawnedRecords, type PresenceEntry, type SpawnedRecord } from "../store.ts";
import { loadConfig, resolveSetting, type OrchConfig } from "../config.ts";
import { resolveAdapter as resolveRegisteredAdapter } from "../adapters/registry.ts";
import type { AgentAdapter } from "../adapters/adapter.ts";
import { workerHeaderFor } from "../worker-prompt.ts";
import { serializeIdentity } from "../backends/identity.ts";
import type { Backend, BackendGroup, BackendGroupLayout, BackendHandle } from "../backends/backend.ts";
import { resolveBackend } from "../backends/registry.ts";
import { selfActor } from "../entities.ts";
import { createAgentWorktree } from "../worktree.ts";
import { errorMessage } from "../util.ts";
import { writeRpc } from "./daemon.ts";
import { callerWorkspace, die } from "./target.ts";
import { resolveTab } from "./panes.ts";

function paneLayout(refPane: BackendHandle, backend: Backend): BackendGroupLayout {
  if (!backend.layoutOf) throw new Error(`backend ${backend.id} does not provide layout`);
  return backend.layoutOf(refPane);
}

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
  for (const agent of pending.values())
    process.stderr.write(`  STALLED ${agent.pane}  ${agent.name} — no bridge dir; try: orch restart ${agent.name}\n`);
}

function printLayout(refPane: BackendHandle, backend: Backend, header: string) {
  let layout: BackendGroupLayout;
  try {
    layout = paneLayout(refPane, backend);
  } catch {
    return;
  }
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

const WORKER_BASE_TOOLS = ["read", "write", "edit", "bash", "orch_ask"] as const;

const WORKER_PEER_TOOLS = ["orch_agents", "orch_send", "orch_read"] as const;

export function workerTools(config: OrchConfig): string {
  const tools: string[] = [...WORKER_BASE_TOOLS];
  const peerTools = config.defaults.worker_peer_tools ?? false;
  if (peerTools) tools.push(...WORKER_PEER_TOOLS);
  return tools.join(",");
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
  return resolved.restrictedInteractiveCmd?.({ tools: workerTools(config) }) ?? resolved.interactiveCmd({});
}

async function pinModels(created: { key: string; pane: string; name: string }[], model: string): Promise<void> {
  const results = await Promise.all(created.map(async ({ key, pane, name }) => {
    try {
      await writeRpc("set-model", { target: key, model });
      return { pane, name, ok: true };
    } catch {
      return { pane, name, ok: false };
    }
  }));
  for (const result of results) {
    if (!result.ok) process.stderr.write(`warning: could not pin ${result.name} (${result.pane}) to ${model}.\n`);
  }
  if (results.some((result) => !result.ok)) process.exitCode = 1;
}

export interface AgentFlags {
  adapterFlag?: string;
  backendFlag?: string;
  modelFlag?: string;
}

export interface AgentSettings {
  adapter: string;
  backend: string;
  model: string | null;
}

export function resolveAgentSettings(flags: AgentFlags, config = loadConfig(orchDir())): AgentSettings {
  const adapter = resolveSetting({ flag: flags.adapterFlag, env: "ORCH_ADAPTER", config: config.defaults.adapter, fallback: "" });
  if (!adapter) die("no harness selected — pass --agent <id> or run `orch setup` to pick one");
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
  const selectedModel = resolveSetting({ flag: flags.modelFlag, env: "ORCH_MODEL", config: config.defaults.model, fallback: "" });
  return { adapter, backend: backend.id, model: selectedModel || null };
}

type SpawnFlags = AgentFlags & {
  json: boolean;
  label: string;
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
    case "--tab": flags.label = args[index + 1]!; return 1;
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
    label: "work", cwd: process.cwd(), cmd: "pi", commandFlag: false,
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
  tools: string;
  json: boolean;
  label: string;
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  workspace: string | null;
  prefix: string;
  n: number;
  worktree: boolean;
  limits: OrchConfig["limits"];
};

function resolveSpawnSettings(flags: SpawnFlags): SpawnSettings {
  const config = loadConfig(orchDir());
  const settings = resolveAgentSettings(flags, config);
  const spawnCap = resolveSetting({ flag: flags.spawnCapFlag, env: "ORCH_SPAWN_CAP", config: config.defaults.spawn_cap, fallback: 8 });
  const worktree = resolveSetting({ flag: flags.worktreeFlag, env: "ORCH_WORKTREE", config: config.defaults.worktree, fallback: false });
  if (!Number.isInteger(spawnCap) || spawnCap < 1) die(`Invalid spawn cap ${spawnCap}; expected a positive integer.`);
  const n = parseInt(flags.positional[0]!, 10);
  if (!Number.isFinite(n) || n < 1)
    die("usage: orch spawn <N> [--tab <label>] [--cwd <path>] [--cmd <command>] [--name <prefix>] [--model <provider/model[:thinking]>] [--agent <adapter>] [--backend <backend>] [--spawn-cap <N>] [--worktree]");
  if (n > spawnCap) die(`Refusing to spawn ${n} panes — cap is ${spawnCap}.`);
  resolveAdapterOrDie(settings.adapter);
  const tools = workerTools(config);
  const cmd = flags.commandFlag ? flags.cmd : adapterCommand(settings.adapter, config);
  return { ...settings, tools, json: flags.json, label: flags.namePrefix ?? flags.label, cwd: flags.cwd, cmd, commandFlag: flags.commandFlag, workspace: flags.workspace, prefix: flags.namePrefix ?? flags.label, n, worktree, limits: config.limits };
}

interface SpawnRoot { root: string; key: string; workspace: string; tabId: string; tabLabel: string; rootCwd: string; rootName: string }

interface CreatedAgent { key: string; pane: string; name: string }

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

function assertSpawnCapacity(settings: Pick<OrchConfig, "limits">, workspace: string, requested: number): void {
  const counts = liveSpawnCounts(spawnedRecords(), loadPresence());
  const live = [...counts.values()].reduce((total, count) => total + count, 0);
  const workspaceLive = counts.get(workspace) ?? 0;
  const workspaceCap = settings.limits.workspaces?.[workspace];
  if (workspaceCap !== undefined && workspaceLive + requested > workspaceCap) {
    die(`spawn refused: would put ${workspace} at ${workspaceLive + requested}/${workspaceCap} agents (${workspaceLive} live + ${requested} requested; limits.workspaces.${workspace})`);
  }
  const globalCap = settings.limits.maxAgents;
  if (globalCap !== undefined && live + requested > globalCap) {
    die(`spawn refused: would put all workspaces at ${live + requested}/${globalCap} agents (${live} live + ${requested} requested; limits.maxAgents)`);
  }
}

function executeDetachedSpawn(settings: SpawnSettings, backend: Backend): void {
  if (settings.commandFlag) die("--cmd requires a pane backend; detached launches use the selected adapter.");
  // Detached agents mint their identity under the backend's own workspace (headless → "local"),
  // never the caller's herdr identity; the cap check must match that same bucket, not callerWorkspace().
  const workspace = settings.workspace ?? "local";
  assertSpawnCapacity(settings, workspace, settings.n);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const created: { key: string }[] = [];
  for (let index = 1; index <= settings.n; index++) {
    const name = `${settings.prefix}-${index}`;
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.preTrustWorkspace?.(cwd, settings.cmd);
    try {
      // Detached agents identify themselves by their minted identity key;
      // omitting key keeps the registry aligned with the presence protocol.
      const handle = backend.spawn(adapter, {
        cwd,
        model: settings.model ?? undefined,
        orchDir: orchDir(),
        tools: settings.tools,
      });
      const key = serializeIdentity(backend.mintIdentity(handle));
      created.push({ key });
      recordSpawned(key, {
        adapter: settings.adapter,
        model: settings.model ?? undefined,
        backend: settings.backend,
        workspace,
        worktree: settings.worktree ? cwd : undefined,
        branch: settings.worktree ? `orch/${name}` : undefined,
        owner: selfActor() ?? undefined,
      });
      if (!settings.json) process.stdout.write(`${key}  ${name}  [${settings.backend}]\n`);
    } catch (error: unknown) {
      die(`headless spawn failed for ${name}: ${errorMessage(error)}`);
    }
  }
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
  const handle = backend.spawn(adapter, { key: serializeIdentity({ backend: backend.id, workspace, handle: rootName }), cwd: rootCwd, name: rootName, workspace, group: group.id, orchDir: orchDir(), model: settings.model ?? undefined, tools: settings.tools });
  backend.close(shellRoot);
  const key = serializeIdentity(backend.mintIdentity(handle));
  return { root: String(handle), key, workspace, tabId: group.id, tabLabel: group.label ?? settings.label, rootCwd, rootName };
}

function launchAdditionalAgents(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[], backend: Backend): void {
  for (let i = 2; i <= settings.n; i++) {
    try {
      const name = `${settings.prefix}-${i}`;
      const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
      let split: "down" | "right" = "down";
      if (i > 2) {
        const layout = paneLayout(root.root, backend);
        const largest = layout.panes.reduce((current, pane) => {
          const currentArea = current.rect.width * current.rect.height;
          const paneArea = pane.rect.width * pane.rect.height;
          return paneArea > currentArea ? pane : current;
        });
        split = largest.rect.width >= largest.rect.height ? "right" : "down";
      }
      const adapter = resolveAdapterOrDie(settings.adapter);
      const key = serializeIdentity({ backend: backend.id, workspace: root.workspace, handle: name });
      const handle = backend.spawn(adapter, { key, cwd, name, workspace: root.workspace, group: root.tabId, split, orchDir: orchDir(), model: settings.model ?? undefined, tools: settings.tools });
      const identityKey = serializeIdentity(backend.mintIdentity(handle));
      recordSpawned(identityKey, { adapter: settings.adapter, model: settings.model ?? undefined, backend: backend.id, workspace: root.workspace, handle: String(handle), cwd, worktree: settings.worktree ? cwd : undefined, branch: settings.worktree ? `orch/${name}` : undefined, owner: selfActor() ?? undefined });
      created.push({ key: identityKey, pane: String(handle), name });
    } catch (error: unknown) {
      process.stderr.write(`warning: could not place agent #${i}: ${errorMessage(error)}\n`);
    }
  }
}

async function reportSpawnResults(settings: SpawnSettings, root: SpawnRoot, created: CreatedAgent[], backend: Backend): Promise<void> {
  if (!settings.json) {
    for (const agent of created) process.stdout.write(`${agent.pane}  ${agent.name}  [${root.tabLabel}]  ${settings.cmd}\n`);
    process.stdout.write(`\nSpawned ${created.length} named agent(s) on tab "${root.tabLabel}" (no focus stolen).\n`);
    printLayout(root.root, backend, "\nFinal tiling:");
  }
  if (resolveAdapterOrDie(settings.adapter).caps.steer === "inbox") await awaitBridgeRegistration(created, settings.json);
  if (settings.model) await pinModels(created, settings.model);
  if (settings.json) process.stdout.write(JSON.stringify({ backend: settings.backend, tab: root.tabLabel, agents: created }) + "\n");
  else process.stdout.write(`\n'orch status' shows the fleet.\n`);
}

async function executeSpawn(settings: SpawnSettings): Promise<void> {
  const backend = resolveBackend({ configured: settings.backend });
  // A backend without group creation has no panes to tile into: spawn detached.
  if (!backend.createGroup) {
    executeDetachedSpawn(settings, backend);
    return;
  }
  const workspace = resolveSpawnWorkspace(settings.workspace);
  assertSpawnCapacity(settings, workspace, settings.n);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const root = createSpawnRoot(settings, workspace, backend, adapter);
  const created: CreatedAgent[] = [];
  recordSpawned(root.key, { adapter: settings.adapter, model: settings.model ?? undefined, backend: backend.id, workspace, handle: root.root, cwd: root.rootCwd, worktree: settings.worktree ? root.rootCwd : undefined, branch: settings.worktree ? `orch/${root.rootName}` : undefined, owner: selfActor() ?? undefined });
  created.push({ key: root.key, pane: root.root, name: root.rootName });
  launchAdditionalAgents(settings, root, created, backend);
  await reportSpawnResults(settings, root, created, backend);
}

export async function cmdSpawn(args: string[]) {
  await executeSpawn(resolveSpawnSettings(parseSpawnFlags(args)));
}

export async function cmdTile(args: string[]) {
  const json = args.includes("--json");
  let cwd = process.cwd();
  let cmd = "";
  let commandFlag = false;
  let name: string | null = null;
  let modelFlag: string | undefined;
  let adapterFlag: string | undefined;
  let backendFlag: string | undefined;
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--cwd") cwd = args[++i]!;
    else if (a === "--cmd") { cmd = args[++i]!; commandFlag = true; }
    else if (a === "--name") name = args[++i]!;
    else if (a === "--model") modelFlag = args[++i]!;
    else if (a === "--agent" || a === "--adapter") adapterFlag = args[++i]!;
    else if (a === "--backend") backendFlag = args[++i]!;
    else if (a === "--json") continue;
    else positional.push(a!);
  }
  const config = loadConfig(orchDir());
  const { adapter, model } = resolveAgentSettings({ adapterFlag, backendFlag, modelFlag }, config);
  const selectedBackend = resolveBackend({ explicit: backendFlag ?? null, configured: config.defaults.backend ?? null });
  if (!selectedBackend.panes) die(`orch tile requires a pane-capable backend; ${selectedBackend.id} has no panes to tile.`);
  resolveAdapterOrDie(adapter);
  if (!commandFlag) cmd = adapterCommand(adapter, config);
  const target = positional[0];
  if (!target) die("usage: orch tile <tab-or-pane> [--name <name>] [--cmd <command>] [--cwd <path>] [--model <provider/model[:thinking]>");

  const tab = resolveTab(target);
  const refPane = selectedBackend.inventory?.().find((item) => item.group === tab.id)?.handle;
  if (refPane === undefined) die(`No panes found on group "${tab.id}".`);

  let layout;
  try {
    layout = paneLayout(refPane, selectedBackend);
  } catch (e: unknown) {
    die(`could not read layout for ${JSON.stringify(refPane)}: ${errorMessage(e)}`);
  }
  const autoName = name ?? `tile-${layout.panes.length + 1}`;

  const workspace = selectedBackend.inventory?.().find((item) => item.handle === refPane)?.workspace;
  if (!workspace) die(`Could not determine workspace for pane ${JSON.stringify(refPane)}.`);
  assertSpawnCapacity(config, workspace, 1);
  const key = serializeIdentity({ backend: selectedBackend.id, workspace, handle: autoName });
  const selectedAdapter = resolveAdapterOrDie(adapter);
  let handle: BackendHandle;
  try {
    handle = selectedBackend.spawn(selectedAdapter, { key, cwd, name: autoName, workspace, group: tab.id, split: "down", orchDir: orchDir(), model: model ?? undefined });
  } catch (e: unknown) {
    die(`tile failed: ${errorMessage(e)}`);
  }
  const identityKey = serializeIdentity(selectedBackend.mintIdentity(handle));
  recordSpawned(identityKey, { adapter, model: model ?? undefined, backend: selectedBackend.id, workspace, handle: String(handle), cwd, owner: selfActor() ?? undefined });
  if (json) process.stdout.write(JSON.stringify({ pane: String(handle), key: identityKey, name: autoName, tab: layout.group, added: true }) + "\n");
  else {
    process.stdout.write(`Added ${String(handle)} (${autoName}) to group ${layout.group} running "${cmd}".\n`);
    printLayout(refPane, selectedBackend, "\nFinal tiling:");
  }
  if (model) await pinModels([{ key: identityKey, pane: String(handle), name: autoName }], model);
}

export function workerPrompt(prompt: string, raw: boolean, adapter: AgentAdapter | undefined, lockedCommands: readonly string[] = []): string {
  return raw ? prompt : `${workerHeaderFor(adapter, lockedCommands)}\n\n${prompt}`;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

