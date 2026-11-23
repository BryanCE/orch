import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { declaredRuntime } from "../settings/read.ts";
import { settingsTemporaryPath } from "../settings/schema.ts";
import { contextArgv, workerPolicyFrom } from "../policy/workers.ts";
import { presenceEntry } from "../presence/store.ts";
import { errnoCode, errorMessage, isRecord, packageRoot, reinstallCommand, textValue } from "../util.ts";
import { CLAUDE_HOOK_EVENTS, CLAUDE_HOOK_MATCHERS, claudeHookCommand, claudeHookShimPath, claudeSettingsPath, claudeWorkerSettingsPath } from "./claude-hooks.ts";
import { agentStateFrom } from "../agent-state.ts";
import { buildHeadlessArgv, buildInteractiveArgv, launchCompaction, shimRole, type AgentState } from "../shared/harness.ts";
import { lastAssistantFromJsonl } from "../shared/transcript.ts";
import { HARNESS_SESSION_ENV } from "../shared/session-env.ts";
import { posix } from "../shared/prerequisites.ts";
import type { AdapterCommand, AgentAdapter, HarnessModel, HookReportRole, LifecycleVerb, ModelCatalogue, Prerequisite, ResultExtractionInput, SessionView, SessionViewInput, ShimInstallOpts, SpawnOpts, StateDetectionInput, SteerRequest, ThinkingStrategy } from "../types/adapter.ts";
import type { CheckResult } from "../types/doctor.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";
import type { ContextSwitches, ThinkingLevel, WorkerPolicy } from "../types/policy.ts";
import { CLAUDE_TOOLS } from "../../extensions/claude/vocabulary.ts";
import { readOnlyTools } from "../policy/read-only.ts";

/** State input for Claude, identified by its hook-owned presence key. */
interface ClaudeStateDetectionInput extends StateDetectionInput {
  readonly key: string;
}

/** Result input for Claude, identified by its hook-owned presence key. */
interface ClaudeResultExtractionInput extends ResultExtractionInput {
  readonly key: string;
}

