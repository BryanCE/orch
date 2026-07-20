#!/usr/bin/env bun
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

function fail(file: string, line: number, reason: string): never {
  console.log(`check:bridge FAIL ${file}:${line} ${reason}`);
  process.exit(1);
}

function scanDirectory(directory: string, excluded: Set<string>, check: (line: string) => string | undefined, recursive = false): number {
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
      const reason = check(lines[index]!);
      if (reason) fail(file, index + 1, reason);
    }
    count++;
  }
  return count;
}

function scanSrcOutsideBackends(check: (line: string) => string | undefined): number {
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
      const reason = check(lines[index]!);
      if (reason) fail(file, index + 1, reason);
    }
    count++;
  }
  return count;
}

const bridgeSourceFiles = scanSrcOutsideBackends((line) => {
  if (/backends\/(?:herdr|tmux)\//.test(line)) return "herdr/tmux backend subpath imports are forbidden outside backends";
  if (/\b(?:herdrBestEffort|herdrJSON|herdrExec|herdrPanes|herdrTabs|herdrNames|herdrReachable|HERDR_PANE_ID|TMUX_PANE)\b/.test(line)) {
    return "backend-specific herdr/tmux identifiers are forbidden outside backends";
  }
  if (line.includes("process.env.HERDR")) return "process.env.HERDR is forbidden outside backends";
  if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden outside backends";
  if (/[\"'](herdr|tmux)[\"']/.test(line)) return "quoted herdr/tmux literals are forbidden outside backends";
  return undefined;
});

const extensionFiles = scanDirectory("extensions", new Set(), (line) => {
  if (line.includes("HERDR_PANE_ID")) return "HERDR_PANE_ID is forbidden in extensions";
  if (line.includes("TMUX_PANE")) return "TMUX_PANE is forbidden in extensions";
  if (/process\.env\.HERDR(?!_ENV\b|_SOCKET_PATH\b)/.test(line)) return "process.env.HERDR is forbidden in extensions";
  if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden in extensions";
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

const adapterFiles = scanDirectory("src/adapters", new Set(["adapter.ts"]), (line) => {
  if (line.includes("HERDR_PANE_ID")) return "HERDR_PANE_ID is forbidden in agent adapters";
  if (line.includes("TMUX_PANE")) return "TMUX_PANE is forbidden in agent adapters";
  if (line.includes("process.env.HERDR")) return "process.env.HERDR is forbidden in agent adapters";
  if (line.includes("process.env.TMUX")) return "process.env.TMUX is forbidden in agent adapters";
  if (line.includes('from "../backends/')) return "backend imports are forbidden in agent adapters";
  if (line.includes("from '../backends/")) return "backend imports are forbidden in agent adapters";
  return undefined;
});

const backendFiles = scanDirectory("src/backends", new Set(["backend.ts", "identity.ts"]), (line) => {
  if (/from\s+["']\.\.\/adapters\/(?:pi|claude|codex)\.ts["']/.test(line)) {
    return "agent adapter imports are forbidden in backends";
  }
  if (/["']\b(?:pi|claude|codex)\b["']/.test(line)) {
    return "agent id literals are forbidden in backends";
  }
  return undefined;
}, true);

/**
 * Adapter wire-format literals banned from core (src/** outside src/adapters
 * and src/backends). This is the single exhaustive place the set lives —
 * adding a new adapter's literal here is the only change a new adapter needs.
 */
const ADAPTER_WIRE_LITERALS: readonly { readonly owner: string; readonly literal: string }[] = [
  { owner: "pi", literal: "inbox.jsonl" },
  { owner: "pi", literal: "answer.json" },
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
 * Pre-existing core-scope violations not owned by port-boundary-guard (section 7).
 * Each is a real gap left open for its owning task to close — the rule stays
 * strict; remove an entry only when the named file is actually fixed.
 *
 * Keyed by exact (trimmed) line content rather than line number: other tasks
 * in this change edit these same files concurrently, and a line-number key
 * would silently stop matching (or silently match the wrong line) on every
 * unrelated insertion/deletion above it.
 */
const CORE_SCOPE_ALLOWLIST: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  // src/doctor.ts's checkClaudeHooks reimplements claude's hook-event names
  // and the "claude-hooks" id in core instead of delegating to
  // src/adapters/claude.ts. Not part of section 7's scope.
  ["src/doctor.ts", new Set([
    'const id = "claude-hooks";',
    'for (const event of ["SessionStart", "Stop", "Notification"] as const) {',
    'isolated("claude-hooks", "Claude hooks shim", () => checkClaudeHooks()),',
  ])],
]);

function checkCoreScopeLine(line: string): string | undefined {
  if (/from\s+["'][^"']*\/(?:pi|claude|codex)(?:\.ts)?["']/.test(line)) {
    return "concrete adapter imports are forbidden in core; resolve via src/adapters/registry.ts";
  }
  if (/from\s+["'][^"']*backends\/(?:herdr|tmux|headless)\//.test(line)) {
    return "concrete backend imports are forbidden in core; resolve via src/backends/registry.ts";
  }
  if (/\b(?:adapter|backend)\.id\s*(?:===|!==)/.test(line)) {
    return "adapter/backend identity branching is forbidden in core; branch on declared capabilities instead";
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
        const reason = checkCoreScopeLine(lines[index]!);
        if (reason) fail(file, index + 1, reason);
      }
      count++;
    }
  }
  walk("src", "src");
  return count;
}

const coreScopeFiles = scanCoreScope();

console.log(`check:bridge OK (${bridgeSourceFiles + extensionFiles + scriptFiles + adapterFiles + backendFiles + coreScopeFiles} files scanned)`);
