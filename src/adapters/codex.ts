import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { binaryOnPath, errorMessage, packageRoot } from "../util.ts";
import { CODEX_NOTIFY_RUNTIMES, codexNotifyArgv, codexNotifyShimPath, editCodexNotifyConfig } from "./codex-notify.ts";
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
import type { CheckResult } from "../doctor-types.ts";

/** Codex's notify hook event emitted after an agent turn has settled. */
export const CODEX_TURN_COMPLETE = "agent-turn-complete";

/**
 * Codex does not expose an orch presence writer of its own.  States inferred
 * from process output/session files are therefore marked as fallback data.
 * A notify completion (or permission hook) is the only authoritative signal.
 */
export const CODEX_STATE_FALLBACK_MARKER = "stateFallback" as const;

/** Additional native files accepted by the Codex result extractor. */
export interface CodexResultExtractionInput extends ResultExtractionInput {
  /** File passed to `codex exec --output-last-message`, when available. */
  readonly lastMessagePath?: string;
  /** Descriptive alias accepted by callers that retain the CLI flag name. */
  readonly outputLastMessagePath?: string;
}

const COMPLETION_EVENTS = new Set([
  CODEX_TURN_COMPLETE,
  "agent_turn_complete",
  "turn.completed",
  "turn-complete",
  "turn_complete",
]);
const PERMISSION_EVENTS = new Set(["PermissionRequest", "permission-request", "permission_request"]);
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseRecords(output?: string): JsonRecord[] {
  if (!output?.trim()) return [];
  const records: JsonRecord[] = [];
  const whole = output.trim();
  try {
    const parsed: unknown = JSON.parse(whole);
    if (isRecord(parsed)) records.push(parsed);
    else if (Array.isArray(parsed)) {
      for (const item of parsed) if (isRecord(item)) records.push(item);
    }
  } catch {
    // Codex --json is JSONL; a non-JSON log line is expected and ignored.
  }
  for (const line of output.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) records.push(parsed);
    } catch {
      // Keep scanning JSONL after human-readable CLI output.
    }
  }
  return records;
}

function eventName(record: JsonRecord): string | undefined {
  for (const key of ["type", "event", "event_type", "hook_event_name", "name"]) {
    const value = record[key];
    if (typeof value === "string") return value;
  }
  return undefined;
}

function nestedRecords(record: JsonRecord): JsonRecord[] {
  const result: JsonRecord[] = [];
  for (const key of ["payload", "event", "notify", "data", "item", "message"]) {
    const value = record[key];
    if (isRecord(value)) result.push(value);
  }
  return result;
}

function hasEvent(record: JsonRecord, events: ReadonlySet<string>): boolean {
  const name = eventName(record);
  if (name && events.has(name)) return true;
  return nestedRecords(record).some((nested) => hasEvent(nested, events));
}

function textValue(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value;
}

