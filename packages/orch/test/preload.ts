import { readdirSync } from "node:fs";

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
  const names = readdirSync("src/backends", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name.toUpperCase());
  return names.length > 0 ? names : ["HERDR", "TMUX"];
}

const prefixes = new Set([...plexerEnvPrefixes(), "TMUX"]);
for (const name of Object.keys(process.env)) {
  const head = name.split("_")[0] ?? name;
  if (prefixes.has(head)) delete process.env[name];
}
