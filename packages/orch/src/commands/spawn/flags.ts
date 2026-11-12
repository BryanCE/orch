import { FORM_IDS, isFormId, type FormId } from "../../types/form.ts";
import { agentFlags, pickAdapter } from "../selection.ts";
import { resolveTuningOrDie } from "../../shared/tuning.ts";
import { parseCommand } from "../registry.ts";
import { readFileSync } from "node:fs";
import { errorMessage } from "../../util.ts";
import { die } from "../target.ts";
import type { AdapterId } from "../../types/adapter.ts";
import type { OrchSettings } from "../../types/settings.ts";
import type { AgentFlags } from "../../types/command.ts";
import type { ThinkingLevel } from "../../types/policy.ts";
import type { ContextReference } from "../../types/core.ts";
import type { ParamsOf } from "../../daemon/client/protocol.ts";
import { isWorktreeProviderId, WORKTREE_PROVIDER_IDS, type WorktreeProviderId } from "../../types/worktree.ts";
import { resolveSpawnNames } from "./names.ts";
import { contextReference, readPromptFile } from "../prompt-file.ts";
import { usageError, type CommandAt } from "../../cli/usage.ts";
import type { Invocation } from "../../cli/spec.ts";
import { taskWithReferences } from "../../worker-prompt.ts";


export type SpawnFlags = Omit<AgentFlags, "adapterFlag" | "modelFlag"> & {
  /** Where the invocation was parsed, so a refusal prints the spec's usage. */
  at: CommandAt;
  json: boolean;
  form: FormId | null;
  /** The tab `--tab` named, or null for a generated label. */
  tab: string | null;
  /** The directory the agent starts in: the spawner's own unless `--dir` names another. */
  cwd: string;
  /** The harness command `--cmd` named, or null for the adapter's own. */
  cmd: string | null;
  /** A host from settings.hosts to run the agents on, or null for this machine. */
  host: string | null;
  /** What --dir said, or null when it said nothing. */
  dirFlag: string | null;
  space: string | null;
  worktree: WorktreeFlags;
  /** Initial task each agent starts on. */
  promptFlags: string[];
  /** Paths the initial tasks are read from, or "-" for stdin. */
  promptFiles: string[];
  /** Models to pin, one for all agents or one per agent. */
  modelFlags: string[];
  /** Harnesses to launch, one for all agents or one per agent. */
  harnessFlags: string[];
  /** Where the agents' context lives; each `--with` adds one, `<name>=<path>` for one agent. Orch checks each exists and never reads it. */
  withPaths: string[];
  tasksFile?: string;
  positional: string[];
};

/** What the worktree flags of `spawn` and `tile` said. */
export interface WorktreeFlags {
  readonly wanted: boolean;
  readonly provider: string | undefined;
}

export function worktreeFlags(flags: Pick<ReturnType<typeof parseCommand>["flags"], "has" | "value">): WorktreeFlags {
  return { wanted: flags.has("--worktree"), provider: flags.value("--worktree-provider") };
}

/** Naming a provider asks for a worktree; `defaults.worktree` asks for one on every launch.
 *  orchd makes it, with its own worktree settings. */
export function resolveWorktreeIntent(at: CommandAt, flags: WorktreeFlags, settings: OrchSettings): { readonly provider: WorktreeProviderId } | null {
  const { wanted, provider } = flags;
  if (provider !== undefined && !isWorktreeProviderId(provider)) throw usageError(at, `--worktree-provider takes one of ${WORKTREE_PROVIDER_IDS.join(", ")}`);
  if (!wanted && provider === undefined && !settings.defaults.worktree) return null;
  return { provider: provider ?? settings.worktrees.provider };
}

/** The `--form` an invocation names, null when it names none. */
export function formFlag(invocation: Invocation): FormId | null {
  const form = invocation.flags.value("--form") ?? null;
  if (form !== null && !isFormId(form)) throw usageError(invocation, `--form takes one of ${FORM_IDS.join(", ")}`);
  return form;
}

