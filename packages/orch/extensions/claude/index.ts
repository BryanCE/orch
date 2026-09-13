/**
 * Claude Code settings.json hook shim for orch presence.
 *
 * Bundled by `bun run build:hooks` into dist/scripts/claude-hooks.js as plain
 * node-compatible ESM. The installed hook runs it with WHATEVER runtime the
 * user has — node, deno, or bun (`installClaudeHooks` probes their PATH);
 * never assume one. Usage: `<runtime> <shim> SessionStart|Stop|Notification`;
 * Claude sends the hook payload as JSON on stdin. Identity parsing stays in
 * its one boundary module (src/backends/identity.ts) and the presence writes go
 * through the one shared writer (src/presence/writer.ts) — this shim holds only
 * claude-specific transcript/hook-event parsing. The bundle inlines both.
 *
 * Presence fidelity is coarse by design: SessionStart writes `working`,
 * Notification writes `blocked`, and Stop writes `done`/`idle` — those are
 * the only three hook events this shim wires, so there are no mid-run
 * tool/token/cost transitions between them (unlike pi's live extension).
 */
import { readFileSync } from "node:fs";
import { PRESENCE_SCHEMA } from "../../src/presence/schema.ts";
import { launchStamp, readJsonStdin, readStatus, writeResult, writeStatus } from "../../src/presence/writer.ts";
import { baseStatus, presenceSession } from "../../src/presence/session.ts";
import { isRecord, projectRoot } from "../../src/util.ts";
import { textValue, truncateOptional } from "../../src/util.ts";
import { lastAssistantFromJsonl } from "../../src/adapters/transcript.ts";
import { prepareWorkerTask } from "../../src/worker-prompt.ts";
import type { JsonRecord } from "../../src/types/core.ts";

const AGENT_ID = "claude";
const MAX_TEXT = 400;
const MAX_TASK = 200;

/** Read a claude transcript file to raw JSONL, or undefined when absent/unreadable. */
function readTranscript(transcriptPath: string | undefined): string | undefined {
  if (!transcriptPath) return undefined;
  try {
    return readFileSync(transcriptPath, "utf8");
  } catch {
    return undefined;
  }
}


function eventName(argument: string | undefined, input: JsonRecord): string {
  const hookEventName = textValue(input.hook_event_name) ?? "";
  return (argument ?? hookEventName).toLowerCase().replace(/[^a-z]/g, "");
}

function modelValue(input: JsonRecord): { provider?: string; id?: string } | undefined {
  const model = input.model ?? input.model_id ?? input.modelId;
  if (typeof model === "string" && model.trim()) return { provider: "anthropic", id: model.trim() };
  if (isRecord(model) && typeof model.id === "string") {
    return { provider: typeof model.provider === "string" ? model.provider : "anthropic", id: model.id };
  }
  return undefined;
}

const session = presenceSession();
if (session.kind === "not-orch") process.exit(0);

const input = readJsonStdin();
const cliEvent = process.argv.slice(2).find((argument) => !argument.startsWith("-"));
const event = eventName(cliEvent, input);
const transcriptPath = textValue(input.transcript_path ?? input.transcriptPath);
const now = new Date().toISOString();
const previous = readStatus(session.directory);
const model = modelValue(input) ?? previous.model;
const rawTask = input.task ?? input.prompt ?? input.initial_prompt;
const preparedTask = typeof rawTask === "string" ? prepareWorkerTask(rawTask, MAX_TASK) : undefined;
const task = textValue(preparedTask) ?? previous.task;
const sessionId = textValue(input.session_id ?? input.sessionId) ?? previous.sessionId;
const existingText = textValue(previous.lastText);
const transcriptText = lastAssistantFromJsonl(readTranscript(transcriptPath ?? textValue(previous.sessionPath)));
const lastText = truncateOptional(transcriptText ?? existingText, MAX_TEXT);

// No pid: a hook only ever sees the shell that ran it. Liveness is the process
// orch recorded at spawn (Rule 11), never a guess written here.
const status: JsonRecord = {
  ...launchStamp(previous, AGENT_ID, session.key),
  ...baseStatus({
    cwd: textValue(input.cwd) ?? textValue(previous.cwd) ?? process.cwd(),
    project: projectRoot(),
    lastText: lastText ?? null,
    updatedAt: now,
  }),
  model,
  task,
  sessionPath: transcriptPath ?? previous.sessionPath,
  sessionId,
};

if (event === "sessionstart" || event === "sessionstarted") {
  status.state = "working";
  status.startedAt = previous.startedAt ?? now;
  delete status.finishedAt;
  delete status.asking;
  delete status.blockedMessage;
} else if (event === "notification") {
  const message = textValue(input.message ?? input.notification ?? input.question) ?? "Claude is waiting for input";
  const askingId = textValue(input.id ?? input.request_id ?? input.requestId) ?? `claude-${process.pid}-${Date.now()}`;
  status.state = "blocked";
  status.blockedMessage = message;
  status.asking = { question: truncateOptional(message, MAX_TASK) ?? message, id: askingId, ts: now };
} else if (event === "stop" || event === "stopped") {
  status.state = transcriptText || existingText ? "done" : "idle";
  status.finishedAt = now;
  delete status.asking;
  delete status.blockedMessage;
  if (transcriptText) {
    writeResult(session.directory, {
      schema: PRESENCE_SCHEMA,
      agent: AGENT_ID,
      key: session.key,
      text: transcriptText,
      sessionPath: status.sessionPath,
      model: status.model,
      cost: status.cost,
      finishedAt: now,
    });
  }
} else {
  // Unknown hook names should not corrupt a previously useful status row.
  process.exit(0);
}

writeStatus(session.directory, status);
