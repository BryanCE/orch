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
 * Presence fidelity is coarse by design: hooks report over the daemon socket;
 * orchd is down -> the report is dropped and history has a gap; the agent keeps
 * running.
 */
import { readFileSync } from "node:fs";
import { readJsonStdin } from "../../src/presence/writer.ts";
import { presenceSession } from "../../src/presence/session.ts";
import { reportOnce } from "../../src/presence/socket-client.ts";
import { isRecord, projectRoot, textValue, truncateOptional } from "../../src/util.ts";
import { lastAssistantFromJsonl } from "../../src/adapters/transcript.ts";
import { prepareWorkerTask } from "../../src/worker-prompt.ts";
import type { JsonRecord } from "../../src/types/core.ts";
import type { StatusPatch } from "../../src/types/presence.ts";

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

function modelValue(input: JsonRecord): { provider: string; id: string } | undefined {
  const model = input.model ?? input.model_id ?? input.modelId;
  if (typeof model === "string" && model.trim()) return { provider: "anthropic", id: model.trim() };
  if (isRecord(model) && typeof model.id === "string") {
    return { provider: typeof model.provider === "string" ? model.provider : "anthropic", id: model.id };
  }
  return undefined;
}

const input = readJsonStdin();
const sessionId = textValue(input.session_id ?? input.sessionId);
const session = presenceSession(sessionId);
if (session.kind === "not-orch") process.exit(0);
const cliEvent = process.argv.slice(2).find((argument) => !argument.startsWith("-"));
const event = eventName(cliEvent, input);
const transcriptPath = textValue(input.transcript_path ?? input.transcriptPath);
const transcriptText = lastAssistantFromJsonl(readTranscript(transcriptPath));
const lastText = truncateOptional(transcriptText, MAX_TEXT);
const rawTask = input.task ?? input.prompt ?? input.initial_prompt;
const preparedTask = typeof rawTask === "string" ? prepareWorkerTask(rawTask, MAX_TASK) : undefined;
const patch: StatusPatch = {
  model: modelValue(input) ?? undefined,
  task: preparedTask ?? undefined,
  sessionPath: transcriptPath ?? undefined,
  sessionId: sessionId ?? undefined,
  lastText: lastText ?? undefined,
  project: projectRoot(),
};

if (event === "sessionstart" || event === "sessionstarted") {
  patch.state = "working";
  patch.startedAt = Date.now();
  patch.finishedAt = null;
  patch.blockedMessage = null;
} else if (event === "notification") {
  const message = textValue(input.message ?? input.notification ?? input.question) ?? "Claude is waiting for input";
  patch.state = "asking";
  patch.blockedMessage = message;
} else if (event === "stop" || event === "stopped") {
  patch.state = transcriptText ? "done" : "idle";
  patch.finishedAt = Date.now();
  patch.blockedMessage = null;
} else {
  process.exit(0);
}

await reportOnce(session.orchDir, "report-status", { key: session.key, status: patch }, session.timeoutMs);
if ((event === "stop" || event === "stopped") && transcriptText) {
  await reportOnce(session.orchDir, "report-result", {
    key: session.key,
    result: {
      text: transcriptText,
      sessionPath: transcriptPath ?? null,
      model: patch.model ?? null,
      finishedAt: Date.now(),
    },
  }, session.timeoutMs);
}
