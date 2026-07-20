#!/usr/bin/env bun
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function fail(file: string, line: number, reason: string): never {
  console.log(`check:bridge FAIL ${file}:${line} ${reason}`);
  process.exit(1);
}

/** Repo-relative, forward-slashed path — the key shape every allowlist here uses.
 * `join` yields backslashes on Windows, where this check also runs. */
function relPathOf(file: string): string {
  return file.replace(/\\/g, "/");
}

type LineCheck = (line: string, relPath: string) => string | undefined;

function scanDirectory(directory: string, excluded: Set<string>, check: LineCheck, recursive = false): number {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory() && recursive) {
      count += scanDirectory(join(directory, entry.name), excluded, check, true);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".ts") || excluded.has(entry.name)) continue;
    const file = join(directory, entry.name);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const reason = check(lines[index]!, relPathOf(file));
      if (reason) fail(file, index + 1, reason);
    }
    count++;
  }
  return count;
}

function scanSrcOutsideBackends(check: LineCheck): number {
  const entries = readdirSync("src", { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory() && entry.name === "backends") continue;
    if (entry.isDirectory()) {
      count += scanDirectory(join("src", entry.name), new Set(), check, true);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
    const file = join("src", entry.name);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const reason = check(lines[index]!, relPathOf(file));
      if (reason) fail(file, index + 1, reason);
    }
    count++;
  }
  return count;
}

/**
 * Recursively scan a source tree for both `.ts` and `.tsx`, skipping any
 * `node_modules`. Used by the packages boundary scan (D2.1): web components are
 * `.tsx`, and a concrete backend/adapter import can hide in one just as easily
 * as in a `.ts` server module.
 */
function scanSourceTree(directory: string, check: LineCheck): number {
  const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (entry.name === "node_modules") continue;
      count += scanSourceTree(join(directory, entry.name), check);
      continue;
    }
    if (!entry.isFile() || (!entry.name.endsWith(".ts") && !entry.name.endsWith(".tsx"))) continue;
    const file = join(directory, entry.name);
    const lines = readFileSync(file, "utf8").split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
      const reason = check(lines[index]!, relPathOf(file));
      if (reason) fail(file, index + 1, reason);
    }
    count++;
  }
  return count;
}

/** Scan every `packages/<pkg>/src/**` tree. Missing `packages/` or a package
 * without `src/` is skipped, not an error (some checkouts ship core only). */
