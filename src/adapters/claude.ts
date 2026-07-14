import { readFileSync } from "node:fs";
import { loadPresence, statusForPresence, type PresenceEntry } from "../store.ts";
import type {
  AdapterCommand,
  AgentAdapter,
  AgentState,
  AnswerRequest,
  ResultExtractionInput,
  SpawnOpts,
  StateDetectionInput,
  SteerRequest,
} from "./adapter.ts";

/** State input for Claude, identified by its hook-owned presence key. */
export interface ClaudeStateDetectionInput extends StateDetectionInput {
  readonly key: string;
}

/** Result input for Claude, identified by its hook-owned presence key. */
export interface ClaudeResultExtractionInput extends ResultExtractionInput {
  readonly key: string;
}

/** Claude's hooks provide authoritative state updates (rather than heuristics). */
export const CLAUDE_STATE_HOOK_MARKER = "hookDriven" as const;

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

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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
    return readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
}

function stateFrom(value: unknown): AgentState {
  return typeof value === "string" && AGENT_STATES.has(value as AgentState)
    ? value as AgentState
    : "unknown";
}

export function presenceFor(key: string): PresenceEntry | undefined {
  return loadPresence().get(key);
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function paneFor(request: { key: string; opts?: SpawnOpts }): string {
  return request.opts?.env?.HERDR_PANE_ID ?? request.key;
}

function degradedKeysCommand(pane: string, text: string): AdapterCommand {
  // `herdr agent send` injects text into the pane's foreground agent.  The
  // adapter deliberately does not pretend this is lossless (or an inbox).
  return { argv: ["herdr", "agent", "send", pane, text] };
}

/** Claude Code adapter; lifecycle state/result data is supplied by scripts/claude-hooks.ts. */
export class ClaudeAdapter implements AgentAdapter {
  readonly id = "claude" as const;

  /** Claude has no inbox or answer protocol; hooks provide state/session tails. */
  readonly caps = {
    steer: "keys" as const,
    ask: false,
    setModel: false,
    sessionTail: true,
  };

  /** State is authoritative only when the Claude settings hooks are installed. */
  readonly hookDriven = true;

  /** Start Claude Code directly in an interactive herdr pane. */
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

  /** Degraded pane injection: no Claude inbox exists, so warn and send text. */
  steer(request: SteerRequest): AdapterCommand {
    const pane = paneFor(request);
    console.warn(`warning: Claude has no inbox; steering ${pane} via herdr agent send (keys fallback)`);
    return degradedKeysCommand(pane, request.text);
  }

  /** Answers use the same best-effort pane injection as steering. */
  answer(request: AnswerRequest): AdapterCommand {
    const pane = paneFor(request);
    console.warn(`warning: Claude has no answer protocol; answering ${pane} via herdr agent send (keys fallback)`);
    return degradedKeysCommand(pane, request.text);
  }

  /** Prefer hook result.json, then Claude transcript JSONL, then native output. */
  extractResult(input: ClaudeResultExtractionInput): string | undefined {
    const presence = presenceFor(input.key);
    const resultText = textValue(presence?.result?.text);
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
}

/** Shared Claude adapter instance for command wiring. */
export const claudeAdapter = new ClaudeAdapter();
