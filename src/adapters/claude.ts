import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { declaredRuntime } from "../config.ts";
import type { OrchRuntime } from "../runtime.ts";
import { loadPresence, orchDir, statusForPresence, type PresenceEntry } from "../presence/store.ts";
import { errorMessage, isRecord, packageRoot } from "../util.ts";
import { claudeHookCommand, claudeHookShimPath } from "./claude-hooks.ts";
import { AGENT_STATES } from "./adapter.ts";
import type {
  HarnessModel,
  AdapterCommand,
  AgentAdapter,
  AgentState,
  AnswerRequest,
  ResultExtractionInput,
  SessionView,
  SessionViewInput,
  SpawnOpts,
  StateDetectionInput,
  SteerRequest,
} from "./adapter.ts";
import type { CheckResult } from "../check-result.ts";
import { textValue } from "../util.ts";
import { lastAssistantFromJsonl } from "./transcript.ts";

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

function stateFrom(value: unknown): AgentState {
  return typeof value === "string" && AGENT_STATES.includes(value as AgentState)
    ? value as AgentState
    : "unknown";
}

function presenceFor(key: string): PresenceEntry | undefined {
  return loadPresence().get(key);
}

const HOME = os.homedir();

/** Claude Code's accepted `--model` vocabulary: the stable aliases plus the current
 *  dated ids. Update here when Anthropic ships a new model; nothing else reads it. */