export function parseSpawnFlags(args: string[]): SpawnFlags {
  const invocation = parseCommand("spawn", args);
  const { flags, positional } = invocation;
  const tasksFile = flags.value("--tasks");
  const form = formFlag(invocation);
  return {
    ...agentFlags(flags),
    at: invocation,
    json: flags.has("--json"),
    form,
    tab: flags.value("--tab") ?? null,
    cwd: flags.value("--dir") ?? process.cwd(),
    cmd: flags.value("--cmd") ?? null,
    host: flags.value("--host") ?? null,
    dirFlag: flags.value("--dir") ?? null,
    space: flags.value("--space") ?? null,
    worktree: worktreeFlags(flags),
    promptFlags: [...flags.values("--prompt")],
    promptFiles: [...flags.values("--file")],
    modelFlags: [...flags.values("--model")],
    harnessFlags: [...flags.values("--harness")],
    withPaths: [...flags.values("--with")],
    ...(tasksFile === undefined ? {} : { tasksFile }),
    positional: [...positional],
  };
}

/** The launch orchd is asked for, minus the credential the call carries. */
export type SpawnParams = Omit<ParamsOf<"spawn">, "caller" | "actor" | "actorSpace" | "actorIsOperator" | "steal" | "crossSpace">;

/** What `orch spawn` asks orchd for, and how it reports. */
export interface SpawnRequest {
  readonly json: boolean;
  readonly params: SpawnParams;
}

/** One agent's plan as orchd is asked for it. */
type AgentPlan = SpawnParams["agents"][number];

/** "One value for every agent, or exactly one per agent." Zero values yields a row of undefined. */
function perAgent<T>(at: CommandAt, flag: string, values: readonly T[], n: number): (T | undefined)[] {
  if (values.length === 0) return Array.from({ length: n }, () => undefined);
  if (values.length === 1) return Array.from({ length: n }, () => values[0]);
  if (values.length === n) return [...values];
  throw usageError(at, `${flag} accepts one value for all agents or exactly ${n} values`);
}

/** One task per agent, from `--tasks`, or one `--file`, or the `--prompt` values. */
function resolveSpawnPrompts(flags: SpawnFlags, n: number): (string | null)[] {
  const sources = [flags.tasksFile !== undefined, flags.promptFiles.length > 0, flags.promptFlags.length > 0].filter(Boolean);
  if (sources.length > 1) throw usageError(flags.at, "give the task as --prompt, --file or --tasks, not more than one");
  if (flags.tasksFile !== undefined) return readTasksFile(flags.tasksFile, n);
  if (flags.promptFiles.length > 0) {
    if (flags.promptFiles.filter((file) => file === "-").length > 1) throw usageError(flags.at, "--file - reads stdin once; name it at most once");
    const cache = new Map<string, string>();
    return perAgent(flags.at, "--file", flags.promptFiles, n).map((file) => {
      if (file === undefined) return null;
      const cached = cache.get(file);
      if (cached !== undefined) return cached;
      const text = readPromptFile(file);
      cache.set(file, text);
      return text;
    });
  }
  return perAgent(flags.at, "--prompt", flags.promptFlags, n).map((prompt) => prompt ?? null);
}

function readTasksFile(source: string, n: number): string[] {
  let parsed: unknown;
  try { parsed = JSON.parse(readFileSync(source, "utf8")); } catch (error: unknown) { die(`could not read tasks file: ${errorMessage(error)}`); }
  if (!Array.isArray(parsed) || parsed.some((item) => typeof item !== "string") || parsed.length !== n) die(`--tasks must be a JSON array of exactly ${n} strings`);
  return parsed.filter((item): item is string => typeof item === "string");
}

