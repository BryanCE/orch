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

console.log(`check:bridge OK (${adapterFiles + backendFiles} files scanned)`);
