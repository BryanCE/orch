import { mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/**
 * Strip the ambient plexer's environment before any test file loads.
 *
 * A developer running `bun test` from inside a herdr pane was handing the whole
 * suite that pane's coordinates: `currentSpace()` resolved to the ambient herdr
 * workspace, the space wall then filtered out every fixture-seeded agent, and
 * `resolveTarget` refused. Before refusals became throwable that refusal exited
 * the process, killing the RUNNER — the suite stopped mid-way with no summary and
 * every remaining file silently never ran.
 *
 * Telling the operator to remember `env -u HERDR_ENV …` is not a fix: the one
 * person who most needs the suite to be honest is the one who forgets. A test
 * that genuinely wants a plexer present sets the variable itself.
 *
 * Prefixes come from the backend directory names, the same derivation
 * `scripts/check-bridge.ts` uses, so a new plexer is covered without edits here.
 */
function plexerEnvPrefixes(): readonly string[] {
  const names = readdirSync(join(import.meta.dir, "..", "src", "backends"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.toUpperCase());
  return names.length > 0 ? names : ["HERDR", "TMUX"];
}

const prefixes = new Set([...plexerEnvPrefixes(), "TMUX"]);
for (const name of Object.keys(process.env)) {
  const head = name.split("_")[0] ?? name;
  if (prefixes.has(head)) delete process.env[name];
}

/**
 * Move HOME somewhere disposable before any test file loads, so no test can reach the
 * developer's live store.
 *
 * `orchDir()` is `ORCH_DIR ?? homedir()/.orch`, and ~70 files clear ORCH_DIR in their
 * teardown — the correct thing to do, since it restores the unset state. That makes the
 * unset state the one that has to be safe: a fixture seeded after a teardown, or by a test
 * that never named a store, landed in the real ~/.orch, wrote presence dirs there and
 * opened the real orch.db. Under `--parallel` every worker did it to the same file at once.
 *
 * Pinning ORCH_DIR alone cannot hold, because clearing it is legitimate. Moving HOME makes
 * the fallback itself a sandbox, so every path that resolves a home — the store, settings,
 * logs — lands there whatever a test does with the variable. `scripts/check-hermetic.ts`
 * is the gate that keeps this wired.
 */
const sandboxHome = mkdtempSync(join(tmpdir(), "orch-test-home-"));
process.env.HOME = sandboxHome;
process.env.USERPROFILE = sandboxHome;