/** Each agent's `--with` references: every bare path, then every `<name>=<path>` bound to that name. */
function referencesByAgent(withPaths: readonly string[], names: readonly string[]): ContextReference[][] {
  const shared: ContextReference[] = [];
  const bound = new Map<string, ContextReference[]>(names.map((name) => [name, []]));
  for (const value of withPaths) {
    const separator = value.indexOf("=");
    const target = separator === -1 ? undefined : bound.get(value.slice(0, separator));
    if (target === undefined) shared.push(contextReference(value));
    else target.push(contextReference(value.slice(separator + 1)));
  }
  return names.map((name) => [...shared, ...bound.get(name) ?? []]);
}

/** The harness and tuning one launch runs on: its flags, else the configured defaults. orchd
 *  admits the model. */
export function resolveLaunchAgent(flags: AgentFlags, settings: OrchSettings): { harness: AdapterId; model: string; thinking: ThinkingLevel } {
  const harness = pickAdapter(flags, settings);
  const tuning = resolveTuningOrDie(flags, settings, harness, null);
  return { harness, model: tuning.model, thinking: tuning.thinking };
}

/** One harness per agent. `--cmd` is one harness's command, so it refuses a mixed fleet. */
function resolveSpawnAdapters(flags: SpawnFlags, settings: OrchSettings, n: number): AdapterId[] {
  const adapters = perAgent(flags.at, "--harness", flags.harnessFlags, n)
    .map((harness) => pickAdapter(harness === undefined ? {} : { adapterFlag: harness }, settings));
  if (flags.cmd !== null && new Set(adapters).size > 1) throw usageError(flags.at, "--cmd launches one harness; give one --harness with it");
  return adapters;
}

/** One agent's launch, with its model resolved against its own harness. */
function planAgent(flags: SpawnFlags, settings: OrchSettings, agent: { name: string; adapter: AdapterId; model: string | undefined; prompt: string | null }): AgentPlan {
  const tuning = resolveTuningOrDie({ ...flags, modelFlag: agent.model }, settings, agent.adapter, null);
  return { name: agent.name, harness: agent.adapter, model: tuning.model, thinking: tuning.thinking, prompt: agent.prompt };
}

export function resolveSpawnSettings(flags: SpawnFlags, settings: OrchSettings): SpawnRequest {
  if (flags.host !== null) {
    if (flags.dirFlag === null) throw usageError(flags.at, "--host needs --dir <path on that host>: this machine's directory names nothing there");
    if (flags.backendFlag !== undefined) throw usageError(flags.at, "--host runs the agents with no plexer on that host; drop --plexer");
    if (flags.worktree.wanted || flags.worktree.provider !== undefined) throw usageError(flags.at, "--host cannot make a worktree on that host yet; drop --worktree");
    if (flags.cmd !== null) throw usageError(flags.at, "--host launches each harness's own command; drop --cmd");
  }
  const worktree = flags.host === null ? resolveWorktreeIntent(flags.at, flags.worktree, settings) : null;
  const names = resolveSpawnNames(flags.at, flags.positional);
  const n = names.length;
  const references = referencesByAgent(flags.withPaths, names);
  const prompts = resolveSpawnPrompts(flags, n).map((prompt, index) => prompt === null ? null : taskWithReferences(prompt, references[index] ?? []));
  const adapters = resolveSpawnAdapters(flags, settings, n);
  const models = perAgent(flags.at, "--model", flags.modelFlags, n);
  const agents = names.map((name, index) => {
    const adapter = adapters[index];
    const prompt = prompts[index];
    if (adapter === undefined || prompt === undefined) die("could not resolve spawn agent plan");
    return planAgent(flags, settings, { name, adapter, model: models[index], prompt });
  });
  return {
    json: flags.json,
    params: {
      agents,
      form: flags.form,
      cmd: flags.cmd,
      plexer: flags.backendFlag ?? null,
      cwd: flags.cwd,
      tab: flags.tab,
      space: flags.space,
      host: flags.host,
      worktree,
    },
  };
}
