// Leaf module on purpose: the bundled writers (extensions/pi/index.ts,
// extensions/claude/index.ts, extensions/codex/index.ts) inline their imports
// and must not drag store.ts's sqlite graph into their bundles. Keep this file
// constants-only — no imports, no I/O.

/** The one presence status.json schema stamp. There is exactly one current
 * shape, every record stamps this value, and anything else is malformed and
 * gets reaped. This stamp is 1 and DOES NOT MOVE (CLAUDE.md Rule 14). On a shape
 * change, fix every writer, reader, and test together — never the number. */
export const PRESENCE_SCHEMA = 1;

/* The presence directory holds the agent's status record and its history;
 * control traffic travels over the daemon socket. */

/** orchd-appended status history, one line per report the daemon accepted. History
 * for a human and jq; nothing reads it back. */
export const STATUS_LOG_FILE = "status.jsonl";
/** Agent-appended turn output, one line per settled dispatch. The newest line is
 * the current result; the ones above it are that agent's history. */
export const RESULTS_FILE = "results.jsonl";
/** Agent-appended outcome of each control command (model/thinking), one line
 * each. History for a human; the live reply travels over the daemon. */
export const OUTCOMES_FILE = "outcomes.jsonl";
