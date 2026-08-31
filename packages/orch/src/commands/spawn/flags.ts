import { orchDir } from "../../presence/store.ts";
import { loadConfig, resolveSetting } from "../../config.ts";
import { workerPolicyFrom, workerTools } from "../../policy/workers.ts";
import { resolveAdapterOrDie } from "../selection.ts";
import { readFileSync } from "node:fs";
import { errorMessage } from "../../util.ts";
import { die } from "../target.ts";
import type { WorkerPolicy } from "../../types/policy.ts";
import type { OrchConfig } from "../../types/config.ts";
import type { AgentFlags, AgentSettings } from "../../types/command.ts";
import { adapterCommand, resolveAgentSettings } from "./models.ts";
import { resolveSpawnNames } from "./names.ts";


export type SpawnFlags = AgentFlags & {
  json: boolean;
  label: string;
  tabLabel: string | null;
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  space: string | null;
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

export type SpawnSettings = AgentSettings & {
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

export function resolveSpawnSettings(flags: SpawnFlags): SpawnSettings {
  const config = loadConfig(orchDir());
  const settings = resolveAgentSettings(flags, config);
  const worktree = resolveSetting({ flag: flags.worktreeFlag, env: "ORCH_WORKTREE", config: config.defaults.worktree, fallback: config.defaults.worktree });
  if (flags.unknownFlags.length > 0) die(`Unknown flag ${flags.unknownFlags.join(", ")}.`);
  // The names ARE the positional arguments, and how many you give is how many
  // panes you get. Resolving here means a nameless or malformed spawn is refused
  // before a tab, a pane, or a worktree exists.
  let names: string[];
  try { names = resolveSpawnNames(flags.positional); }
  catch (error: unknown) {
    die(`${errorMessage(error)}\nusage: orch spawn <name> [<name>...] [--tab <label>] [--cwd <path>] [--cmd <command>] [--model <model[:thinking]>] [--thinking <level>] [--agent <adapter>] [--backend <backend>] [--prompt <text>] [--worktree]`);
  }
  const n = names.length;
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

/** Live agents per space. Both maps are keyed by the minted id: a space is an
 *  environment axis composed onto the agent, and presence answers for the same
 *  identity — joining the two on a pane key is what lost the detached fleet. */
