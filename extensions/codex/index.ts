/**
 * Codex `notify` program shim for orch presence.
 *
 * Bundled by `bun run build:notify` into dist/scripts/codex-notify.js as plain
 * node-compatible ESM. Codex spawns its configured `notify` program with a
 * single JSON string argument describing the event (fire-and-forget, no
 * stdin/stdout read back) — the shim runs under WHATEVER runtime the user has
 * (node, deno, or bun; `codexAdapter.installShim()` probes their PATH), never
 * assumes one. Usage: `<runtime> <shim> <json>` (argv[2] is the JSON string).
 * Identity parsing stays in its one boundary module (src/backends/identity.ts);
 * the notify wire vocabulary stays in its one leaf module
 * (src/adapters/codex-events.ts, which the adapter itself delegates to — the
 * adapter proper is setup-time code this shim must not carry); the presence
 * write goes through the one shared writer (src/presence/writer.ts).
 */
import { detectCodexState, extractCodexResult } from "../../src/adapters/codex-events.ts";
import { parseIdentity } from "../../src/backends/identity.ts";
import { activePaneHud } from "../../src/backends/hud.ts";
import { PRESENCE_SCHEMA } from "../../src/presence/schema.ts";
import { ensurePresenceAgentDir, readStatus, writeResult, writeStatus } from "../../src/presence/writer.ts";
import { isRecord, parsePid, projectRoot, type JsonRecord } from "../../src/util.ts";
import { textValue, truncateOptional } from "../../src/util.ts";

const AGENT_ID = "codex";
const MAX_TEXT = 400;
function parsePayload(raw: string | undefined): JsonRecord {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    return isRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

// A hook/notify program is short-lived; its parent is the long-lived codex process.
function agentPid(): number {
  return parsePid(process.env.CODEX_PID) ?? parsePid(process.ppid) ?? process.pid;
}

// No ORCH_AGENT_KEY means a regular (non-orch) codex session — nothing to
// record, exit silently. Only a present-but-malformed key is a wiring error.
const key = process.env.ORCH_AGENT_KEY;
if (!key) process.exit(0);
try {
  parseIdentity(key);
} catch (error: unknown) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

const raw = process.argv[2];
const payload = parsePayload(raw);

const directory = ensurePresenceAgentDir(key);
if (!directory) process.exit(0);

const previous = readStatus(directory);
const now = new Date().toISOString();
const paneId = activePaneHud().paneHandle;
// Every codex notify event today is `agent-turn-complete`, fired only after a
// settled successful turn (design D1) — synthesizing exitCode: 0 here (never
// inside detectState itself) is what makes that resolve to "done" rather than
// the "idle" a bare completion record would otherwise produce.
const state = detectCodexState({ output: raw, exitCode: 0 });
const resultText = extractCodexResult({ output: raw });
// The headless backend mirrors the log path it recorded at spawn (D3a) into
// this env var so the notify write can stamp the same sessionPath the backend
// registry knows about, without ever scanning a directory for it.
const sessionPath = textValue(process.env.ORCH_AGENT_LOG) ?? textValue(previous.sessionPath);

const status: JsonRecord = {
  ...previous,
  schema: PRESENCE_SCHEMA,
  agent: AGENT_ID,
  key,
  paneId,
  pid: agentPid(),
  // Identity stamped at launch: this agent's display name and its spawner.
  label: textValue(process.env.ORCH_AGENT_NAME) ?? previous.label,
  spawnedBy: textValue(process.env.ORCH_SPAWNER) ?? previous.spawnedBy,
  spawnedByLabel: textValue(process.env.ORCH_SPAWNER_LABEL) ?? previous.spawnedByLabel,
  cwd: textValue(payload.cwd) ?? previous.cwd ?? process.cwd(),
  worktree: textValue(process.env.ORCH_AGENT_WORKTREE) ?? previous.worktree,
  branch: textValue(process.env.ORCH_AGENT_BRANCH) ?? previous.branch,
  project: projectRoot(),
  state,
  sessionPath,
  lastText: truncateOptional(resultText, MAX_TEXT) ?? textValue(previous.lastText),
  updatedAt: now,
  finishedAt: now,
};
writeStatus(directory, status);

if (resultText !== undefined) {
  writeResult(directory, {
    schema: PRESENCE_SCHEMA,
    agent: AGENT_ID,
    key,
    text: resultText,
    sessionPath,
    finishedAt: now,
  });
}