function scanPackagesSrc(check: LineCheck): number {
  let packageDirs: string[];
  try {
    packageDirs = readdirSync("packages", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return 0;
  }
  let count = 0;
  for (const pkg of packageDirs) {
    const srcDir = join("packages", pkg, "src");
    try {
      readdirSync(srcDir);
    } catch {
      continue;
    }
    count += scanSourceTree(srcDir, check);
  }
  return count;
}

/**
 * The presence protocol filenames. orch DEFINES these — they are core
 * vocabulary, not a third party's wire format, which is why they are not in
 * ADAPTER_WIRE_LITERALS (design D6). The compensating rule: they get exactly ONE
 * definition site. src/presence/schema.ts exports them as constants; hard-coding
 * the raw quoted string anywhere else under src/** or extensions/** is what
 * this bans.
 */
const PRESENCE_FILENAMES: readonly string[] = [
  "status.json",
  "result.json",
  "inbox.jsonl",
  "answer.json",
  "ack.jsonl",
];

/** The one directory allowed to name a presence file literally. */
const PRESENCE_SCOPE = "src/presence";

/** The one module allowed to invoke an adapter's control strategies (D2.2). */
const DISPATCHER_MODULE = "src/control/dispatch.ts";

/** Provider/backend identity strings. Branching on these by literal in core is
 * the string-form of the `.id ===` breach the identity-branch rule bans (D2.3). */
const PROVIDER_IDS = ["pi", "claude", "codex", "herdr", "tmux", "headless"] as const;
const PROVIDER_ID_ALTERNATION = PROVIDER_IDS.join("|");
const IDENTITY_EQUALITY_RIGHT = new RegExp(`(?:===|!==)\\s*["'](?:${PROVIDER_ID_ALTERNATION})["']`);
const IDENTITY_EQUALITY_LEFT = new RegExp(`["'](?:${PROVIDER_ID_ALTERNATION})["']\\s*(?:===|!==)`);
const IDENTITY_FALLBACK = new RegExp(`(?:\\?\\?|\\|\\|)\\s*["'](?:${PROVIDER_ID_ALTERNATION})["']`);

/**
 * Adapter wire-format literals banned from core (src/** outside src/adapters
 * and src/backends). This is the single exhaustive place the set lives —
 * adding a new adapter's literal here is the only change a new adapter needs.
 */
const ADAPTER_WIRE_LITERALS: readonly { readonly owner: string; readonly literal: string }[] = [
  // NOTE: "inbox.jsonl"/"answer.json" are deliberately NOT here. The test is who
  // DEFINES the string: codex's `turn.completed` and claude's `SessionStart` are
  // foreign vocabulary orch conforms to, but the presence filenames are files
  // orch invented for its own protocol (pi is merely the only harness that
  // implements the mid-run half today). They are core vocabulary, same as
  // the other presence files — guarded instead by PRESENCE_FILENAMES (design D6).
  { owner: "codex", literal: "agent-turn-complete" },
  { owner: "codex", literal: "agent_turn_complete" },
  { owner: "codex", literal: "turn.completed" },
  { owner: "codex", literal: "turn-complete" },
  { owner: "codex", literal: "turn_complete" },
  { owner: "claude", literal: "SessionStart" },
  { owner: "claude", literal: "Stop" },
  { owner: "claude", literal: "Notification" },
  { owner: "claude", literal: "claude-hooks" },
];

function quotedLiteralPattern(literal: string): RegExp {
  const escaped = literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`["']${escaped}["']`);
}

/**
 * Documented core-scope exemptions, keyed by repo-relative path → the set of
 * exact (trimmed) source lines that may violate an otherwise-strict core rule.
 *
 * The ONLY current entry is the setup end-to-end smoke test (tasks.md 12.5):
 * `spawnHeadlessSmokeAgent` spawns with `--backend headless` and then filters
 * the freshly-recorded rows by `backend === "headless"` to find the one it just
 * created. That is a deliberate, legitimate pin on the headless backend — the
 * smoke round-trip is defined to run headless (no external process), not a
 * caps-negotiated dispatch branch — so the string-form identity check is
 * exempted for exactly that line and no other.
 *
 * Keyed by exact (trimmed) line content rather than line number: other tasks in
 * this change edit these same files concurrently, and a line-number key would
 * silently stop matching (or silently match the wrong line) on every unrelated
 * insertion/deletion above it. Add an entry ONLY with a comment justifying why
 * the site legitimately declares an id — every entry is a hole in the rule.
 */
export const CORE_SCOPE_ALLOWLIST: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  [
    "src/commands/setup.ts",
    new Set([
      'const key = [...after.keys()].find((candidate) => !before.has(candidate) && after.get(candidate)?.backend === "headless");',
    ]),
  ],
]);

/** Exact backend-owned environment names in addition to the directory-derived prefix. */
const BACKEND_ENV_PREFIX_EXTRAS: ReadonlyMap<string, readonly string[]> = new Map([
  ["tmux", ["TMUX"]],
]);

function backendEnvNames(): ReadonlyMap<string, string> {
  const owners = new Map<string, string>();
  let backends: string[];
  try {
    backends = readdirSync("src/backends", { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return owners;
  }
  for (const backend of backends) {
    const prefix = `${backend.toUpperCase()}_`;
    owners.set(prefix, backend);
    for (const extra of BACKEND_ENV_PREFIX_EXTRAS.get(backend) ?? []) owners.set(extra, backend);
    const lines = scanBackendEnvReferences(join("src/backends", backend));
    for (const name of lines) if (!name.startsWith("ORCH_")) owners.set(name, backend);
  }
  return owners;
}

function scanBackendEnvReferences(directory: string): Set<string> {
  const names = new Set<string>();
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(current, entry.name));
      else if (entry.isFile() && entry.name.endsWith(".ts")) {
        const text = readFileSync(join(current, entry.name), "utf8");
        for (const match of text.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g)) {
          const name = match[1] ?? match[2];
          if (name) names.add(name);
        }
      }
    }
  };
  walk(directory);
  return names;
}

