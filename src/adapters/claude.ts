import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { isRecord, loadPresence, statusForPresence, type PresenceEntry } from "../store.ts";
import { CLAUDE_HOOK_RUNTIMES, claudeHookCommand, claudeHookShimPath } from "./claude-hooks.ts";
import { binaryOnPath, errorMessage, packageRoot } from "../util.ts";
import type {
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

/** State input for Claude, identified by its hook-owned presence key. */
interface ClaudeStateDetectionInput extends StateDetectionInput {
  readonly key: string;
}

/** Result input for Claude, identified by its hook-owned presence key. */
interface ClaudeResultExtractionInput extends ResultExtractionInput {
  readonly key: string;
}

const AGENT_STATES = new Set<AgentState>([
  "idle",
  "working",
  "blocked",
  "done",
  "error",
  "aborted",
  "exited",
  "unknown",
]);

type JsonRecord = Record<string, unknown>;

function textValue(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

function contentText(value: unknown): string | undefined {
  if (typeof value === "string") return textValue(value);
  if (Array.isArray(value)) {
    const parts = value.map(contentText).filter((part): part is string => part !== undefined);
    return parts.length ? parts.join("\n") : undefined;
  }
  if (!isRecord(value)) return undefined;
  for (const key of ["text", "output_text", "output-text", "content"]) {
    const text = contentText(value[key]);
    if (text !== undefined) return text;
  }
  return undefined;
}

function assistantText(record: JsonRecord): string | undefined {
  const message = isRecord(record.message) ? record.message : undefined;
  const role = record.role ?? message?.role;
  if (role === "assistant") {
    return contentText(record.content ?? message?.content ?? record.text ?? message?.text);
  }
  // Claude transcripts commonly wrap messages in a {type:"assistant"} entry.
  if (record.type === "assistant" || record.type === "assistant_message") {
    return contentText(record.content ?? message?.content ?? record.text ?? message?.text);
  }
  for (const key of ["data", "payload", "item"]) {
    if (isRecord(record[key])) {
      const text = assistantText(record[key]);
      if (text !== undefined) return text;
    }
  }
  return undefined;
}

function assistantFromTranscript(raw: string | undefined): string | undefined {
  if (!raw?.trim()) return undefined;
  let last: string | undefined;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) {
        const text = assistantText(parsed);
        if (text !== undefined) last = text;
      } else if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (isRecord(item)) {
            const text = assistantText(item);
            if (text !== undefined) last = text;
          }
        }
      }
    } catch {
      // Claude transcript files are JSONL; continue past malformed/log lines.
    }
  }
  return last;
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
  return typeof value === "string" && AGENT_STATES.has(value as AgentState)
    ? value as AgentState
    : "unknown";
}

function presenceFor(key: string): PresenceEntry | undefined {
  return loadPresence().get(key);
}

const HOME = os.homedir();

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
  // The shim is plain ESM JS; wire it to whichever runtime this user has.
  const runtime = CLAUDE_HOOK_RUNTIMES.find(binaryOnPath) ?? "node";
  const added: string[] = [];
  let prunedStale = false;
  const hooks = isRecord(settings.hooks) ? settings.hooks : (settings.hooks === undefined ? {} : null);
  if (!hooks) {
    process.stderr.write(`  warning: ${claudeSettingsPath} has a non-object hooks value; Claude hooks not changed\n`);
    return;
  }
  settings.hooks = hooks;
  for (const event of ["SessionStart", "Stop", "Notification"] as const) {
    const command = claudeHookCommand(shim, event, runtime);
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
    process.stderr.write(`  warning: ${shim} is not built yet — run: bun run build\n`);
  }
}

/** Copy the packaged Claude Code skills into ~/.claude/skills. */
function installClaudeSkills(pkgRoot: string): void {
  const skillsSrc = path.join(pkgRoot, "skills", "claude");
  if (!fs.existsSync(skillsSrc)) return;
  process.stdout.write("Claude Code skills:\n");
  for (const s of fs.readdirSync(skillsSrc)) {
    const dest = path.join(HOME, ".claude", "skills", s);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.rmSync(dest, { recursive: true, force: true });
    fs.cpSync(path.join(skillsSrc, s), dest, { recursive: true });
    process.stdout.write(`  ${dest}\n`);
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
 * them. State and session-tail data are supplied by scripts/claude-hooks.ts.
 */
class ClaudeAdapter implements AgentAdapter {
  readonly id = "claude" as const;

  /** Claude has no inbox or answer protocol; hooks provide state/session tails. */
  readonly caps = {
    steer: "keys" as const,
    ask: false,
    setModel: false,
    sessionTail: true,
    lifecycle: [] as const,
  };

  /** State is authoritative only when the Claude settings hooks are installed. */
  readonly hookDriven = true;

  /** Start Claude Code directly in an interactive backend session. */
  interactiveCmd(_opts: SpawnOpts): string {
    return "claude";
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

  /** Prefer hook result.json, then Claude transcript JSONL, then native output. */
  extractResult(input: ClaudeResultExtractionInput): string | undefined {
    const presence = presenceFor(input.key);
    const result = presence?.result;
    const resultText = textValue(isRecord(result) ? result.text : undefined);
    if (resultText !== undefined) return resultText;

    const statusTranscript = presence?.status?.sessionPath;
    const transcriptText = assistantFromTranscript(readTextFile(input.sessionPath ?? statusTranscript));
    if (transcriptText !== undefined) return transcriptText;

    const outputText = assistantFromTranscript(input.output);
    if (outputText !== undefined) return outputText;
    // Claude's print mode normally emits plain final text rather than JSONL.
    const plainOutput = textValue(input.output);
    if (plainOutput !== undefined) return plainOutput;

    return textValue(presence?.status?.lastText);
  }

  /** Read the transcript tail for the last assistant text; state stays presence-driven. */
  readSessionView(input: SessionViewInput): SessionView | undefined {
    const text = assistantFromTranscript(readTextFile(input.sessionPath) ?? input.output);
    return text === undefined ? undefined : { lastText: text };
  }

  /** Install the settings.json presence hooks and copy packaged skills/agents. */
  installShim(): void {
    const root = packageRoot();
    installClaudeHooks(root);
    installClaudeSkills(root);
    installClaudeAgents(root);
  }
}

/** Shared Claude adapter instance for command wiring. */
export const claudeAdapter = new ClaudeAdapter();
