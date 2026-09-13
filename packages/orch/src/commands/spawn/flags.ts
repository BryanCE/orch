import { resolveSetting } from "../../settings/read.ts";
import { workerPolicyFrom, workerTools } from "../../policy/workers.ts";
import { resolveBackend } from "../../backends/registry.ts";
import { pickAdapter, resolveAdapterOrDie, resolveTuningOrDie } from "../selection.ts";
import { readFileSync } from "node:fs";
import { errorMessage } from "../../util.ts";
import { die } from "../target.ts";
import type { Backend } from "../../types/backend.ts";
import type { WorkerPolicy } from "../../types/policy.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { AgentFlags, AgentSettings } from "../../types/command.ts";
import type { ThinkingLevel } from "../../types/policy.ts";
import { adapterCommand } from "./models.ts";
import { resolveSpawnNames } from "./names.ts";
import { contextReference, readPromptFile } from "../prompt-file.ts";
import { taskWithReferences } from "../../worker-prompt.ts";


export type SpawnFlags = AgentFlags & {
  json: boolean;
  label: string;
  tabLabel: string | null;
  /** The directory the agent starts in: the spawner's own unless `--dir` names another. */
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  space: string | null;
  worktreeFlag?: boolean;
  /** Initial task each agent starts on. */
  promptFlags: string[];
  /** Paths the initial tasks are read from, or "-" for stdin. */
  promptFiles: string[];
  /** Models to pin, one for all agents or one per agent. */
  modelFlags: string[];
  /** Where the agents' context lives; each `--with` adds one. Orch checks each exists and never reads it. */
  withPaths: string[];
  tasksFile?: string;
  unknownFlags: string[];
  positional: string[];
};

function readSpawnFlag(flags: SpawnFlags, args: string[], index: number): number {
  const argument = args[index];
  switch (argument) {
    case "--tab": flags.tabLabel = args[index + 1]!; return 1;
    case "--dir": flags.cwd = args[index + 1]!; return 1;
    case "--cmd": flags.cmd = args[index + 1]!; flags.commandFlag = true; return 1;
    case "--space": flags.space = args[index + 1]!; return 1;
    case "--model": flags.modelFlags.push(args[index + 1]!); return 1;
    case "--thinking": flags.thinkingFlag = args[index + 1]!; return 1;
    case "--prompt": flags.promptFlags.push(args[index + 1]!); return 1;
    case "--file": flags.promptFiles.push(args[index + 1]!); return 1;
    case "--with": flags.withPaths.push(args[index + 1]!); return 1;
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
    space: null, promptFlags: [], promptFiles: [], modelFlags: [], withPaths: [], unknownFlags: [], positional: [],
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

export interface SpawnAgentPlan {
  readonly name: string;
  readonly model: string;
  readonly thinking: ThinkingLevel;
  /** The initial task, or null when the fleet starts idle. All agents have one or none have one. */
  readonly prompt: string | null;
}

export type SpawnSettings = Omit<AgentSettings, "model" | "thinking"> & {
  tools: string | undefined;
  workers: WorkerPolicy;
  json: boolean;
  label: string;
  /** True when --tab named a tab: an existing match is joined, not recreated. */
  tabExplicit: boolean;
  /** True when the human chose the plexer: `--backend`, `ORCH_BACKEND`, or the
   *  default in `settings.json`. A chosen plexer is one orch may open a home in.
   *  A plexer orch only probed is not. */
  backendChosen: boolean;
  cwd: string;
  cmd: string;
  commandFlag: boolean;
  space: string | null;
  prefix: string;
  /** One resolved plan per agent. */
  agents: readonly SpawnAgentPlan[];
  worktree: boolean;
  unknownFlags: string[];
  fleet: OrchSettings["fleet"];
  tiling: OrchSettings["tiling"];
};

/** "One value for every agent, or exactly one per agent." Zero values yields a row of undefined. */
function perAgent<T>(flag: string, values: readonly T[], n: number): (T | undefined)[] {
  if (values.length === 0) return Array.from({ length: n }, () => undefined);
  if (values.length === 1) return Array.from({ length: n }, () => values[0]);
  if (values.length === n) return [...values];
  die(`${flag} accepts one value for all agents or exactly ${n} values`);
}

/** One task per agent, from `--tasks`, or one `--file`, or the `--prompt` values. */
function resolveSpawnPrompts(flags: SpawnFlags, n: number): (string | null)[] {
  const sources = [flags.tasksFile !== undefined, flags.promptFiles.length > 0, flags.promptFlags.length > 0].filter(Boolean);
  if (sources.length > 1) die("give the task as --prompt, --file or --tasks, not more than one");
  if (flags.tasksFile !== undefined) return readTasksFile(flags.tasksFile, n);
  if (flags.promptFiles.length > 0) {
    if (flags.promptFiles.filter((file) => file === "-").length > 1) die("--file - reads stdin once; name it at most once");
    const cache = new Map<string, string>();
    return perAgent("--file", flags.promptFiles, n).map((file) => {
      if (file === undefined) return null;
      const cached = cache.get(file);
      if (cached !== undefined) return cached;
      const text = readPromptFile(file);
      cache.set(file, text);
      return text;
    });
  }
  return perAgent("--prompt", flags.promptFlags, n).map((prompt) => prompt ?? null);
}

function readTasksFile(source: string, n: number): string[] {
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(source, "utf8")); } catch (error: unknown) { die(`could not read tasks file: ${errorMessage(error)}`); }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string") || parsed.length !== n) die(`--tasks must be a JSON array of exactly ${n} strings`);
  return parsed.filter((item): item is string => typeof item === "string");
}

