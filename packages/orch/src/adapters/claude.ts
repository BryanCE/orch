import * as fs from "node:fs";
import * as path from "node:path";
import { declaredRuntime } from "../settings/read.ts";

import { presenceEntry } from "../presence/store.ts";
import { isRecord, packageRoot, reinstallCommand, textValue } from "../util.ts";
import { CLAUDE_HOOK_EVENTS, CLAUDE_HOOK_MATCHERS, claudeHookCommand, claudeHookShimPath, claudeSettingsPath } from "./claude-hooks.ts";
import { agentStateFrom } from "../agent-state.ts";
import { buildHeadlessArgv, buildInteractiveArgv, shimRole, type AgentState } from "./adapter.ts";
import { lastAssistantFromJsonl } from "./transcript.ts";
import { HARNESS_SESSION_ENV } from "./session-env.ts";
import type { AdapterCommand, AgentAdapter, HarnessModel, HookReportRole, LifecycleVerb, ModelCatalogue, ResultExtractionInput, SessionView, SessionViewInput, ShimInstallOpts, SpawnOpts, StateDetectionInput, SteerRequest } from "../types/adapter.ts";
import type { CheckResult } from "../types/doctor.ts";
import type { Logger, OrchDir } from "../types/core.ts";
import type { OrchSettings } from "../types/settings.ts";

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

/** The worker settings file with orch's two values in place: the `hooks` key and the
 *  compaction point in `env`. Every other key and env value is the user's and stays. */
function withOrchKeys(current: Record<string, unknown>, hooks: Record<string, unknown>, settings: OrchSettings): Record<string, unknown> {
  const env = isRecord(current.env) ? current.env : {};
  return { ...current, env: { ...env, [COMPACT_WINDOW_ENV]: String(settings.workers.compact_at_tokens) }, hooks };
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

/** The worker settings file as JSON, or the reason it is not usable. Absent reads as empty. */
function readWorkerSettings(settingsPath: string): Record<string, unknown> | string {
  let raw: string;
  try {
    raw = fs.readFileSync(settingsPath, "utf8");
  } catch {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? parsed : `malformed ${settingsPath}`;
  } catch {
    return `malformed ${settingsPath}`;
  }
}

/** The text a running Claude session takes for each lifecycle verb; it has none for reload or restart. */
const CLAUDE_LIFECYCLE_TEXT: Readonly<Record<LifecycleVerb, { text: string } | undefined>> = { reset: { text: "/clear" }, reload: undefined, restart: undefined };

/** Load orch's hooks into a session orch spawns, and into no other session. */
function settingsArgv(opts: SpawnOpts): string[] {
  return opts.orchDir ? ["--settings", claudeSettingsPath(opts.orchDir)] : [];
}

/** Write orch's values into the worker settings file, keeping every key the user wrote beside them. */
function installClaudeHooks(orchDir: OrchDir, settings: OrchSettings, logger: Logger, pkgRoot: string): void {
  const settingsPath = claudeSettingsPath(orchDir);
  const current = readWorkerSettings(settingsPath);
  if (typeof current === "string") throw new Error(`${current}; fix the JSON by hand, then run orch setup`);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, `${JSON.stringify(withOrchKeys(current, claudeHooks(pkgRoot, orchDir, settings), settings), null, 2)}\n`);
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
  const fileSettings = readWorkerSettings(settingsPath);
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
  return JSON.stringify(fileSettings) === JSON.stringify(expected)
    ? { id, label, status: "ok", detail: `all orch Claude hooks are current (${shim})` }
    : rewrite(`missing or stale orch Claude hooks or compaction point in ${settingsPath}`);
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

  readonly thinking = null;
  readonly workerLaunch = null;
  readonly modelControl = null;
  /** `/clear` starts a fresh conversation; SessionStart (`source: "clear"`) then reports it idle. */
  readonly lifecycleControl = { lifecycleCmd: (verb: LifecycleVerb): { text: string } | undefined => CLAUDE_LIFECYCLE_TEXT[verb] };
  readonly sessionView = { readSessionView: (input: SessionViewInput): SessionView | undefined => this.readSessionView(input) };
  readonly workspaceTrust = null;
  readonly shim = shimRole(this);
  readonly defaultModel = null;
  readonly models = { listModels: (catalogue: ModelCatalogue): readonly HarnessModel[] => parseClaudeModelsOutput(catalogue.read("claude", CLAUDE_MODELS_ARGV, CLAUDE_MODELS_REQUEST)) };
  readonly modelWarm = { warmModels: (catalogue: ModelCatalogue): Promise<void> => catalogue.warm("claude", CLAUDE_MODELS_ARGV, CLAUDE_MODELS_REQUEST) };
  readonly bridge = null;
  /** SessionStart reports the session before any prompt; UserPromptSubmit reports each prompt Claude takes. */
  readonly hooks: HookReportRole = { reports: ["start", "prompt"] };
  readonly commandGate = true;

  /** Claude Code exports CLAUDECODE=1 into every subprocess it runs. */
  readonly sessionEnvMarker = HARNESS_SESSION_ENV.claude.marker;

  /** Claude Code exports its per-session UUID, telling parallel sessions apart. */
  readonly sessionIdEnv = HARNESS_SESSION_ENV.claude.sessionId;

  /** Claude Code exports its own pid, which outlives each `orch` invocation. */
  readonly sessionPidEnv = HARNESS_SESSION_ENV.claude.sessionPid;

  /** Start Claude Code directly in an interactive backend session. */
  interactiveCmd(opts: SpawnOpts): string {
    return this.interactiveArgv(opts).join(" ");
  }

  interactiveArgv(opts: SpawnOpts): readonly string[] {
    return [...buildInteractiveArgv("claude", opts), ...settingsArgv(opts)];
  }

  /** Run Claude Code's print mode for detached workers. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return buildHeadlessArgv("claude", ["-p", ...settingsArgv(opts)], opts, prompt);
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