/** Find the notify payload's direct final assistant field, including nested payloads. */
function notifyText(record: JsonRecord): string | undefined {
  for (const key of ["last-assistant-message", "lastAssistantMessage", "last_assistant_message"]) {
    const value = textValue(record[key]);
    if (value !== undefined) return value;
  }
  for (const nested of nestedRecords(record)) {
    const value = notifyText(nested);
    if (value !== undefined) return value;
  }
  return undefined;
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

/** Extract assistant text from Codex's public JSONL stream or native transcript. */
function assistantText(record: JsonRecord): string | undefined {
  const role = record.role;
  const message = isRecord(record.message) ? record.message : undefined;
  const item = isRecord(record.item) ? record.item : undefined;
  const payload = isRecord(record.payload) ? record.payload : undefined;
  const itemType = typeof item?.type === "string" ? item.type : typeof record.item_type === "string" ? record.item_type : "";
  if (role === "assistant" || message?.role === "assistant" || payload?.role === "assistant") {
    return contentText(record.content ?? message?.content ?? payload?.content ?? record.text);
  }
  if (["agent_message", "assistant_message", "output_text", "message"].includes(itemType)) {
    return contentText(item?.content ?? item?.text ?? record.content ?? record.text);
  }
  for (const nested of nestedRecords(record)) {
    const text = assistantText(nested);
    if (text !== undefined) return text;
  }
  return undefined;
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function readTextFile(file: string | undefined): string | undefined {
  if (!file) return undefined;
  try {
    return textValue(readFileSync(file, "utf8"));
  } catch {
    return undefined;
  }
}

function transcriptResult(file: string | undefined): string | undefined {
  const raw = readTextFile(file);
  if (!raw) return undefined;
  let last: string | undefined;
  for (const line of raw.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed: unknown = JSON.parse(line);
      if (isRecord(parsed)) {
        const notify = notifyText(parsed);
        if (notify !== undefined) last = notify;
        const assistant = assistantText(parsed);
        if (assistant !== undefined) last = assistant;
      }
    } catch {
      // Native transcripts are JSONL; malformed lines do not invalidate the tail.
    }
  }
  return last;
}

/** Whether a state relies on a process/session heuristic rather than notify. */
export function codexStateFallback(input: StateDetectionInput): boolean {
  const records = parseRecords(input.output);
  return !records.some((record) => hasEvent(record, COMPLETION_EVENTS) || hasEvent(record, PERMISSION_EVENTS));
}

/**
 * Wire the orch notify shim into `~/.codex/config.toml`'s top-level `notify`
 * key (D2a fallback). A cleaner per-spawn `-c notify=[...]` override exists on
 * current Codex CLI versions (`-c key=value` overlays ConfigToml) and needs no
 * global-config write at all, but wiring it requires changing every codex
 * spawn command (`interactiveCmd`/`headlessCmd`), which is out of scope here;
 * this fallback covers `orch setup` and any codex session not launched
 * through orch's own argv. Never overwrites a foreign value (law #5).
 */
function installCodexNotifyShim(root: string): void {
  const shim = codexNotifyShimPath(root);
  const runtime = CODEX_NOTIFY_RUNTIMES.find(binaryOnPath) ?? "node";
  const argv = codexNotifyArgv(shim, runtime);
  const codexDir = join(homedir(), ".codex");
  const configPath = join(codexDir, "config.toml");

  let raw = "";
  if (existsSync(configPath)) {
    try {
      raw = readFileSync(configPath, "utf8");
    } catch (error: unknown) {
      process.stderr.write(`  warning: could not read ${configPath}; Codex notify not changed (${errorMessage(error)})\n`);
      return;
    }
  }

  const edit = editCodexNotifyConfig(raw, argv);
  if (edit.status === "ambiguous") {
    process.stderr.write(`  warning: could not read the top-level notify key in ${configPath}; Codex notify not changed\n`);
    return;
  }
  if (edit.status === "foreign") {
    process.stderr.write(
      `  warning: ${configPath} already has a non-orch notify program (${edit.foreignValue}); leaving it — `
      + "codex notify presence is disabled (headless session-tail parsing still works)\n",
    );
    return;
  }
  if (edit.status === "unchanged") {
    process.stdout.write(`Codex notify: already configured (${runtime}) in ${configPath}\n`);
    return;
  }
  mkdirSync(codexDir, { recursive: true });
  writeFileSync(configPath, edit.text);
  process.stdout.write(`Codex notify: ${edit.status === "inserted" ? "added" : "updated"} (${runtime}) in ${configPath}\n`);
  if (!existsSync(shim)) {
    process.stderr.write(`  warning: ${shim} is not built yet — run: bun run build\n`);
  }
}

/** Codex CLI adapter using notify completion events and resume-based steering. */
export class CodexAdapter implements AgentAdapter {
  readonly id = "codex" as const;

  /** Codex cannot ask through orch or switch a live model; resume is degraded steering. */
  readonly caps = {
    steer: "resume" as const,
    ask: false,
    setModel: false,
    sessionTail: true,
    lifecycle: [] as const,
    enforcesCommandLocks: false,
  };

  /** Marker consumed by callers that render heuristic states with a dagger. */
  readonly stateFallback = true;

  interactiveCmd(opts: SpawnOpts): string {
    const command = ["codex"];
    if (opts.model) command.push("--model", shellQuote(opts.model));
    return command.join(" ");
  }

  /** Run Codex's documented JSON event stream in a detached process. */
  headlessCmd(prompt: string, opts: SpawnOpts): string[] {
    const command = ["codex", "exec", "--json"];
    if (opts.model) command.push("--model", opts.model);
    command.push(prompt);
    return command;
  }

  /**
   * Notify is authoritative for turn completion/permission events.  Without
   * it, process and JSONL signals intentionally expose only coarse fallback
   * states; silence is never interpreted as blocked.
   */
  detectState(input: StateDetectionInput): AgentState {
    const records = parseRecords(input.output);
    if (records.some((record) => hasEvent(record, PERMISSION_EVENTS))) return "blocked";

    if (input.signal || (input.exitCode !== undefined && input.exitCode !== 0)) return "error";
    const completed = records.some((record) => hasEvent(record, COMPLETION_EVENTS));
    if (completed) return input.exitCode === 0 ? "done" : "idle";
    if (input.exitCode === 0) return "done";
    // A running process is the only available fallback when no notify arrived.
    return "working";
  }

  /** Resume a headless session; callers may set CODEX_INTERACTIVE=1 for a pane continuation. */
  steer(request: SteerRequest): AdapterCommand {
    const sessionId = request.opts?.env?.CODEX_SESSION_ID ?? request.key;
    const interactive = request.opts?.env?.CODEX_INTERACTIVE === "1";
    return {
      argv: interactive
        ? ["codex", "resume", sessionId, request.text]
        : ["codex", "exec", "resume", sessionId, request.text],
    };
  }

  /** Codex has no proven blocking answer protocol. */
  // fallow-ignore-next-line unused-class-member
  answer(_request: AnswerRequest): AdapterCommand | undefined {
    return undefined;
  }

  /** Notify text → output-last-message file → native JSONL transcript. */
  extractResult(input: CodexResultExtractionInput): string | undefined {
    const records = parseRecords(input.output);
    for (let index = records.length - 1; index >= 0; index--) {
      const value = notifyText(records[index]!);
      if (value !== undefined) return value;
    }
    const lastMessage = readTextFile(input.lastMessagePath ?? input.outputLastMessagePath);
    if (lastMessage !== undefined) return lastMessage;
    for (let index = records.length - 1; index >= 0; index--) {
      const value = assistantText(records[index]!);
      if (value !== undefined) return value;
    }
    return transcriptResult(input.sessionPath);
  }

  /**
   * Read the headless `--json` log at the recorded session path (D3a) through
   * the same state/result parsers notify and headless output use. Returns
   * undefined when no log path was recorded — it never scans a directory for
   * one, since headless logs are flat under `$ORCH_DIR/logs/`, not per-agent.
   */
  readSessionView(input: SessionViewInput): SessionView | undefined {
    const output = readTextFile(input.sessionPath);
    if (output === undefined) return undefined;
    return {
      state: this.detectState({ output }),
      lastText: this.extractResult({ output }),
    };
  }

  /** Verify the top-level notify artifact written by installShim. */
  // fallow-ignore-next-line unused-class-member
  diagnoseShim(): CheckResult {
    const configPath = join(homedir(), ".codex", "config.toml");
    const shim = codexNotifyShimPath(packageRoot());
    if (!existsSync(shim)) return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `${shim} is missing; fix: run orch setup` };
    let raw: string;
    try { raw = readFileSync(configPath, "utf8"); }
    catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `missing ${configPath}; fix: run orch setup` };
      return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `could not read ${configPath}; fix: run orch setup` };
    }
    const line = raw.split(/\r?\n/).find((entry) => /^\s*notify\s*=/.test(entry));
    if (!line) return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `missing notify in ${configPath}; fix: run orch setup` };
    if (!line.includes("codex-notify")) return { id: "codex-notify", label: "Codex notify shim", status: "warn", detail: `foreign notify in ${configPath}; orch notify is disabled` };
    return { id: "codex-notify", label: "Codex notify shim", status: "ok", detail: `Codex notify shim is current (${shim})` };
  }

  /** Register the orch notify shim as codex's completion writer (D2/D2a). */
  // fallow-ignore-next-line unused-class-member
  installShim(): void {
    installCodexNotifyShim(packageRoot());
  }
}

/** Shared Codex adapter instance for command wiring. */
export const codexAdapter = new CodexAdapter();
