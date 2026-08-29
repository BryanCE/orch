import { bridgeRegistered, loadPresence, orchDir, recordSpawned, spawnedRecords, type PresenceEntry } from "../presence/store.ts";
import { recordGrantRequest, spendGrant, type GrantAction } from "../store/grant-rows.ts";
import type { SpawnedRecord } from "../store/spawned-rows.ts";
import { loadConfig, resolveSetting, type OrchConfig } from "../config.ts";
import { assertNameFree, assertValidAgentName } from "../policy/name.ts";
import { agentIdentityEnv, spawnerIdentity, worktreeEnv } from "../policy/spawner.ts";
import { assertModelAllowed } from "../policy/model.ts";
import { resolveThinking, splitThinkingSuffix, type ThinkingLevel } from "../policy/thinking.ts";
import { workerPolicyFrom, workerTools, type WorkerPolicy } from "../policy/workers.ts";
import { resolveAdapter as resolveRegisteredAdapter } from "../adapters/registry.ts";
import type { AdapterId, AgentAdapter } from "../adapters/adapter.ts";
import { repickCommand } from "../adapters/prerequisites.ts";
import { workerHeaderFor, type WorkerHeaderContext } from "../worker-prompt.ts";
import { mintAgentId, serializeIdentity, tryParseIdentity } from "../backends/identity.ts";
import type { Backend, BackendGroup, BackendHandle, BackendId, GroupLayoutRole } from "../backends/backend.ts";
import { detachedBackend, resolveBackend } from "../backends/registry.ts";
import { nextTilePlacement, planTilePlacement, readGroupLayout, type TileFirstSplit, type TilePlacement } from "../backends/tiling.ts";
import { createAgentWorktree } from "../worktree.ts";
import { refreshStaleShims } from "../doctor/runner.ts";
import * as path from "node:path";
import { readFileSync } from "node:fs";
import { dispatchToAgent } from "./control.ts";
import { errorMessage, sleep } from "../util.ts";
import { callDaemon, daemonOutage } from "./daemon.ts";
import { rpcHello } from "../daemon/rpc.ts";
import { registerSpawnedAgent } from "../store/spawn-registration.ts";
import { callerOwnerToken, callerSpace, die } from "./target.ts";
import { resolveTab } from "./panes.ts";
import { commandLogger } from "./logging.ts";

function spawnLogger(key?: string) {
  const agentId = key ? tryParseIdentity(key)?.id : undefined;
  return agentId ? commandLogger().forAgent(agentId) : commandLogger();
}

/** Wait for every agent to write its bridge dir; returns only the ones that registered. */
async function awaitBridgeRegistration(created: { key: string; pane: string; name: string }[], json = false): Promise<CreatedAgent[]> {
  const pending = new Map(created.map((c) => [c.key, c]));
  const registered = new Map<string, CreatedAgent>();
  const deadline = Date.now() + 60_000;
  if (!json) process.stdout.write("\nWaiting for agents to register:\n");
  while (pending.size && Date.now() < deadline) {
    for (const [key, agent] of [...pending]) {
      if (bridgeRegistered(key)) {
        pending.delete(key);
        registered.set(key, agent);
        if (!json) process.stdout.write(`  ok      ${agent.pane}  ${agent.name}\n`);
      }
    }
    await sleep(500);
  }
  // A stalled agent is a failed spawn: it holds its name and answers no control
  // traffic. Reporting it on stderr while exiting 0 is what let a scripted fleet
  // launch read as success and dispatch into panes that never came up.
  for (const agent of pending.values()) {
    spawnLogger(agent.key).error("spawn.stalled", { handle: agent.pane, name: agent.name });
    process.stderr.write(`  STALLED ${agent.pane}  ${agent.name} - no bridge dir; try: orch restart ${agent.name}\n`);
  }
  if (pending.size) process.exitCode = 1;
  return [...registered.values()];
}

/** A launch that placed fewer agents than were asked for FAILED; a warning line
 *  and a zero exit is how "spawn 3" quietly delivering 1 read as success. */
function reportShortfall(requested: number, placed: number): void {
  if (placed >= requested) return;
  commandLogger().error("spawn.shortfall", { requested, placed });
  process.stderr.write(`placed ${placed} of ${requested} requested agent(s)\n`);
  process.exitCode = 1;
}

/** How many agents actually came up, or `null` when the harness cannot say.
 *  A harness with no start-up presence signal leaves a launch unverifiable, and reporting
 *  an unverified launch as a success is how a fleet of ghosts reads as a healthy one. */
async function confirmAgentsCameUp(adapter: AgentAdapter, created: CreatedAgent[], json: boolean): Promise<CreatedAgent[] | null> {
  if (adapter.presenceRegistration) {
    return await awaitBridgeRegistration(created, json);
  }
  commandLogger().warn("spawn.unverified", { adapter: adapter.id, count: created.length });
  process.stderr.write(`warning: ${adapter.id} writes no presence record at session start - ${created.length} agent(s) UNVERIFIED; check 'orch status' before dispatching\n`);
  return null;
}

function printLayout(backend: Backend, group: string, header: string) {
  const role = backend.groupLayout;
  if (!role) return;
  const layout = readGroupLayout(role, group);
  const names = new Map((backend.paneInventory?.list() ?? []).map((target) => [String(target.handle), target.name ?? "-"]));
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

export class SpawnRefusalError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SpawnRefusalError";
  }
}