function readTextFile(file: string | undefined): string | undefined {
  if (!file) return undefined;
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

/** Claude Code lists its models in the answer to the stream-json `initialize` control request.
 *  No setting sources and no persistence, so the query fires no hook and writes no session. */
const CLAUDE_MODELS_ARGV = ["-p", "--setting-sources", "", "--no-session-persistence", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose"] as const;
const CLAUDE_MODELS_REQUEST = `${JSON.stringify({ type: "control_request", request_id: "models", request: { subtype: "initialize" } })}\n`;

/** One `ModelInfo` row of the initialize answer. */
function claudeModelRow(entry: unknown): HarnessModel[] {
  if (!isRecord(entry) || typeof entry.value !== "string" || !entry.value) return [];
  return [{
    spec: entry.value,
    ...(typeof entry.displayName === "string" && entry.displayName ? { label: entry.displayName } : {}),
    ...(typeof entry.resolvedModel === "string" && entry.resolvedModel && entry.resolvedModel !== entry.value ? { resolved: entry.resolvedModel } : {}),
  }];
}

/** The `models` of the initialize control response, the one line of stdout that carries it. */
function parseClaudeModelsOutput(stdout: string): readonly HarnessModel[] {
  for (const line of stdout.split(/\r?\n/)) {
    if (!line.includes("control_response")) continue;
    let message: unknown;
    try {
      message = JSON.parse(line);
    } catch {
      continue;
    }
    if (!isRecord(message) || !isRecord(message.response) || !isRecord(message.response.response)) continue;
    const models = message.response.response.models;
    if (Array.isArray(models)) return models.flatMap(claudeModelRow);
  }
  return [];
}

/** Claude's token count at which a session compacts its conversation. */
const COMPACT_WINDOW_ENV = "CLAUDE_CODE_AUTO_COMPACT_WINDOW";

/** Claude's switch for the claude.ai connectors, which `--strict-mcp-config` does not name. */
const CLAUDEAI_MCP_ENV = "ENABLE_CLAUDEAI_MCP_SERVERS";

/** A settings file with one policy's connector switch in place of whatever it held. The file's `env`
 *  overrides the process env, so it never holds the compaction point: each launch sets that for its
 *  own model. */
function withConnectorSwitch(current: Record<string, unknown>, policy: WorkerPolicy): Record<string, unknown> {
  const { env: _fileEnv, ...rest } = current;
  const { [COMPACT_WINDOW_ENV]: _launchOwned, [CLAUDEAI_MCP_ENV]: _connectorsOwned, ...userEnv } = isRecord(current.env) ? current.env : {};
  const env = policy.inheritMcp ? userEnv : { ...userEnv, [CLAUDEAI_MCP_ENV]: "false" };
  return { ...rest, ...(Object.keys(env).length ? { env } : {}) };
}

/** The install's worker settings file with orch's hooks and the install policy's connector switch in place. */
function withOrchKeys(current: Record<string, unknown>, hooks: Record<string, unknown>, settings: OrchSettings): Record<string, unknown> {
  return { ...withConnectorSwitch(current, workerPolicyFrom(settings)), hooks };
}

/** orch's hook entries, one per Claude hook event. */
function claudeHooks(root: string, orchDir: OrchDir, settings: OrchSettings): Record<string, unknown> {
  const shim = claudeHookShimPath(root);
  const runtime = declaredRuntime(settings);
  return Object.fromEntries(CLAUDE_HOOK_EVENTS.map((event) => {
    const matcher = CLAUDE_HOOK_MATCHERS[event];
    const hooks = [{ type: "command", command: claudeHookCommand(shim, event, runtime, orchDir) }];
    return [event, [matcher === undefined ? { hooks } : { matcher, hooks }]];
  }));
}

/** What reading a settings file of orch's found. Only ENOENT is `absent`. */
type WorkerSettingsRead =
  | { readonly kind: "absent" }
  | { readonly kind: "unreadable"; readonly reason: string }
  | { readonly kind: "malformed"; readonly reason: string }
  | { readonly kind: "ok"; readonly value: Record<string, unknown> };

function readWorkerSettings(settingsPath: string): WorkerSettingsRead {
  let raw: string;
  try {
    raw = fs.readFileSync(settingsPath, "utf8");
  } catch (error: unknown) {
    return errnoCode(error) === "ENOENT" ? { kind: "absent" } : { kind: "unreadable", reason: `cannot read ${settingsPath}: ${errorMessage(error)}` };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { kind: "malformed", reason: `malformed ${settingsPath}` };
  }
  return isRecord(parsed) ? { kind: "ok", value: parsed } : { kind: "malformed", reason: `malformed ${settingsPath}` };
}

/** The install file as setup, sync and doctor read it: absent is empty, so setup creates it; a file
 *  orch cannot read or parse is the reason, since it holds the user's keys and a rewrite would lose them. */
function installSettingsOrEmpty(settingsPath: string): Record<string, unknown> | string {
  const read = readWorkerSettings(settingsPath);
  switch (read.kind) {
    case "ok": return read.value;
    case "absent": return {};
    case "unreadable":
    case "malformed": return read.reason;
    default: {
      const exhaustive: never = read;
      throw new Error(`unknown read ${String(exhaustive)}`);
    }
  }
}

/** The install file as a launch reads it: present, parsed and holding every orch hook, or the
 *  launch is refused, since a worker with no hooks never reports. */
function installSettingsForLaunch(settingsPath: string): Record<string, unknown> {
  const read = readWorkerSettings(settingsPath);
  if (read.kind === "absent") throw new Error(`no ${settingsPath}; run orch setup`);
  if (read.kind !== "ok") throw new Error(`${read.reason}; fix the JSON by hand, then run orch setup`);
  const hooks = read.value.hooks;
  if (!isRecord(hooks) || !CLAUDE_HOOK_EVENTS.every((event) => event in hooks)) throw new Error(`${settingsPath} lacks orch's hooks; run orch setup`);
  return read.value;
}

/** The text a running Claude session takes for each lifecycle verb; it has none for reload or restart. */
const CLAUDE_LIFECYCLE_TEXT: Readonly<Record<LifecycleVerb, { text: string } | undefined>> = { reset: { text: "/clear" }, reload: undefined, restart: undefined };

const CLAUDE_EFFORT_LEVELS: Readonly<Record<ThinkingLevel, string>> = {
  off: "low",
  minimal: "low",
  low: "low",
  medium: "medium",
  high: "high",
  xhigh: "xhigh",
  max: "max",
};

/** Load orch's hooks into a session orch spawns, and into no other session. A launch with a policy
 *  gets that policy's worker file, which this writes: an argv built with an `orchDir` is a launch on
 *  this host. One built with none writes nothing. */
function settingsArgv(opts: SpawnOpts): string[] {
  if (!opts.orchDir) return [];
  return ["--settings", opts.workers === undefined ? claudeSettingsPath(opts.orchDir) : workerSettingsFile(opts.orchDir, opts.workers)];
}

/** Claude's flags that keep MCP servers and skills out of a worker. A bare `--disallowedTools` name takes
 *  the Skill tool, and the skill list it carries, out of context; `/clear` still works. The `=` form keeps
 *  the variadic flag from taking the prompt after it. */
const CLAUDE_CONTEXT_SWITCHES: ContextSwitches = { mcp: ["--strict-mcp-config"], skills: ["--disallowedTools=Skill"] };

/** Claude's `--tools` for a read-only worker: the tools that read, and the two that write when it has an output directory. */
function readOnlyArgv(opts: SpawnOpts): string[] {
  const readOnly = opts.workers === undefined ? null : opts.workers.readOnly;
  return readOnly === null ? [] : ["--tools", readOnlyTools(CLAUDE_TOOLS, readOnly).join(",")];
}

/** The worker settings file as orch writes it: the user's keys beside orch's values. A file orch cannot parse throws. */
function expectedWorkerSettings(settingsPath: string, pkgRoot: string, orchDir: OrchDir, settings: OrchSettings): { current: Record<string, unknown>; expected: Record<string, unknown> } {
  const current = installSettingsOrEmpty(settingsPath);
  if (typeof current === "string") throw new Error(`${current}; fix the JSON by hand, then run orch setup`);
  return { current, expected: withOrchKeys(current, claudeHooks(pkgRoot, orchDir, settings), settings) };
}

function settingsText(contents: Record<string, unknown>): string {
  return `${JSON.stringify(contents, null, 2)}\n`;
}

/** Write `text` beside `file` under a temp name and hand it to `publish`; the temp file goes either way. */
function throughTemporary(file: string, text: string, publish: (temporary: string) => void): void {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = settingsTemporaryPath(file);
  try {
    fs.writeFileSync(temporary, text);
    publish(temporary);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

/** Replace the install file whole, so a reader never sees half of it. Every failure throws. */
function writeWorkerSettings(settingsPath: string, contents: Record<string, unknown>): void {
  throughTemporary(settingsPath, settingsText(contents), (temporary) => { fs.renameSync(temporary, settingsPath); });
}

/** Publish a worker file that never changes once it exists. A hard link never replaces a file, so
 *  nothing is written over a file a running Claude holds; `EEXIST` is the same snapshot already there,
 *  since the name is the digest of these bytes. */
function publishSnapshot(file: string, text: string): void {
  throughTemporary(file, text, (temporary) => {
    try {
      fs.linkSync(temporary, file);
    } catch (error: unknown) {
      if (errnoCode(error) !== "EEXIST") throw error;
    }
  });
}

/** The settings file a launch under `policy` passes Claude: the install file with this policy's
 *  connector switch, named for the digest of its text. Written on every call; the install file is read, never it. */
function workerSettingsFile(orchDir: OrchDir, policy: WorkerPolicy): string {
  const text = settingsText(withConnectorSwitch(installSettingsForLaunch(claudeSettingsPath(orchDir)), policy));
  const file = claudeWorkerSettingsPath(orchDir, createHash("sha256").update(text).digest("hex"));
  publishSnapshot(file, text);
  return file;
}

/** Rewrite the worker settings file when a settings change left it behind: the path written, or null. */
function syncWorkerSettings(orchDir: OrchDir, settings: OrchSettings): string | null {
  const settingsPath = claudeSettingsPath(orchDir);
  const { current, expected } = expectedWorkerSettings(settingsPath, packageRoot(), orchDir, settings);
  if (isDeepStrictEqual(current, expected)) return null;
  writeWorkerSettings(settingsPath, expected);
  return settingsPath;
}

/** Write orch's values into the worker settings file, keeping every key the user wrote beside them. */
function installClaudeHooks(orchDir: OrchDir, settings: OrchSettings, logger: Logger, pkgRoot: string): void {
  const settingsPath = claudeSettingsPath(orchDir);
  writeWorkerSettings(settingsPath, expectedWorkerSettings(settingsPath, pkgRoot, orchDir, settings).expected);
  process.stdout.write(`Claude Code hooks: wrote ${settingsPath}\n`);
  const shim = claudeHookShimPath(pkgRoot);
  if (!fs.existsSync(shim)) {
    logger.warn("claude.shim-missing", { path: shim });
    process.stdout.write(`  warning: ${shim} is missing from the install; fix: ${reinstallCommand()}\n`);
  }
}

/** Check orch's private Claude settings file against what setup would write. */
export function diagnoseClaudeShim(root: string, orchDir: OrchDir, settings: OrchSettings, logger: Logger): CheckResult {
  const settingsPath = claudeSettingsPath(orchDir);
  const id = "claude-hooks";
  const label = "Claude hooks shim";
  const rewrite = (detail: string): CheckResult => ({
    id, label, status: "warn", detail,
    fix: { description: "rewrite orch's Claude settings", apply: () => { installClaudeHooks(orchDir, settings, logger, root); } },
  });
  const fileSettings = installSettingsOrEmpty(settingsPath);
  // A file orch cannot parse holds the user's keys too; rewriting it would lose them.
  if (typeof fileSettings === "string") return { id, label, status: "fail", detail: `${fileSettings}; fix the JSON by hand` };

  const shim = claudeHookShimPath(root);
  if (!fs.existsSync(shim)) {
    return { id, label, status: "warn", detail: `${shim} is missing; fix: run orch setup` };
  }
  let expected: Record<string, unknown>;
  try {
    expected = withOrchKeys(fileSettings, claudeHooks(root, orchDir, settings), settings);
  } catch {
    return { id, label, status: "warn", detail: "cannot determine the declared runtime; fix: run orch setup" };
  }
  return isDeepStrictEqual(fileSettings, expected)
    ? { id, label, status: "ok", detail: `all orch Claude hooks are current (${shim})` }
    : rewrite(`missing or stale orch Claude hooks, a connector switch out of step with workers.inherit_mcp, or a compaction point the launch owns, in ${settingsPath}`);
}

/**
 * Claude Code adapter. Presence fidelity is coarse by design: `idle` on
 * SessionStart, `working` on UserPromptSubmit (which also acks a typed prompt),
 * `asking` on a permission Notification or a turn that ends on a question,
 * `done` on Stop and `error` on StopFailure. There are no mid-run tool/token/cost
 * transitions the way pi's live extension reports them. State and session-tail
 * data are supplied by extensions/claude/index.ts. PreToolUse reports nothing;
 * it routes locked and gated Bash commands through `orch lock`.
 */
class ClaudeAdapter implements AgentAdapter {
  readonly id = "claude" as const;
  readonly install: Prerequisite = {
    install: { ...posix("curl -fsSL https://claude.ai/install.sh | bash"), windows: "irm https://claude.ai/install.ps1 | iex" },
    signIn: "claude auth",
  };
  readonly preferredForm = null;
  readonly skillsDir = "~/.claude/skills";

  readonly thinking: ThinkingStrategy = {
    launchArgs: (level: ThinkingLevel): readonly string[] => ["--effort", CLAUDE_EFFORT_LEVELS[level]],
    set: (_level: ThinkingLevel): void => {
      // Claude effort is launch-only; running sessions cannot change it.
    },
  };
  readonly workerLaunch = null;
  readonly modelControl = null;
  /** `/clear` starts a fresh conversation; SessionStart (`source: "clear"`) then reports it idle. */
  readonly lifecycleControl = { lifecycleCmd: (verb: LifecycleVerb): { text: string } | undefined => CLAUDE_LIFECYCLE_TEXT[verb] };
  readonly sessionView = { readSessionView: (input: SessionViewInput): SessionView | undefined => this.readSessionView(input) };
  readonly workspaceTrust = null;
  readonly shim = shimRole(this);
  /** The worker settings file holds the connector switch and hooks orch derives from its settings. */
  readonly settingsFile = { sync: (orchDir: OrchDir, settings: OrchSettings): string | null => syncWorkerSettings(orchDir, settings) };
  readonly defaultModel = null;
  readonly models = { listModels: (catalogue: ModelCatalogue): readonly HarnessModel[] => parseClaudeModelsOutput(catalogue.read("claude", CLAUDE_MODELS_ARGV, CLAUDE_MODELS_REQUEST)) };
  readonly modelWarm = { warmModels: (catalogue: ModelCatalogue): Promise<void> => catalogue.warm("claude", CLAUDE_MODELS_ARGV, CLAUDE_MODELS_REQUEST) };
  /** Claude takes one point per launch, and a running session cannot change its model. */
  readonly compaction = launchCompaction((tokens) => ({ env: { [COMPACT_WINDOW_ENV]: String(tokens) }, args: [] }), [COMPACT_WINDOW_ENV]);
  readonly bridge = null;
  /** SessionStart reports the session before any prompt; UserPromptSubmit reports each prompt Claude takes. */
  readonly hooks: HookReportRole = { reports: ["start", "prompt"] };
  readonly acp = null;
  readonly server = null;
  readonly resume = {
    argv: (opts: SpawnOpts, sessionId: string): readonly string[] => [...this.interactiveArgv(opts), "--resume", sessionId],
  };
  readonly commandGate = true;
  readonly readOnly = { tools: CLAUDE_TOOLS };

  /** Claude Code exports CLAUDECODE=1 into every subprocess it runs. */
  readonly sessionEnvMarker = HARNESS_SESSION_ENV.claude.marker;

  /** Claude Code exports its per-session UUID, telling parallel sessions apart. */
  readonly sessionIdEnv = HARNESS_SESSION_ENV.claude.sessionId;

  /** Claude Code exports its own pid, which outlives each `orch` invocation. */
  readonly sessionPidEnv = HARNESS_SESSION_ENV.claude.sessionPid;

  interactiveArgv(opts: SpawnOpts): readonly string[] {
    const argv = [...buildInteractiveArgv("claude", opts), ...settingsArgv(opts), ...contextArgv(CLAUDE_CONTEXT_SWITCHES, opts.workers), ...readOnlyArgv(opts)];
    if (opts.thinking !== undefined) argv.push(...this.thinking.launchArgs(opts.thinking));
    return argv;
  }

  /** Run Claude Code's print mode for detached workers. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const flags = ["-p", ...settingsArgv(opts), ...contextArgv(CLAUDE_CONTEXT_SWITCHES, opts.workers), ...readOnlyArgv(opts)];
    if (opts.thinking !== undefined) flags.push(...this.thinking.launchArgs(opts.thinking));
    return buildHeadlessArgv("claude", flags, opts, prompt);
  }

  /** Read the status written by Claude's SessionStart/Stop/Notification hooks. */
  detectState(input: ClaudeStateDetectionInput, orchDir: OrchDir): AgentState {
    const presence = presenceEntry(orchDir, input.key);
    if (presence) {
      const state = presence.status?.state;
      if (state !== undefined) return agentStateFrom(state);
    }
    if (input.signal || (input.exitCode !== undefined && input.exitCode !== 0)) return "error";
    if (input.exitCode === 0) return "done";
    return "unknown";
  }

  /** Claude runs no bridge; the caller routes degraded steering through the environment. */
  steer(_request: SteerRequest): AdapterCommand | undefined {
    return undefined;
  }

  /** Prefer the daemon-reported result, then Claude transcript JSONL, then native output. */
  extractResult(input: ClaudeResultExtractionInput, orchDir: OrchDir): string | undefined {
    const presence = presenceEntry(orchDir, input.key);
    const resultText = textValue(presence?.result);
    if (resultText !== undefined) return resultText;

    const statusTranscript = presence?.status?.sessionPath ?? undefined;
    const transcriptText = lastAssistantFromJsonl(readTextFile(input.sessionPath ?? statusTranscript));
    if (transcriptText !== undefined) return transcriptText;

    const outputText = lastAssistantFromJsonl(input.output);
    if (outputText !== undefined) return outputText;
    // Claude's print mode normally emits plain final text rather than JSONL.
    const plainOutput = textValue(input.output);
    if (plainOutput !== undefined) return plainOutput;

    return textValue(presence?.status?.lastText);
  }

  /** Read the transcript tail for the last assistant text; state stays presence-driven. */
  readSessionView(input: SessionViewInput): SessionView | undefined {
    const text = lastAssistantFromJsonl(readTextFile(input.sessionPath) ?? input.output);
    return text === undefined ? undefined : { lastText: text };
  }

  /** Write orch's private Claude settings file. orch ships no Claude subagent
   *  definitions — every dispatch goes through orch itself. Skills are not installed
   *  here either: they are read by every harness, so setup writes them once into the
   *  configured roots rather than once per adapter. */
  installShim(orchDir: OrchDir, settings: OrchSettings, logger: Logger, _opts?: ShimInstallOpts): void {
    installClaudeHooks(orchDir, settings, logger, packageRoot());
  }

  /** Verify the same Claude hook entries written by installShim. */
  diagnoseShim(orchDir: OrchDir, settings: OrchSettings, logger: Logger): CheckResult {
    return diagnoseClaudeShim(packageRoot(), orchDir, settings, logger);
  }
}

/** Shared Claude adapter instance for command wiring. */
export const claudeAdapter = new ClaudeAdapter();