function resolveSpawnBackend(flags: AgentFlags, settings: OrchSettings): Backend {
  try {
    return resolveBackend({
      explicit: flags.backendFlag ?? process.env.ORCH_BACKEND ?? null,
      configured: settings.defaults.backend ?? null,
    });
  } catch (error: unknown) {
    die(errorMessage(error));
  }
}

export function resolveSpawnAgentSettings(flags: AgentFlags, settings: OrchSettings): AgentSettings {
  const adapter = pickAdapter(flags, settings);
  const tuning = resolveTuningOrDie(flags, settings, adapter, null);
  const backend = resolveSpawnBackend(flags, settings);
  return {
    adapter,
    backend: backend.id,
    model: tuning.model,
    thinking: tuning.thinking,
    preferredModels: settings.models.preferred[adapter] ?? [],
  };
}

export function resolveSpawnSettings(flags: SpawnFlags, settings: OrchSettings): SpawnSettings {
  const adapter = pickAdapter(flags, settings);
  const backend = resolveSpawnBackend(flags, settings);
  const worktree = resolveSetting({ flag: flags.worktreeFlag, env: "ORCH_WORKTREE", settings: settings.defaults.worktree, fallback: settings.defaults.worktree });
  if (flags.unknownFlags.length > 0) die(`Unknown flag ${flags.unknownFlags.join(", ")}.`);
  // The names ARE the positional arguments, and how many you give is how many
  // agents you get. Resolving here means a nameless or malformed spawn is refused
  // before a group, a place, or a worktree exists.
  let names: string[];
  try { names = resolveSpawnNames(flags.positional); }
  catch (error: unknown) {
    die(`${errorMessage(error)}\nusage: orch spawn <name> [<name>...] [--tab <label>] [--dir <path>] [--cmd <command>] [--model <model[:thinking]>] [--thinking <level>] [--agent <adapter>] [--backend <backend>] [--prompt <text>] [--file <path>|-] [--with <path>]... [--worktree]`);
  }
  const n = names.length;
  const references = flags.withPaths.map(contextReference);
  const prompts = resolveSpawnPrompts(flags, n).map((prompt) => prompt === null ? null : taskWithReferences(prompt, references));
  const models = perAgent("--model", flags.modelFlags, n);
  const tunings = models.map((model) => resolveTuningOrDie({ ...flags, modelFlag: model }, settings, adapter, null));
  const agents = names.map((name, index) => {
    const tuning = tunings[index];
    const prompt = prompts[index];
    if (tuning === undefined || prompt === undefined) die("could not resolve spawn agent plan");
    return { name, model: tuning.model, thinking: tuning.thinking, prompt };
  });
  resolveAdapterOrDie(adapter);
  const preferredModels = settings.models.preferred[adapter] ?? [];
  const tools = workerTools(settings);
  const workers = workerPolicyFrom(settings);
  const firstAgent = agents[0];
  if (firstAgent === undefined) die("spawn requires at least one agent");
  const cmd = flags.commandFlag
    ? flags.cmd
    : adapterCommand(adapter, settings, { model: firstAgent.model, thinking: firstAgent.thinking, preferredModels });
  // --tab names the TAB; the positionals name the AGENTS. A tab left unnamed
  // borrows the first agent's name, but the two are never conflated.
  const tabLabel = flags.tabLabel ?? names[0] ?? flags.label;
  const prefix = names[0] ?? flags.label;
  const backendChosen = (flags.backendFlag ?? process.env.ORCH_BACKEND ?? settings.defaults.backend ?? null) !== null;
  return { adapter, backend: backend.id, preferredModels, tools, workers, json: flags.json, label: tabLabel, tabExplicit: flags.tabLabel !== null, backendChosen, cwd: flags.cwd, cmd, commandFlag: flags.commandFlag, space: flags.space, prefix, agents, worktree, unknownFlags: flags.unknownFlags, fleet: settings.fleet, tiling: settings.tiling };
}

/** Live agents per space. Both maps are keyed by the minted id: a space is an
 *  environment axis composed onto the agent, and presence answers for the same
 *  identity — joining the two on a handle is what lost the detached fleet. */