export function resolveAdapterOrDie(id: string): AgentAdapter {
  try {
    return resolveRegisteredAdapter(id);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
}

/** The command one harness launches under, built by that harness's own adapter. `launch` carries
 *  what this launch selected — the model it starts on and the quicklist its picker shows — so a
 *  previewed command is the command the backend actually runs. */
export function adapterCommand(
  adapter: string,
  config = loadConfig(orchDir()),
  launch: { model?: string; thinking?: ThinkingLevel; preferredModels?: readonly string[] } = {},
): string {
  const resolved = resolveAdapterOrDie(adapter);
  const opts = { ...launch, tools: workerTools(config), workers: workerPolicyFrom(config) };
  return resolved.workerLaunch?.restrictedInteractiveCmd(opts) ?? resolved.interactiveCmd(opts);
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
export async function pinModels(
  created: { key: string; pane: string; name: string }[],
  model: string,
  thinking?: ThinkingLevel,
): Promise<string[]> {
  // The pin must carry the SAME thinking effort the launch resolved. Pinning the
  // bare model re-set the harness's model and dropped the level, so the agent fell
  // back to the harness's own default and the fleet silently ran at that effort
  // however `defaults.thinking` was configured. TASKS/12-thinking.md slice 3:
  // spawn, `orch model` and reset's re-pin all route through the same resolution.
  // `model:level` is the control plane's wire spelling, never a stored shape.
  const spec = thinking === undefined ? model : `${model}:${thinking}`;
  const results = await Promise.all(created.map(async ({ key, pane, name }) => ({
    pane,
    name,
    failure: await deliverModelPin(key, spec),
  })));
  const warnings = results
    .filter((result) => result.failure)
    .map((result) => `could not pin ${result.name} (${result.pane}) to ${spec}: ${result.failure}`);
  for (const warning of warnings) {
    commandLogger().warn("spawn.model-pin-failed", { warning });
    process.stderr.write(`warning: ${warning}\n`);
  }
  return warnings;
}

export interface AgentFlags {
  adapterFlag?: string;
  backendFlag?: string;
  modelFlag?: string;
  thinkingFlag?: string;
}

export interface AgentSettings {
  adapter: AdapterId;
  backend: BackendId;
  model: string;
  thinking: ThinkingLevel;
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
 *  Every path that starts a clean session (spawn, tile, reset) resolves it here. Spawn
 *  validates the model only after policy accepts; the launch hands this string to the harness CLI, whose own
 *  resolver fuzzy-matches a shorthand onto whatever registry entry shares a prefix. A
 *  model the harness does not list must never reach that resolver. */
export function launchModel(flags: AgentFlags, config: OrchConfig, adapter: AgentAdapter): string {
  const model = requestedModel(flags) ?? config.defaults.models[adapter.id] ?? "";
  if (!model) die(`no model selected for ${adapter.id} - pass --model <model[:thinking]>, or record one with: ${repickCommand(adapter.id)}`);
  return splitThinkingSuffix(model).bare;
}

/** Enforce orch's model policy at the command's side-effect gate. */
export function assertLaunchModelAllowed(adapterId: AdapterId, model: string): void {
  const adapter = resolveAdapterOrDie(adapterId);
  try {
    assertModelAllowed(orchDir(), adapter, model);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
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
    thinking: resolveThinking({ flag: flags.thinkingFlag, modelSuffix: splitThinkingSuffix(requestedModel(flags) ?? config.defaults.models[adapter] ?? "").thinking, harness: adapter, config }),
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
  space: string | null;
  spawnCapFlag?: number;
  worktreeFlag?: boolean;
  /** Initial task for a detached agent, which runs it and exits. */
  promptFlags: string[];
  tasksFile?: string;
  unknownFlags: string[];
  positional: string[];
};

function readSpawnFlag(flags: SpawnFlags, args: string[], index: number): number {
  const argument = args[index];
  switch (argument) {
    case "--tab": flags.tabLabel = args[index + 1]!; return 1;
    case "--cwd": flags.cwd = args[index + 1]!; return 1;
    case "--cmd": flags.cmd = args[index + 1]!; flags.commandFlag = true; return 1;
    case "--space": flags.space = args[index + 1]!; return 1;
    case "--model": flags.modelFlag = args[index + 1]!; return 1;
    case "--thinking": flags.thinkingFlag = args[index + 1]!; return 1;
    case "--prompt": flags.promptFlags.push(args[index + 1]!); return 1;
    case "--tasks": flags.tasksFile = args[index + 1]!; return 1;
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
    space: null, promptFlags: [], unknownFlags: [], positional: [],
  };
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--worktree" || args[index] === "--json") { if (args[index] === "--worktree") flags.worktreeFlag = true; continue; }
    const consumed = readSpawnFlag(flags, args, index);
    if (consumed >= 0) { index += consumed; continue; }
    if (args[index]!.startsWith("--")) flags.unknownFlags.push(args[index]!);
    else flags.positional.push(args[index]!);
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
  /** True when the caller named the plexer. A configured default is not a request
   *  to enter a plexer this process is not already in. */
  backendExplicit: boolean;
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  space: string | null;
  prefix: string;
  /** One name per pane, or a single name that numbers into "<prefix>-<n>". */
  names: string[];
  n: number;
  worktree: boolean;
  /** Initial tasks, mapped one-to-one for pane agents; headless agents run their task and exit. */
  prompts: readonly string[];
  unknownFlags: string[];
  fleet: OrchConfig["fleet"];
  tiling: OrchConfig["tiling"];
};

function resolveSpawnSettings(flags: SpawnFlags): SpawnSettings {
  const config = loadConfig(orchDir());
  const settings = resolveAgentSettings(flags, config);
  const spawnCap = resolveSetting({ flag: flags.spawnCapFlag, env: "ORCH_SPAWN_CAP", config: config.fleet.spawn_cap, fallback: config.fleet.spawn_cap });
  const worktree = resolveSetting({ flag: flags.worktreeFlag, env: "ORCH_WORKTREE", config: config.defaults.worktree, fallback: config.defaults.worktree });
  if (!Number.isInteger(spawnCap) || spawnCap < 1) die(`Invalid spawn cap ${spawnCap}; expected a positive integer.`);
  if (flags.unknownFlags.length > 0) die(`Unknown flag ${flags.unknownFlags.join(", ")}.`);
  // The names ARE the positional arguments, and how many you give is how many
  // panes you get. Resolving here means a nameless or malformed spawn is refused
  // before a tab, a pane, or a worktree exists.
  let names: string[];
  try { names = resolveSpawnNames(flags.positional); }
  catch (error: unknown) {
    die(`${errorMessage(error)}\nusage: orch spawn <name> [<name>...] [--tab <label>] [--cwd <path>] [--cmd <command>] [--model <model[:thinking]>] [--thinking <level>] [--agent <adapter>] [--backend <backend>] [--prompt <text>] [--spawn-cap <N>] [--worktree]`);
  }
  const n = names.length;
  if (n > spawnCap) die(`Refusing to spawn ${n} panes - cap is ${spawnCap}.`);
  if (flags.promptFlags.length > 1 && flags.promptFlags.length !== n) die(`--prompt accepts one value for all agents or exactly ${n} values`);
  let prompts: string[] = [...flags.promptFlags];
  if (flags.tasksFile) {
    let parsed: unknown;
    try { parsed = JSON.parse(readFileSync(flags.tasksFile, "utf8")); } catch (error: unknown) { die(`could not read tasks file: ${errorMessage(error)}`); }
    if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string") || parsed.length !== n) die(`--tasks must be a JSON array of exactly ${n} strings`);
    prompts = parsed.filter((item): item is string => typeof item === "string");
  }
  if (flags.tasksFile && flags.promptFlags.length > 0) die("use --prompt or --tasks, not both");
  resolveAdapterOrDie(settings.adapter);
  const tools = workerTools(config);
  const workers = workerPolicyFrom(config);
  const cmd = flags.commandFlag
    ? flags.cmd
    : adapterCommand(settings.adapter, config, { model: settings.model, thinking: settings.thinking, preferredModels: settings.preferredModels });
  // --tab names the TAB; the positionals name the AGENTS. A tab left unnamed
  // borrows the first agent's name, but the two are never conflated.
  const tabLabel = flags.tabLabel ?? names[0] ?? flags.label;
  const prefix = names[0] ?? flags.label;
  const backendExplicit = (flags.backendFlag ?? process.env.ORCH_BACKEND ?? null) !== null;
  return { ...settings, tools, workers, json: flags.json, label: tabLabel, tabExplicit: flags.tabLabel !== null, backendExplicit, cwd: flags.cwd, cmd, commandFlag: flags.commandFlag, space: flags.space, prefix, n, worktree, prompts, names, unknownFlags: flags.unknownFlags, fleet: config.fleet, tiling: config.tiling };
}

export interface CreatedAgent { key: string; pane: string; name: string }

export function liveSpawnCounts(records: Map<string, SpawnedRecord>, presence: Map<string, PresenceEntry>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const [key] of records) {
    const entry = presence.get(key);
    const space = records.get(key)?.space;
    if (!entry?.alive || typeof space !== "string") continue;
    counts.set(space, (counts.get(space) ?? 0) + 1);
  }
  return counts;
}

const SPAWN_POLICY_OFFERS = "bind the task to a live slave (orch dispatch <name>) or put it on the pack queue (orch queue add)";

/** Return a spawn policy refusal without allocating a pane, tab, worktree, or queue entry. */
export function spawnPolicyError(
  settings: Pick<OrchConfig, "fleet">,
  _space: string,
  requested: number,
  records: Map<string, SpawnedRecord>,
  presence: Map<string, PresenceEntry>,
  spawnerKey: string | null,
): string | null {
  let current = spawnerKey;
  let depth = 0;
  const seen = new Set<string>();
  while (current !== null && !seen.has(current)) {
    seen.add(current);
    const parent = records.get(current)?.spawnedBy;
    if (!parent) break;
    current = parent;
    depth++;
  }
  // A depth-two spawner may not create a depth-three child. The chain is
  // provenance, never a schema change to the recursive agent model.
  if (depth >= 2) return `maximum spawn depth is 2 (this spawner is at depth ${depth}). ${SPAWN_POLICY_OFFERS}`;

  // The pack root is the first key in the spawnedBy chain. Registry rows do
  // not necessarily contain that root (a self-registering orch has no
  // spawned row), hence the explicit +1 for the root when it is absent. A
  // caller without a reply key uses the undefined spawnedBy scope and its
  // space, which is the only scope available to a bare operator session.
  const packRoot = current;
  let live = 0;
  for (const [key] of records) {
    let root = key;
    const chain = new Set<string>();
    while (!chain.has(root)) {
      chain.add(root);
      const parent = records.get(root)?.spawnedBy;
      if (!parent) break;
      root = parent;
    }
    const samePack = spawnerKey === null
      ? records.get(key)?.space === _space && records.get(root)?.spawnedBy === undefined
      : root === packRoot;
    if (!samePack || !presence.get(key)?.alive) continue;
    live++;
  }
  if (spawnerKey === null || packRoot === null || !records.has(packRoot)) live++;
  const cap = settings.fleet.pack_cap ?? 10;
  if (live + requested > cap) {
    return `pack cap ${cap} exceeded (${live} live member${live === 1 ? "" : "s"} + ${requested} requested). ${SPAWN_POLICY_OFFERS}`;
  }
  return null;
}

function assertSpawnPolicy(settings: Pick<OrchConfig, "fleet">, space: string, requested: number): void {
  const refusal = spawnPolicyError(settings, space, requested, spawnedRecords(), loadPresence(), spawnerIdentity().key);
  if (refusal) throw new SpawnRefusalError(`spawn refused: ${refusal}`);
}

export function assertSpawnCapacity(
  settings: Pick<OrchConfig, "fleet">,
  space: string,
  requested: number,
  records: Map<string, SpawnedRecord> = spawnedRecords(),
  presence: Map<string, PresenceEntry> = loadPresence(),
): void {
  const counts = liveSpawnCounts(records, presence);
  const live = [...counts.values()].reduce((total, count) => total + count, 0);
  const spaceLive = counts.get(space) ?? 0;
  const spaceCap = settings.fleet.space_caps[space];
  if (spaceCap !== undefined && spaceLive + requested > spaceCap) {
    throw new SpawnRefusalError(`spawn refused: would put ${space} at ${spaceLive + requested}/${spaceCap} agents (${spaceLive} live + ${requested} requested; fleet.space_caps.${space})`);
  }
  const globalCap = settings.fleet.max_agents;
  if (globalCap !== undefined && live + requested > globalCap) {
    throw new SpawnRefusalError(`spawn refused: would put all spaces at ${live + requested}/${globalCap} agents (${live} live + ${requested} requested; fleet.max_agents)`);
  }
}

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
  const config = loadConfig(orchDir());
  const created: CreatedAgent[] = [];
  const names = claimSpawnNames(settings.names, space);
  for (const [index, name] of names.entries()) {
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.workspaceTrust?.preTrustWorkspace(cwd, settings.cmd);
    try {
      // ONE key per agent: mint the name-based identity BEFORE launch and pass
      // it via ORCH_AGENT_KEY, exactly like the pane paths (spawnOneIntoTab).
      // The backend records the OS pid separately for close ownership; the key
      // never encodes it, and the backend never re-mints a second identity.
      const key = serializeIdentity({ backend: backend.id, workspace: space, id: mintAgentId() });
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
        prompt: workerPrompt(settings.prompts.length === 1 ? settings.prompts[0]! : settings.prompts[index]!, false, adapter, { lockedCommands: config.locked_commands, spawnerRepliable: spawner.key !== null }),
        tools: settings.tools,
        workers: settings.workers,
      }, {}, config.timeouts.adapter_command_ms);
      // A detached agent has no pane, so its key is the handle every display uses.
      created.push({ key, pane: key, name });
      if (!settings.json) process.stdout.write(`${key}  ${name}  [${settings.backend}]\n`);
    } catch (error: unknown) {
      // Stop asking for more, but report the agents already launched: a caller told
      // only "failed" retries the whole spawn and ends up with a duplicate fleet.
      const message = errorMessage(error);
      commandLogger().error("spawn.failed", { backend: settings.backend, name, error: message });
      process.stderr.write(`${settings.backend} spawn failed for ${name}: ${message}\n`);
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

/** Exactly what opening a space for this fleet would do. Every field the
 *  human must see is here: it is both what they read and what the grant is
 *  bound to, so the two can never describe different actions. */
function newSpaceAction(settings: SpawnSettings, backend: Backend): GrantAction {
  return {
    kind: "spawn.new-space",
    params: { plexer: backend.id, cwd: settings.cwd, panes: String(settings.n), name: settings.prefix },
  };
}

/** Opening a space puts a window on the human's screen, so a caller with no
 *  space of its own may not take one unasked. There is no flag to pass here:
 *  a flag is typed by whoever runs the command, which is the agent. */
function assertNewSpaceGranted(settings: SpawnSettings, backend: Backend, callerAgentId: string | null): void {
  const action = newSpaceAction(settings, backend);
  if (spendGrant(orchDir(), action, callerAgentId)) return;
  const request = recordGrantRequest(orchDir(), action, callerAgentId);
  die(`orch is not running inside a ${backend.id} pane, so this spawn would open a NEW ${backend.id} space.\n`
    + `Ask the user to approve it in another terminal:\n\n    orch grant ${request.id}\n\n`
    + `then retry this exact command. Or pass --space <id> to place the fleet in an open space,`
    + ` or --backend headless with --prompt to launch detached.`);
}

/** The space this fleet lives in: the one the caller is sitting in, else one
 *  orch opens for itself, named for the project it was invoked from. A caller
 *  outside the plexer owns no space, and helping itself to an existing one
 *  puts orch's agents in another person's space. */
function resolveSpawnSpace(settings: SpawnSettings, backend: Backend, callerAgentId: string | null): string {
  const existing = settings.space ?? callerSpace();
  if (existing) return existing;
  // Whether this environment can hold a space of its own is read from the COMPOSED
  // ROLE, never from whether a method happens to exist (TASKS/02-scope.md E13).
  const home = backend.spaceHome;
  if (!home) {
    die(`backend ${backend.id} cannot open a space of its own. Pass --space <id>, or --backend headless with --prompt to launch detached.`);
  }
  assertNewSpaceGranted(settings, backend, callerAgentId);
  try {
    return home.create({ kind: "space", id: path.basename(settings.cwd) }, { cwd: settings.cwd, label: path.basename(settings.cwd) }).coordinate;
  } catch (error: unknown) {
    die(`could not open a space for this fleet: ${errorMessage(error)}`);
  }
}

export interface TabSpawnSpec {
  backend: Backend;
  adapter: AgentAdapter;
  adapterId: AdapterId;
  name: string;
  cwd: string;
  space: string;
  group: string;
  model: string;
  /** Thinking effort selected for this launch. */
  thinking?: ThinkingLevel;
  /** The quicklist this harness's own picker/cycle is given; never a launch gate. */
  preferredModels: readonly string[];
  /** Where the pane lands in the group, from the tiling planner. */
  placement?: TilePlacement;
  /** Existing pane to launch into (fresh tab root). */
  intoPane?: BackendHandle;
  /** The identity already stamped into `intoPane`'s environment when the pane was
   *  opened ahead of the launch. ONE key per agent: the pane's env and the record
   *  must name the same id, so a pre-opened pane hands its key in rather than
   *  letting the launch mint a second one. */
  key?: string;
  env?: Readonly<Record<string, string>>;
  tools?: string;
  /** What this worker may load; absent lets the adapter apply no policy. */
  workers?: WorkerPolicy;
  /** Verbatim launch command from `--cmd`; absent lets the adapter build it. */
  cmd?: string;
  worktree?: string;
  branch?: string;
  /** Hello-registered id of the session performing this launch. */
  spawnerAgentId?: string | null;
}

// The single spawn-into-a-tab pipeline shared by `orch spawn` (additional panes)
// and `orch tile`. ONE key per agent: the identity is minted before launch and
// passed via ORCH_AGENT_KEY — the name and the backend pane handle are recorded
// beside it as plain fields, never folded into it. The caller owns error policy
// (warn-and-continue vs die); this throws on backend failure.
export function spawnOneIntoTab(spec: TabSpawnSpec): CreatedAgent {
  assertNameFree(spec.name, spec.space);
  const key = spec.key ?? serializeIdentity({ backend: spec.backend.id, workspace: spec.space, id: mintAgentId() });
  const spawner = spawnerIdentity();
  const env = spec.env ?? { ...agentIdentityEnv(spec.name, spawner), ...worktreeEnv(spec.worktree, spec.branch), ORCH_AGENT_KEY: key, ORCH_DIR: orchDir() };
  let pane: BackendHandle;
  if (spec.placement) {
    if (!spec.backend.paneHost) throw new Error("backend has no pane host");
    pane = spec.backend.paneHost.open({ cwd: spec.cwd, workspace: spec.space, group: spec.group, split: spec.placement.split, targetPane: spec.placement.targetPane, env }).handle;
  } else {
    pane = spec.intoPane;
  }
  let handle: BackendHandle;
  try {
    handle = spec.backend.spawn(spec.adapter, {
      key, env, cwd: spec.cwd, name: spec.name, workspace: spec.space, group: spec.group,
      intoPane: pane, orchDir: orchDir(), model: spec.model, preferredModels: spec.preferredModels,
      tools: spec.tools, workers: spec.workers, cmd: spec.cmd,
    });
  } catch (error: unknown) {
    if ((spec.placement !== undefined || spec.intoPane !== undefined) && spec.backend.paneHost) {
      try { spec.backend.paneHost.close(pane); } catch { /* best effort */ }
    }
    throw error;
  }
  recordSpawned(key, {
    adapter: spec.adapterId,
    model: spec.model,
    backend: spec.backend.id,
    space: spec.space,
    handle: String(handle),
    cwd: spec.cwd,
    worktree: spec.worktree,
    branch: spec.branch,
    owner: callerOwnerToken(),
    spawnedBy: spec.spawnerAgentId ?? undefined,
    spawnedByLabel: spawner.label,
  });
  registerSpawnedAgent(orchDir(), {
    key, harnessId: spec.adapterId, backendId: spec.backend.id, pane: spec.backend.paneInventory !== null,
    handle: String(handle), cwd: spec.cwd, name: spec.name, model: spec.model,
    spawner: spec.spawnerAgentId ?? null,
    worktree: spec.worktree && spec.branch ? { path: spec.worktree, branch: spec.branch } : undefined,
  });
  return { key, pane: String(handle), name: spec.name };
}

/** Add one agent to a group at the spot the planner picks for it against the
 *  group's live geometry. This is the whole of `orch tile`, and growing a fleet
 *  is tiling one agent at a time — the balance only holds while every pane is
 *  placed by the same planner reading the same layout. */
export function tileAgentIntoGroup(spec: Omit<TabSpawnSpec, "placement">, firstSplit: TileFirstSplit, role: GroupLayoutRole): CreatedAgent {
  return spawnOneIntoTab({ ...spec, placement: nextTilePlacement(role, spec.group, firstSplit) });
}

/** Tile one of this launch's named agents, in its own worktree when asked. */
function placeAgent(settings: SpawnSettings, name: string, space: string, group: string, backend: Backend, spawnerAgentId: string | null, role: GroupLayoutRole): CreatedAgent {
  const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
  return tileAgentIntoGroup({
    backend,
    adapter: resolveAdapterOrDie(settings.adapter),
    adapterId: settings.adapter,
    name,
    cwd,
    space,
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

/** Fill a group with named agents. A pane that fails to come up is named and the
 *  rest still launch — a fleet short one worker beats no fleet. */
function growFleetIntoGroup(settings: SpawnSettings, space: string, group: string, backend: Backend, names: readonly string[], spawnerAgentId: string | null, role: GroupLayoutRole): CreatedAgent[] {
  const created: CreatedAgent[] = [];
  for (const name of names) {
    try {
      created.push(placeAgent(settings, name, space, group, backend, spawnerAgentId, role));
    } catch (error: unknown) {
      const message = errorMessage(error);
      commandLogger().warn("spawn.place-failed", { backend: backend.id, name, error: message });
      process.stderr.write(`warning: could not place agent ${name}: ${message}\n`);
    }
  }
  return created;
}

/** Find a tab by id or label in the target space, for `spawn --tab <existing>`. */
function findGroupInSpace(backend: Backend, space: string, target: string): BackendGroup | undefined {
  return [...(backend.groupHome?.list() ?? [])].find((group) =>
    (group.id === target || group.label === target) && (group.workspace === null || group.workspace === space));
}

/**
 * The names this launch will use. Naming an agent is part of CREATING it
 * (`TASKS/02-scope.md` F4): the positional arguments ARE the names, one per pane,
 * and how many you give is how many panes you get. There is no default name and
 * no prefix numbering — an ordinal like `fix-1` says nothing about the slice that
 * pane holds, and renaming afterwards costs N commands and leaves the pane border
 * stale (`TASKS/11-usage-bugs.md` U5, U6).
 *
 * Pure: it validates the argument list and nothing else, so a refusal happens
 * before any tab, pane, or worktree exists.
 */
export function resolveSpawnNames(positional: readonly string[]): string[] {
  if (positional.length === 0) {
    throw new SpawnRefusalError("orch spawn <name> [<name>...]: every agent must be named at creation; naming is part of creating it.");
  }
  for (const candidate of positional) {
    // A count is not a name. `orch spawn 4` used to mean four ordinal-named panes;
    // it now names nothing, and a nameless pane is what this refusal exists to stop.
    if (/^\d+$/.test(candidate)) {
      throw new SpawnRefusalError(`"${candidate}" is a count, not a name; give one name per agent: orch spawn <name> [<name>...]`);
    }
  }
  const seen = new Set<string>();
  for (const candidate of positional) {
    if (seen.has(candidate)) throw new SpawnRefusalError(`duplicate name "${candidate}"; every agent needs its own name.`);
    seen.add(candidate);
  }
  try {
    for (const name of positional) assertValidAgentName(name);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
  return [...positional];
}

/** Assert every already-resolved name is free in this space, before anything
 *  is created. Separate from resolution because freeness reads live state. */
export function claimSpawnNames(requested: readonly string[], space: string): string[] {
  const names = resolveSpawnNames(requested);
  try {
    for (const name of names) assertNameFree(name, space);
  } catch (error: unknown) {
    throw new SpawnRefusalError(errorMessage(error));
  }
  return names;
}

/** Spawn every requested agent into an already-open tab, balancing as it fills. */
async function spawnIntoExistingTab(settings: SpawnSettings, group: BackendGroup, space: string, backend: Backend, names: readonly string[], spawnerAgentId: string | null, role: GroupLayoutRole): Promise<void> {
  const created = growFleetIntoGroup(settings, space, group.id, backend, names, spawnerAgentId, role);
  await reportSpawnResults(settings, group.id, group.label ?? group.id, created, backend);
}

/** Announce a fleet whose control plane is down, and fail the launch. Panes without
 *  orchd are UNMANAGED: no steer, model pin, or result reaches them, and printing
 *  the tiling and "Spawned N agent(s)" over that silence is what sent an operator
 *  dispatching into a fleet that answered nothing. Null when orchd answers. */
async function reportControlPlaneOutage(paneCount: number): Promise<string | null> {
  const outage = await daemonOutage();
  if (!outage) return null;
  commandLogger().error("spawn.control-plane-unreachable", { panes: paneCount, error: outage });
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
  const registeredAgents = await confirmAgentsCameUp(resolveAdapterOrDie(settings.adapter), created, settings.json);
  const registered = registeredAgents?.length ?? null;
  if (registeredAgents) {
    const registeredKeys = new Set(registeredAgents.map((agent) => agent.key));
    for (const agent of created) {
      if (!registeredKeys.has(agent.key)) {
        spawnLogger(agent.key).warn("spawn.not-registered", { name: agent.name });
        process.stderr.write(`not pinned: ${agent.name} never registered\n`);
      }
    }
  }
  const warnings = await pinModels(registeredAgents ?? [], settings.model, settings.thinking);
  const dispatches: { name: string; key: string; dispatchId: string }[] = [];
  if (registeredAgents && settings.prompts.length > 0) {
    const registeredKeys = new Set(registeredAgents.map((agent) => agent.key));
    for (const [index, agent] of created.entries()) {
      if (!registeredKeys.has(agent.key)) {
        process.stdout.write(`not dispatched: ${agent.name} never registered\n`);
        continue;
      }
      const text = settings.prompts.length === 1 ? settings.prompts[0]! : settings.prompts[index]!;
      try {
        const { dispatchId } = await dispatchToAgent(agent.key, text, {
          adapter: resolveAdapterOrDie(settings.adapter),
          context: { lockedCommands: loadConfig(orchDir()).locked_commands, spawnerRepliable: true },
        });
        dispatches.push({ name: agent.name, key: agent.key, dispatchId });
        if (!settings.json) process.stdout.write(`dispatched ${agent.name} ${dispatchId}\n`);
      } catch (error: unknown) {
        const message = errorMessage(error);
        spawnLogger(agent.key).error("spawn.dispatch-failed", { name: agent.name, error: message });
        process.stderr.write(`warning: could not dispatch ${agent.name}: ${message}\n`);
      }
    }
  }
  const outage = warnings.length ? await reportControlPlaneOutage(created.length) : null;
  if (settings.json) process.stdout.write(JSON.stringify({
    backend: settings.backend,
    tab: tabLabel,
    agents: created,
    requested: settings.n,
    created: created.length,
    registered,
    warnings,
    dispatches,
    daemon: outage ?? "ok",
  }) + "\n");
  else process.stdout.write(`\n'orch status' shows the fleet.\n`);
}

/**
 * Where the fleet runs is placement, never identity (Rule 11), so a caller outside
 * the plexer is not a reason to go detached: it only means orch has no space
 * yet, and a backend that can open one of its own opens one. Detached is the answer
 * only for a backend that can neither be entered nor open a space.
 */
function spawnBackend(settings: SpawnSettings): Backend {
  const backend = resolveBackend({ configured: settings.backend });
  if (!backend.groupHome || settings.space !== null) return backend;
  if (backend.identity?.current()?.workspace) return backend;
  if (backend.spaceHome) return backend;
  commandLogger().warn("spawn.detached-fallback", { backend: backend.id });
  process.stderr.write(
    `orch is not running inside a ${backend.id} pane and ${backend.id} cannot open a space of its own - spawning detached. `
    + `Pass --space <id> to place these agents in a ${backend.id} space instead.\n`,
  );
  return detachedBackend;
}

async function executeSpawn(settings: SpawnSettings): Promise<void> {
  // Enforce provenance depth and pack size before resolving a backend or
  // allocating its space; a refused spawn creates nothing and is never queued.
  assertSpawnPolicy(settings, settings.space ?? callerSpace() ?? "", settings.n);
  assertLaunchModelAllowed(settings.adapter, settings.model);
  // Shim refresh is a launch side effect and must happen only after policy accepts,
  // and only for the harness actually being launched.
  await refreshStaleShims(orchDir(), [settings.adapter]);
  // Validate the user-supplied prefix before resolving a space or creating
  // any tab. Herdr rejects these names, so no placement side effect may precede it.
  try {
    assertValidAgentName(settings.prefix);
  } catch (error: unknown) {
    die(errorMessage(error));
  }
  const spawnerAgentId = (await rpcHello(orchDir())).id;
  const backend = spawnBackend(settings);
  // A backend without group creation has no panes to tile into: spawn detached.
  if (!backend.groupHome) {
    await executeDetachedSpawn(settings, backend, spawnerAgentId);
    return;
  }
  const groupLayout = backend.groupLayout;
  if (!groupLayout) {
    const answer = { outcome: "answer", reason: "no-environment-role", text: "this pane environment does not provide group layout" };
    if (settings.json) process.stdout.write(JSON.stringify(answer) + "\n");
    else process.stdout.write(`${answer.text}\n`);
    return;
  }
  const space = resolveSpawnSpace(settings, backend, spawnerAgentId);
  assertSpawnCapacity(settings, space, settings.n);
  const adapter = resolveAdapterOrDie(settings.adapter);
  const names = claimSpawnNames(settings.names, space);
  // `--tab <existing>` fills that tab instead of opening a new one, auto-balancing
  // as it fills, so no follow-up move/tile is needed. There is no implicit
  // "grow the fleet under this prefix" path: names are per-slice and unnumbered
  // (TASKS/02-scope.md F4), so the tab is named explicitly or it is a new one.
  const existing = settings.tabExplicit ? findGroupInSpace(backend, space, settings.label) : undefined;
  if (existing) return spawnIntoExistingTab(settings, existing, space, backend, names, spawnerAgentId, groupLayout);
  // Fresh-tab launches are deliberately phased: mint all identities/worktrees,
  // create the tab, open every pane, then launch every agent.
  const prepared: { name: string; cwd: string; key: string; env: Readonly<Record<string, string>>; branch: string | undefined; pane: BackendHandle }[] = names.map((name) => {
    const cwd = settings.worktree ? createAgentWorktree(settings.cwd, name) : settings.cwd;
    adapter.workspaceTrust?.preTrustWorkspace(cwd, settings.cmd);
    const key = serializeIdentity({ backend: backend.id, workspace: space, id: mintAgentId() });
    const spawnerInfo = spawnerIdentity();
    const env = { ...agentIdentityEnv(name, spawnerInfo), ...worktreeEnv(settings.worktree ? cwd : undefined, settings.worktree ? `orch/${name}` : undefined), ORCH_AGENT_KEY: key, ORCH_DIR: orchDir() };
    return { name, cwd, key, env, branch: settings.worktree ? `orch/${name}` : undefined, pane: undefined };
  });
  const groupHome = backend.groupHome;
  if (!groupHome) die(`backend ${backend.id} does not provide groups.`);
  let createdGroup: ReturnType<typeof groupHome.create>;
  try { createdGroup = groupHome.create({ workspace: space, cwd: prepared[0]!.cwd, label: settings.label, env: prepared[0]!.env }); }
  catch (error: unknown) { die(`group create failed: ${errorMessage(error)}`); }
  const group = createdGroup.group;
  prepared[0]!.pane = createdGroup.rootHandle;
  for (let index = 1; index < prepared.length; index++) {
    const item = prepared[index]!;
    try {
      const role = backend.groupLayout;
      if (!role) continue;
      const placement = nextTilePlacement(role, group.id, settings.tiling.first_split);
      if (!backend.paneHost) throw new Error("backend has no pane host");
      item.pane = backend.paneHost.open({ cwd: item.cwd, workspace: space, group: group.id, split: placement.split, targetPane: placement.targetPane, env: item.env }).handle;
    } catch (error: unknown) {
      const message = errorMessage(error);
      spawnLogger(item.key).warn("spawn.pane-open-failed", { name: item.name, error: message });
      process.stderr.write(`warning: could not open a pane for ${item.name}: ${message}\n`);
      item.pane = undefined;
    }
  }
  const created: CreatedAgent[] = [];
  for (const item of prepared) {
    if (item.pane === undefined) continue;
    try {
      const agent = spawnOneIntoTab({ backend, adapter, adapterId: settings.adapter, name: item.name, cwd: item.cwd, space, group: group.id, model: settings.model, thinking: settings.thinking, preferredModels: settings.preferredModels, tools: settings.tools, workers: settings.workers, cmd: settings.commandFlag ? settings.cmd : undefined, worktree: settings.worktree ? item.cwd : undefined, branch: item.branch, spawnerAgentId, intoPane: item.pane, key: item.key, env: item.env });
      created.push(agent);
    } catch (error: unknown) {
      const message = errorMessage(error);
      spawnLogger(item.key).error("spawn.launch-failed", { name: item.name, error: message });
      process.stderr.write(`warning: could not launch agent ${item.name}: ${message}\n`);
    }
  }
  if (created.length === 0) { try { groupHome.close(group.id); } catch { /* best effort */ } die("all spawns failed"); }
  await reportSpawnResults(settings, group.id, group.label ?? settings.label, created, backend);
}

export async function cmdSpawn(args: string[]) {
  await executeSpawn(resolveSpawnSettings(parseSpawnFlags(args)));
}

export async function cmdTile(args: string[]) {
  const flags = parseSpawnFlags(args);
  const config = loadConfig(orchDir());
  const { adapter, model, preferredModels } = resolveAgentSettings(flags, config);
  const selectedBackend = resolveBackend({ explicit: flags.backendFlag ?? null, configured: config.defaults.backend ?? null });
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
  // Tile CREATES an agent, so it names one too (TASKS/02-scope.md F4). A pane
  // called `tile-3` says nothing about the slice it holds.
  if (!target || !requestedName) die("usage: orch tile <tab-or-pane> <name> [--cmd <command>] [--cwd <path>] [--model <model[:thinking]>]");

  const tab = resolveTab(target);
  const role = selectedBackend.groupLayout;
  if (!role) return;
  const layout = readGroupLayout(role, tab.id);
  if (!layout) die(`Could not read layout for group "${tab.id}".`);
  const autoName = resolveSpawnNames([requestedName])[0]!;

  const space = tab.workspace ?? callerSpace();
  if (!space) die(`Could not determine the space for group "${tab.id}".`);
  assertSpawnCapacity(config, space, 1);
  const spawnerAgentId = (await rpcHello(orchDir())).id;
  let agent: CreatedAgent;
  try {
    agent = spawnOneIntoTab({
      backend: selectedBackend,
      adapter: selectedAdapter,
      adapterId: adapter,
      name: autoName,
      cwd: flags.cwd,
      space,
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

export function workerPrompt(prompt: string, raw: boolean, adapter: AgentAdapter | undefined, context: WorkerHeaderContext = {}): string {
  return raw ? prompt : `${workerHeaderFor(adapter, context)}\n\n${prompt}`;
}

/** This session's own reply address, live only when it writes presence of its own.
 *  A worker is told to `orch_send target "spawner"` on the strength of this and
 *  nothing else — never on its own harness's steer capability. */
export function spawnerIsRepliable(): boolean {
  return spawnerIdentity().key !== null;
}

