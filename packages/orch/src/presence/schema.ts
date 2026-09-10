// Leaf module on purpose: the bundled writers (extensions/pi/index.ts,
// extensions/claude/index.ts, extensions/codex/index.ts) inline their imports
// and must not drag store.ts's sqlite graph into their bundles. Keep this file
// constants-only — no imports, no I/O.

/** The one presence status.json schema stamp. There is exactly one current
 * shape, every record stamps this value, and anything else is malformed and
 * gets reaped. This stamp is 1 and DOES NOT MOVE (CLAUDE.md Rule 14). On a shape
 * change, fix every writer, reader, and test together — never the number. */
export const PRESENCE_SCHEMA = 1;

/* The presence protocol filenames. These are orch vocabulary, not any harness's
 * wire format — orch defines them and every harness conforms. This is their ONE
 * definition site; scripts/check-bridge.ts forbids the raw quoted strings
 * anywhere outside src/presence/. Each lives inside a presence agent directory
 * ($ORCH_DIR/agents/<KEY>/). */

/** Agent-written liveness/state record. Written by every harness artifact. */
export const STATUS_FILE = "status.json";
/** Agent-appended turn output, one line per settled dispatch. The newest line is
 * the current result; the ones above it are that agent's history. */
export const RESULTS_FILE = "results.jsonl";
/** Orchestrator-appended steer/command lines; the agent claim-renames to drain. */
export const INBOX_FILE = "inbox.jsonl";
/** Orchestrator-written reply to an agent's ask; the agent consumes and unlinks. */
export const ANSWER_FILE = "answer.json";
/** Agent-appended delivery markers; the daemon consumes and truncates. */
export const ACK_FILE = "ack.jsonl";
/** Agent-written blocking question; the orchestrator answers, the agent unlinks. */
export const QUESTION_FILE = "question.json";
/** Agent-appended outcome of each control command (model/thinking), one line
 * each. History for a human; the live reply travels over the daemon. */
export const OUTCOMES_FILE = "outcomes.jsonl";