const BACKEND_ENV_OWNERS = backendEnvNames();

function checkBackendEnvLine(line: string, relPath: string): string | undefined {
  const backendMatch = /^src\/backends\/([^/]+)\//.exec(relPath);
  const backendOwner = backendMatch?.[1];
  for (const match of line.matchAll(/process\.env(?:\.([A-Z][A-Z0-9_]*)|\[\s*["']([A-Z][A-Z0-9_]*)["']\s*\])/g)) {
    const name = match[1] ?? match[2];
    if (!name || name.startsWith("ORCH_")) continue;
    const owner = [...BACKEND_ENV_OWNERS.entries()]
      .filter(([pattern]) => name === pattern || name.startsWith(pattern))
      .sort(([left], [right]) => right.length - left.length)[0]?.[1];
    if (!owner) continue;
    if (backendOwner === owner || relPath.startsWith("extensions/")) continue;
    return `backend-owned env ${name} is forbidden here; derive via the backend port capability, not env`;
  }
  return undefined;
}

function checkPresenceFilenameLine(line: string, relPath: string): string | undefined {
  if (relPath.startsWith(`${PRESENCE_SCOPE}/`)) return undefined;
  for (const filename of PRESENCE_FILENAMES) {
    if (quotedLiteralPattern(filename).test(line)) {
      return `presence filename ${JSON.stringify(filename)} is forbidden outside ${PRESENCE_SCOPE}/; import the constant from ${PRESENCE_SCOPE}/schema.ts`;
    }
  }
  return undefined;
}

/**
 * D2.1 — a package (`packages/<pkg>/src/**`) may reach into core only through
 * the ports: registry, policy, store, config, daemon client. A concrete backend
 * implementation (`src/backends/<id>/…`) or a concrete agent adapter
 * (`src/adapters/{pi,claude,codex}`) import re-couples the package to a leaf,
 * which is exactly the breach `resolveBackend`/`resolveAdapter` exist to prevent.
 * `backends/registry.ts`, `backends/backend.ts`, `adapters/registry.ts`, and the
 * shared leaves (`adapters/adapter.ts`, `adapters/transcript.ts`) sit directly
 * under their dir (no `<id>/` subpath, not a harness id) and stay allowed.
 */
export function checkPackageImportLine(line: string): string | undefined {
  if (/backends\/[\w-]+\//.test(line)) {
    return "packages must not import a concrete backend (src/backends/<id>/…); resolve via src/backends/registry.ts or the backend port";
  }
  if (/adapters\/(?:pi|claude|codex)(?:\.ts)?["']/.test(line)) {
    return "packages must not import a concrete agent adapter (src/adapters/<id>); resolve via src/adapters/registry.ts";
  }
  return undefined;
}

/**
 * D2.2 — adapter control strategies (`.steer`/`.answer`/`.setModel`) may be
 * invoked only from the one control dispatcher (`src/control/dispatch.ts`) and,
 * of course, defined inside the adapters themselves (`src/adapters/**`). Any
 * other member call in src/ is a control path that skips the dispatcher's
 * capability gate and the daemon's wall — the L5 "one door" the architecture
 * requires. Lexical, same style as the wire-literal checks.
 */
export function checkDispatcherCallLine(line: string, relPath: string): string | undefined {
  if (relPath === DISPATCHER_MODULE || relPath.startsWith("src/adapters/")) return undefined;
  if (/\.(?:steer|answer|setModel)\s*\(/.test(line)) {
    return "adapter control strategy (.steer/.answer/.setModel) may be invoked only through src/control/dispatch.ts";
  }
  return undefined;
}

/**
 * D2.4 — `src/commands/**` reads sessions through the resolved adapter's
 * `readSessionView` port surface, never by importing a per-harness parser.
 * `parseSession` is pi's parser (src/session.ts); importing or calling it in a
 * command misparses claude/codex sessions. Only the pi adapter may name it.
 */
export function checkCommandsParserLine(line: string): string | undefined {
  if (/\bparseSession\b/.test(line)) {
    return "per-harness session parser parseSession is forbidden in src/commands/; read via the resolved adapter's readSessionView port";
  }
  return undefined;
}

export function checkCoreScopeLine(line: string, relPath: string): string | undefined {
  const backendEnvViolation = checkBackendEnvLine(line, relPath);
  if (backendEnvViolation) return backendEnvViolation;
  const presenceViolation = checkPresenceFilenameLine(line, relPath);
  if (presenceViolation) return presenceViolation;
  if (/from\s+["'][^"']*\/(?:pi|claude|codex)(?:\.ts)?["']/.test(line)) {
    return "concrete adapter imports are forbidden in core; resolve via src/adapters/registry.ts";
  }
  if (/from\s+["'][^"']*backends\/(?:herdr|tmux|headless)\//.test(line)) {
    return "concrete backend imports are forbidden in core; resolve via src/backends/registry.ts";
  }
  if (/\b(?:adapter|backend)\.id\s*(?:===|!==)/.test(line)) {
    return "adapter/backend identity branching is forbidden in core; branch on declared capabilities instead";
  }
  // D2.3 — string-form of the same identity branch: `x === "pi"`, `"headless" !== x`,
  // and `x ?? "pi"` / `x || "pi"` default-adapter fallbacks (the pi-default bug D5 removed).
  if (IDENTITY_EQUALITY_RIGHT.test(line) || IDENTITY_EQUALITY_LEFT.test(line) || IDENTITY_FALLBACK.test(line)) {
    return "string-form provider/backend identity branch is forbidden in core; branch on declared capabilities and resolve via the registry";
  }
  for (const { owner, literal } of ADAPTER_WIRE_LITERALS) {
    if (quotedLiteralPattern(literal).test(line)) {
      return `${owner} adapter wire literal ${JSON.stringify(literal)} is forbidden in core; keep it inside src/adapters/${owner}.ts`;
    }
  }
  return undefined;
}

/** Recursively scan src/** for port-boundary violations, excluding the adapter/backend port dirs. */
function scanCoreScope(): number {
  let count = 0;
  function walk(directory: string, relPath: string): void {
    const entries = readdirSync(directory, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));
    for (const entry of entries) {
      if (directory === "src" && (entry.name === "adapters" || entry.name === "backends")) continue;
      const entryRelPath = `${relPath}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(join(directory, entry.name), entryRelPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith(".ts")) continue;
      const file = join(directory, entry.name);
      const allowed = CORE_SCOPE_ALLOWLIST.get(entryRelPath);
      const lines = readFileSync(file, "utf8").split(/\r?\n/);
      for (let index = 0; index < lines.length; index++) {
        if (allowed?.has(lines[index]!.trim())) continue;
        const reason = checkCoreScopeLine(lines[index]!, entryRelPath);
        if (reason) fail(file, index + 1, reason);
      }
      count++;
    }
  }
  walk("src", "src");
  return count;
}

function runAllChecks(): void {
  /**
   * The presence filenames have exactly one definition site: src/presence/schema.ts.
   * Every other file under src/ and every harness artifact under extensions/
   * imports the constants, so a raw quoted occurrence anywhere else is a second
   * definition and fails this check.
   */
  const bridgeSourceFiles = scanSrcOutsideBackends((line, relPath) => {
    const backendEnvViolation = checkBackendEnvLine(line, relPath);
    if (backendEnvViolation) return backendEnvViolation;
    if (/backends\/[\w-]+\//.test(line)) return "backend subpath imports are forbidden outside backends (boundary modules live directly under backends/)";
    if (/\b(?:herdrBestEffort|herdrJSON|herdrExec|herdrPanes|herdrTabs|herdrNames|herdrReachable|HERDR_PANE_ID|TMUX_PANE)\b/.test(line)) {
      return "backend-specific herdr/tmux identifiers are forbidden outside backends";
    }
    if (line.includes("process.env.HERDR")) return "process.env.HERDR is forbidden outside backends";
    if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden outside backends";
    if (/[\"'](herdr|tmux)[\"']/.test(line)) return "quoted herdr/tmux literals are forbidden outside backends";
    return undefined;
  });

  const extensionFiles = scanDirectory("extensions", new Set(), (line, relPath) => {
    const presenceViolation = checkPresenceFilenameLine(line, relPath);
    if (presenceViolation) return presenceViolation;
    if (/backends\/[\w-]+\//.test(line)) return "backend subpath imports are forbidden in extensions (boundary modules live directly under backends/)";
    // Harness extensions may read the environment for their own harness integration.
    if (/["'](herdr|tmux)["']/.test(line)) return "quoted herdr/tmux literals are forbidden in extensions";
    return undefined;
    // Recursive: each harness owns extensions/<harness>/, so every file is one level down.
  }, true);

  const scriptFiles = scanDirectory("scripts", new Set(["check-bridge.ts"]), (line) => {
    if (line.includes("HERDR_PANE_ID")) return "HERDR_PANE_ID is forbidden in scripts";
    if (line.includes("TMUX_PANE")) return "TMUX_PANE is forbidden in scripts";
    if (/process\.env\.HERDR(?!_ENV\b|_SOCKET_PATH\b)/.test(line)) return "process.env.HERDR is forbidden in scripts";
    if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden in scripts";
    return undefined;
  });

  const adapterFiles = scanDirectory("src/adapters", new Set(["adapter.ts"]), (line, relPath) => {
    const presenceViolation = checkPresenceFilenameLine(line, relPath);
    if (presenceViolation) return presenceViolation;
    if (line.includes("HERDR_PANE_ID")) return "HERDR_PANE_ID is forbidden in agent adapters";
    if (line.includes("TMUX_PANE")) return "TMUX_PANE is forbidden in agent adapters";
    if (line.includes("process.env.HERDR")) return "process.env.HERDR is forbidden in agent adapters";
    if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden in agent adapters";
    if (line.includes('from "../backends/')) return "backend imports are forbidden in agent adapters";
    if (line.includes("from '../backends/")) return "backend imports are forbidden in agent adapters";
    return undefined;
  });

  const backendFiles = scanDirectory("src/backends", new Set(["backend.ts", "identity.ts"]), (line, relPath) => {
    const backendEnvViolation = checkBackendEnvLine(line, relPath);
    if (backendEnvViolation) return backendEnvViolation;
    const presenceViolation = checkPresenceFilenameLine(line, relPath);
    if (presenceViolation) return presenceViolation;
    if (/from\s+["']\.\.\/adapters\/(?:pi|claude|codex)\.ts["']/.test(line)) {
      return "agent adapter imports are forbidden in backends";
    }
    if (/["']\b(?:pi|claude|codex)\b["']/.test(line)) {
      return "agent id literals are forbidden in backends";
    }
    return undefined;
  }, true);

  const coreScopeFiles = scanCoreScope();
  const packageFiles = scanPackagesSrc(checkPackageImportLine);
  const dispatcherScopeFiles = scanDirectory("src", new Set(), checkDispatcherCallLine, true);
  const commandParserFiles = scanDirectory("src/commands", new Set(), checkCommandsParserLine, true);

  const scanned =
    bridgeSourceFiles + extensionFiles + scriptFiles + adapterFiles + backendFiles +
    coreScopeFiles + packageFiles + dispatcherScopeFiles + commandParserFiles;
  console.log(`check:bridge OK (${scanned} files scanned)`);
}

if (import.meta.main) runAllChecks();
