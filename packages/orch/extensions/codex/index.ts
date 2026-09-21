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
 * adapter proper is setup-time code this shim must not carry); presence reports
 * go through the daemon socket.
 */
import { detectCodexState, extractCodexResult } from "orch/core/adapters/codex-events.ts";
import { presenceSession } from "orch/core/presence/session.ts";
import { reportOnce } from "orch/core/presence/socket-client.ts";
import { projectRoot, textValue, truncateOptional } from "orch/core/util.ts";
import type { StatusPatch } from "orch/core/types/presence.ts";

const MAX_TEXT = 400;

const session = presenceSession();
if (session.kind === "not-orch") process.exit(0);

const raw = process.argv[2];

// Every codex notify event today is `agent-turn-complete`, fired only after a
// settled successful turn (design D1) — synthesizing exitCode: 0 here (never
// inside detectState itself) is what makes that resolve to "done" rather than
// the "idle" a bare completion record would otherwise produce.
const state = detectCodexState({ output: raw, exitCode: 0 });
const resultText = extractCodexResult({ output: raw });
// The headless backend mirrors the log path it recorded at spawn (D3a) into
// this env var so the notify report can stamp the same sessionPath the backend
// registry knows about, without ever scanning a directory for it.
const sessionPath = textValue(process.env.ORCH_AGENT_LOG);
const finishedAt = Date.now();
const patch: StatusPatch = {
  state,
  lastText: truncateOptional(resultText, MAX_TEXT) ?? undefined,
  sessionPath: sessionPath ?? undefined,
  project: projectRoot(),
  finishedAt,
};

await reportOnce(session.orchDir, "report-status", { key: session.key, status: patch }, session.timeoutMs);
if (resultText !== undefined) {
  await reportOnce(session.orchDir, "report-result", {
    key: session.key,
    result: { text: resultText, sessionPath, finishedAt },
  }, session.timeoutMs);
}
