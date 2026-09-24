import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { declaredRuntime } from "../settings/read.ts";

import type { OrchRuntime } from "../runtime.ts";
import { presenceEntry } from "../presence/store.ts";
import { errnoCode, errorMessage, isRecord, packageRoot, reinstallCommand } from "../util.ts";
import { CLAUDE_HOOK_EVENTS, claudeHookCommand, claudeHookShimPath } from "./claude-hooks.ts";
import { agentStateFrom } from "../agent-state.ts";
import { buildHeadlessArgv, buildInteractiveArgv, shimRole, type AgentState } from "./adapter.ts";
import { textValue } from "../util.ts";
import { lastAssistantFromJsonl } from "./transcript.ts";
import { HARNESS_SESSION_ENV } from "./session-env.ts";
import type { AdapterCommand, AgentAdapter, HarnessModel, ModelCatalogue, ResultExtractionInput, SessionView, SessionViewInput, ShimInstallOpts, SpawnOpts, StateDetectionInput, SteerRequest } from "../types/adapter.ts";
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

const HOME = os.homedir();

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

function isOrchShimHook(hook: unknown): boolean {
  return isRecord(hook) && hook.type === "command"
    && typeof hook.command === "string" && hook.command.includes("claude-hooks");
}

/** Drop orch shim hooks that don't match `command` so the shim never fires twice; keep everything else. */
function pruneStaleShimHooks(list: unknown[], command: string): { list: unknown[]; pruned: boolean } {
  let pruned = false;
  const kept = list.map((entry) => {
    if (!isRecord(entry) || !Array.isArray(entry.hooks)) return entry;
    const hooks = entry.hooks.filter((hook: unknown) => {
      const stale = isOrchShimHook(hook) && (hook as Record<string, unknown>).command !== command;
      if (stale) pruned = true;
      return !stale;
    });
    return hooks.length === entry.hooks.length ? entry : { ...entry, hooks };
  }).filter((entry) => !isRecord(entry) || !Array.isArray(entry.hooks) || entry.hooks.length > 0);
  return { list: kept, pruned };
}

/** Wire the presence hook shim into ~/.claude/settings.json without disturbing unrelated hooks. */
function installClaudeHooks(orchDir: OrchDir, settings: OrchSettings, logger: Logger, pkgRoot: string): void {
  const claudeDir = path.join(HOME, ".claude");
  const claudeSettingsPath = path.join(claudeDir, "settings.json");
  let fileSettings: Record<string, unknown>;
  if (!fs.existsSync(claudeSettingsPath)) {
    fileSettings = {};
  } else {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf8"));
      if (!isRecord(parsed)) throw new Error("settings root is not an object");
      fileSettings = parsed;
    } catch (error: unknown) {
      logger.warn("claude.hooks-parse-failed", { path: claudeSettingsPath, error: errorMessage(error) });
      process.stdout.write(`  warning: could not parse ${claudeSettingsPath}; Claude hooks not changed (${errorMessage(error)})\n`);
      return;
    }
  }
  const shim = claudeHookShimPath(pkgRoot);
  // The shim is plain ESM JS; wire it to the runtime DECLARED in settings.json.
  // orch never probes PATH to pick one — the declaration is the only source.
  const runtime = declaredRuntime(settings);
  const added: string[] = [];
  let prunedStale = false;
  const hooks = isRecord(fileSettings.hooks) ? fileSettings.hooks : (fileSettings.hooks === undefined ? {} : null);
  if (!hooks) {
    logger.warn("claude.hooks-invalid", { path: claudeSettingsPath });
    process.stdout.write(`  warning: ${claudeSettingsPath} has a non-object hooks value; Claude hooks not changed\n`);
    return;
  }
  fileSettings.hooks = hooks;
  for (const event of CLAUDE_HOOK_EVENTS) {
    const command = claudeHookCommand(shim, event, runtime, orchDir);
    const entries = hooks[event];
    if (entries !== undefined && !Array.isArray(entries)) {
      logger.warn("claude.hook-event-invalid", { path: claudeSettingsPath, event });
      process.stdout.write(`  warning: ${claudeSettingsPath} has a non-array ${event} hook value; skipped\n`);
      continue;
    }
    const { list, pruned } = pruneStaleShimHooks(Array.isArray(entries) ? entries : [], command);
    if (pruned) prunedStale = true;
    const alreadyPresent = list.some((entry) => isRecord(entry) && Array.isArray(entry.hooks)
      && entry.hooks.some((hook: unknown) => isRecord(hook) && hook.type === "command" && hook.command === command));
    if (!alreadyPresent) {
      list.push({ hooks: [{ type: "command", command }] });
      added.push(event);
    }
    hooks[event] = list;
  }
  if (added.length || prunedStale) {
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(claudeSettingsPath, JSON.stringify(fileSettings, null, 2) + "\n");
  }
  const summary = [
    added.length ? `added ${added.join(", ")} (${runtime}) in ${claudeSettingsPath}` : "",
    prunedStale ? "pruned stale orch entries" : "",
  ].filter(Boolean).join("; ") || "already configured";
  process.stdout.write(`Claude Code hooks: ${summary}\n`);
  if (!fs.existsSync(shim)) {
    logger.warn("claude.shim-missing", { path: shim });
    process.stdout.write(`  warning: ${shim} is missing from the install; fix: ${reinstallCommand()}\n`);
  }
}

/**
 * Claude Code adapter. Presence fidelity is coarse by design: `working` on
 * SessionStart, `blocked` on Notification, `done`/`idle` on Stop, and nothing
 * in between — Claude's hooks fire only at those three points, so there are
 * no mid-run tool/token/cost transitions the way pi's live extension reports
 * them. State and session-tail data are supplied by extensions/claude/index.ts.
 * PreToolUse reports nothing; it routes locked and gated Bash commands through `orch lock`.
 */