const CLAUDE_MODELS: readonly HarnessModel[] = [
  { spec: "opus", label: "Latest Opus" },
  { spec: "sonnet", label: "Latest Sonnet" },
  { spec: "haiku", label: "Latest Haiku" },
  { spec: "claude-opus-4-6", label: "Claude Opus 4.6" },
  { spec: "claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  { spec: "claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

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
function installClaudeHooks(pkgRoot: string): void {
  const claudeDir = path.join(HOME, ".claude");
  const claudeSettingsPath = path.join(claudeDir, "settings.json");
  let settings: Record<string, unknown>;
  if (!fs.existsSync(claudeSettingsPath)) {
    settings = {};
  } else {
    try {
      const parsed: unknown = JSON.parse(fs.readFileSync(claudeSettingsPath, "utf8"));
      if (!isRecord(parsed)) throw new Error("settings root is not an object");
      settings = parsed;
    } catch (error: unknown) {
      process.stderr.write(`  warning: could not parse ${claudeSettingsPath}; Claude hooks not changed (${errorMessage(error)})\n`);
      return;
    }
  }
  const shim = claudeHookShimPath(pkgRoot);
  // The shim is plain ESM JS; wire it to the runtime DECLARED in settings.json.
  // orch never probes PATH to pick one — the declaration is the only source.
  const runtime = declaredRuntime(orchDir());
  const added: string[] = [];
  let prunedStale = false;
  const hooks = isRecord(settings.hooks) ? settings.hooks : (settings.hooks === undefined ? {} : null);
  if (!hooks) {
    process.stderr.write(`  warning: ${claudeSettingsPath} has a non-object hooks value; Claude hooks not changed\n`);
    return;
  }
  settings.hooks = hooks;
  for (const event of ["SessionStart", "Stop", "Notification"] as const) {
    const command = claudeHookCommand(shim, event, runtime, orchDir());
    const entries = hooks[event];
    if (entries !== undefined && !Array.isArray(entries)) {
      process.stderr.write(`  warning: ${claudeSettingsPath} has a non-array ${event} hook value; skipped\n`);
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
    fs.writeFileSync(claudeSettingsPath, JSON.stringify(settings, null, 2) + "\n");
  }
  const summary = [
    added.length ? `added ${added.join(", ")} (${runtime}) in ${claudeSettingsPath}` : "",
    prunedStale ? "pruned stale orch entries" : "",
  ].filter(Boolean).join("; ") || "already configured";
  process.stdout.write(`Claude Code hooks: ${summary}\n`);
  if (!fs.existsSync(shim)) {
    process.stderr.write(`  warning: ${shim} is not built yet - run: bun run build\n`);
  }
}

/** Copy the packaged Claude Code agent definitions into ~/.claude/agents. */
function installClaudeAgents(pkgRoot: string): void {
  const agentsSrc = path.join(pkgRoot, "agents");
  if (!fs.existsSync(agentsSrc)) return;
  process.stdout.write("Claude Code agents:\n");
  for (const a of fs.readdirSync(agentsSrc)) {
    const dest = path.join(HOME, ".claude", "agents", a);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(path.join(agentsSrc, a), dest);
    process.stdout.write(`  ${dest}\n`);
  }
}

/**
 * Claude Code adapter. Presence fidelity is coarse by design: `working` on
 * SessionStart, `blocked` on Notification, `done`/`idle` on Stop, and nothing
 * in between — Claude's hooks fire only at those three points, so there are
 * no mid-run tool/token/cost transitions the way pi's live extension reports
 * them. State and session-tail data are supplied by extensions/claude/index.ts.
 */
const CLAUDE_HOOK_EVENTS = ["SessionStart", "Stop", "Notification"] as const;

/** Every command string registered under one Claude hook event, ignoring malformed entries. */
function registeredHookCommands(settings: Record<string, unknown>, event: string): string[] {
  const entries = isRecord(settings.hooks) ? settings.hooks[event] : undefined;
  if (!Array.isArray(entries)) return [];
  const hooks = entries.flatMap((entry): unknown[] => (isRecord(entry) && Array.isArray(entry.hooks) ? entry.hooks : []));
  return hooks.flatMap((hook) =>
    isRecord(hook) && hook.type === "command" && typeof hook.command === "string" ? [hook.command] : []);
}

/** Events whose orch hook is unregistered or left over from a build under another runtime. */
function staleHookEvents(settings: Record<string, unknown>, shim: string, runtime: OrchRuntime): string[] {
  return CLAUDE_HOOK_EVENTS.filter((event) =>
    !registeredHookCommands(settings, event).includes(claudeHookCommand(shim, event, runtime, orchDir())));
}

class ClaudeAdapter implements AgentAdapter {
  readonly id = "claude" as const;

  /** Claude has no inbox or answer protocol; hooks provide state/session tails. */
  readonly capabilities = {
    steer: "keys" as const,
    ask: false,
    setModel: false,
    sessionTail: true,
    registersPresenceOnStart: true,
    lifecycle: [] as const,
    enforcesCommandLocks: false,
  };

  /** State is authoritative only when the Claude settings hooks are installed. */
  readonly hookDriven = true;

  /** Claude Code exports CLAUDECODE=1 into every subprocess it runs. */
  readonly sessionEnvMarker = "CLAUDECODE";

  /** Claude Code exports its per-session UUID, telling parallel sessions apart. */
  readonly sessionIdEnv = "CLAUDE_CODE_SESSION_ID";

  /** Start Claude Code directly in an interactive backend session. */
  interactiveCmd(opts: SpawnOpts): string {
    return opts.model ? `claude --model ${opts.model}` : "claude";
  }

  /** Run Claude Code's print mode for detached workers. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const command = ["claude", "-p"];
    if (opts.model) command.push("--model", opts.model);
    command.push(prompt);
    return command;
  }

  /** Read the status written by Claude's SessionStart/Stop/Notification hooks. */
  detectState(input: ClaudeStateDetectionInput): AgentState {
    const presence = presenceFor(input.key);
    if (presence) {
      const status = statusForPresence(presence);
      if (status) return stateFrom(status.state);
    }
    if (input.signal || (input.exitCode !== undefined && input.exitCode !== 0)) return "error";
    if (input.exitCode === 0) return "done";
    return "unknown";
  }

  /** Claude has no inbox; the caller must route degraded steering via the target backend. */
  steer(_request: SteerRequest): AdapterCommand | undefined {
    return undefined;
  }

  /** Claude has no answer protocol; the caller must route via the target backend. */
  answer(_request: AnswerRequest): AdapterCommand | undefined {
    return undefined;
  }

  /** Claude Code takes an alias or a dated model id, never a provider/id spec. It ships
   *  no machine-readable catalogue, so its accepted vocabulary is declared here — in the
   *  adapter that owns it — rather than guessed at by orch. */
  listModels(): readonly HarnessModel[] {
    return CLAUDE_MODELS;
  }

  /** Prefer hook result.json, then Claude transcript JSONL, then native output. */
  extractResult(input: ClaudeResultExtractionInput): string | undefined {
    const presence = presenceFor(input.key);
    const result = presence?.result;
    const resultText = textValue(isRecord(result) ? result.text : undefined);
    if (resultText !== undefined) return resultText;

    const statusTranscript = presence?.status?.sessionPath;
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

  /** Install the settings.json presence hooks and copy the packaged subagent definitions.
   *  Skills are not installed here: they are read by every harness, so setup writes them
   *  once into the configured roots rather than once per adapter. */
  installShim(): void {
    const root = packageRoot();
    installClaudeHooks(root);
    installClaudeAgents(root);
  }

  /** Verify the same Claude hook entries written by installShim. */
  diagnoseShim(): CheckResult {
    const settingsPath = path.join(HOME, ".claude", "settings.json");
    const id = "claude-hooks";
    const label = "Claude hooks shim";
    let raw: string;
    try {
      raw = fs.readFileSync(settingsPath, "utf8");
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { id, label, status: "ok", detail: "Claude is not set up (no settings.json)" };
      }
      return { id, label, status: "warn", detail: `could not read ${settingsPath}; fix: run orch setup` };
    }
    let settings: unknown;
    try {
      settings = JSON.parse(raw);
    } catch {
      return { id, label, status: "warn", detail: `malformed ${settingsPath}; fix: run orch setup` };
    }
    if (!isRecord(settings)) return { id, label, status: "warn", detail: `malformed ${settingsPath}; fix: run orch setup` };

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
      runtime = declaredRuntime(orchDir());
    } catch {
      // checkConfig owns the malformed-settings detail; a broken config must not
      // crash an unrelated diagnostic.
      return { id, label, status: "warn", detail: "cannot determine the declared runtime; fix: run orch setup" };
    }
    const missing = staleHookEvents(settings, shim, runtime);
    // Repairing drift IS reinstalling: installShim is idempotent and additive.
    return missing.length
      ? {
          id,
          label,
          status: "warn",
          detail: `missing or stale orch hook${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
          fix: { description: `reinstall orch's Claude hooks (${missing.join(", ")})`, apply: () => { this.installShim(); } },
        }
      : { id, label, status: "ok", detail: `all orch Claude hooks are current (${shim})` };
  }
}

/** Shared Claude adapter instance for command wiring. */
export const claudeAdapter = new ClaudeAdapter();
