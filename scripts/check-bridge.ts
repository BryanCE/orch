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
});

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

console.log(`check:bridge OK (${bridgeSourceFiles + extensionFiles + scriptFiles + adapterFiles + backendFiles} files scanned)`);