/** Every command string registered under one Claude hook event, ignoring malformed entries. */
function registeredHookCommands(settings: Record<string, unknown>, event: string): string[] {
  const entries = isRecord(settings.hooks) ? settings.hooks[event] : undefined;
  if (!Array.isArray(entries)) return [];
  const hooks = entries.flatMap((entry): unknown[] => (isRecord(entry) && Array.isArray(entry.hooks) ? entry.hooks : []));
  return hooks.flatMap((hook) =>
    isRecord(hook) && hook.type === "command" && typeof hook.command === "string" ? [hook.command] : []);
}

/** Events whose orch hook is unregistered or left over from a build under another runtime. */
function staleHookEvents(settings: Record<string, unknown>, shim: string, runtime: OrchRuntime, orchDir: OrchDir): string[] {
  return CLAUDE_HOOK_EVENTS.filter((event) =>
    !registeredHookCommands(settings, event).includes(claudeHookCommand(shim, event, runtime, orchDir)));
}

class ClaudeAdapter implements AgentAdapter {
  readonly id = "claude" as const;

  readonly thinking = null;
  readonly workerLaunch = null;
  readonly modelControl = null;
  readonly lifecycleControl = null;
  readonly sessionView = { readSessionView: (input: SessionViewInput): SessionView | undefined => this.readSessionView(input) };
  readonly workspaceTrust = null;
  readonly shim = shimRole(this);
  readonly defaultModel = null;
  readonly models = { listModels: (catalogue: ModelCatalogue): readonly HarnessModel[] => parseClaudeModelsOutput(catalogue.read("claude", CLAUDE_MODELS_ARGV, CLAUDE_MODELS_REQUEST)) };
  readonly modelWarm = { warmModels: (catalogue: ModelCatalogue): Promise<void> => catalogue.warm("claude", CLAUDE_MODELS_ARGV, CLAUDE_MODELS_REQUEST) };
  readonly bridge = null;
  readonly presenceRegistration = { isRegistered: (key: string, orchDir: OrchDir): boolean => presenceEntry(orchDir, key) !== undefined };
  readonly commandGate = true;

  /** State is authoritative only when the Claude settings hooks are installed. */
  readonly hookDriven = true;

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
    return buildInteractiveArgv("claude", opts);
  }

  /** Run Claude Code's print mode for detached workers. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    return buildHeadlessArgv("claude", ["-p"], opts, prompt);
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

  /** Install the settings.json presence hooks. orch ships no Claude subagent
   *  definitions — every dispatch goes through orch itself. Skills are not installed
   *  here either: they are read by every harness, so setup writes them once into the
   *  configured roots rather than once per adapter. */
  installShim(orchDir: OrchDir, settings: OrchSettings, logger: Logger, _opts?: ShimInstallOpts): void {
    installClaudeHooks(orchDir, settings, logger, packageRoot());
  }

  /** Verify the same Claude hook entries written by installShim. */
  diagnoseShim(orchDir: OrchDir, settings: OrchSettings, logger: Logger): CheckResult {
    const settingsPath = path.join(HOME, ".claude", "settings.json");
    const id = "claude-hooks";
    const label = "Claude hooks shim";
    let raw: string;
    try {
      raw = fs.readFileSync(settingsPath, "utf8");
    } catch (error: unknown) {
      if (errnoCode(error) === "ENOENT") {
        return { id, label, status: "ok", detail: "Claude is not set up (no settings.json)" };
      }
      return { id, label, status: "warn", detail: `could not read ${settingsPath}; fix: run orch setup` };
    }
    let fileSettings: unknown;
    try {
      fileSettings = JSON.parse(raw);
    } catch {
      return { id, label, status: "warn", detail: `malformed ${settingsPath}; fix: run orch setup` };
    }
    if (!isRecord(fileSettings)) return { id, label, status: "warn", detail: `malformed ${settingsPath}; fix: run orch setup` };

    const shim = claudeHookShimPath(packageRoot());
    // Registration in ~/.claude/settings.json is necessary but NOT sufficient:
    // the hook command names a file, and claude will fail at agent runtime if
    // that file is absent. Never report a path as evidence of health without
    // confirming it exists (design D7).
    if (!fs.existsSync(shim)) {
      return { id, label, status: "warn", detail: `${shim} is missing; fix: run orch setup` };
    }
    // Expect the hook installed under the DECLARED runtime, not "any runtime orch
    // recognizes". Accepting all of ORCH_RUNTIMES here made the declaration
    // unenforced: a hook left behind under a different runtime read as current,
    // which is the exact drift the runtime key exists to surface.
    let runtime: OrchRuntime;
    try {
      runtime = declaredRuntime(settings);
    } catch {
      // checkSettingsFile owns the malformed-settings detail; a broken settings file must not
      // crash an unrelated diagnostic.
      return { id, label, status: "warn", detail: "cannot determine the declared runtime; fix: run orch setup" };
    }
    const missing = staleHookEvents(fileSettings, shim, runtime, orchDir);
    // Repairing drift IS reinstalling: installShim is idempotent and additive.
    return missing.length
      ? {
          id,
          label,
          status: "warn",
          detail: `missing or stale orch hook${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
          fix: { description: `reinstall orch's Claude hooks (${missing.join(", ")})`, apply: () => { this.installShim(orchDir, settings, logger); } },
        }
      : { id, label, status: "ok", detail: `all orch Claude hooks are current (${shim})` };
  }
}

/** Shared Claude adapter instance for command wiring. */
export const claudeAdapter = new ClaudeAdapter();
