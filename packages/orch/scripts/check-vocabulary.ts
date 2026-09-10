#!/usr/bin/env bun
/**
 * Rule 11 as a gate: a plexer's words never reach orch's own model.
 *
 * "Workspace" is herdr's word for a grouping and "pane" is its word for one
 * place an agent can be shown. orch's model has a SPACE and a HANDLE. A plexer
 * directory under `src/backends/` may spell its own vocabulary, because that is
 * where its wire format lives (Rule 9). Everywhere else — commands, daemon,
 * types, policy, presence, control, agent, extensions — must not.
 *
 * The rule was written down and broken anyway, repeatedly. A check is the only
 * form of it that holds.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative, sep } from "node:path";

const packageRoot = join(import.meta.dirname, "..");

/** Every plexer owns one directory under `src/backends/`; each is exempt. */
function plexerDirectories(): readonly string[] {
  const backends = join(packageRoot, "src", "backends");
  return readdirSync(backends, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(backends, entry.name));
}

/** A plexer's vocabulary, with the orch word that replaces it. */
const BANNED_WORDS: ReadonlyMap<string, string> = new Map([
  ["pane", "handle"],
  ["panes", "handles"],
  ["workspace", "space"],
  ["workspaces", "spaces"],
]);

const WORD_PATTERN = new RegExp(`\\b(${[...BANNED_WORDS.keys()].join("|")})\\b`, "gi");

interface Offence {
  file: string;
  line: number;
  word: string;
  replacement: string;
}

function scanFile(file: string, exempt: readonly string[]): Offence[] {
  if (exempt.some((directory) => file.startsWith(directory + sep))) return [];
  const offences: Offence[] = [];
  for (const [index, text] of readFileSync(file, "utf8").split("\n").entries()) {
    for (const match of text.matchAll(WORD_PATTERN)) {
      const word = match[0].toLowerCase();
      const replacement = BANNED_WORDS.get(word);
      if (replacement === undefined) continue;
      offences.push({ file: relative(packageRoot, file), line: index + 1, word: match[0], replacement });
    }
  }
  return offences;
}

/** Recurse a source tree, collecting every `.ts` file. Never follows a symlink. */
function sourceFiles(directory: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) found.push(...sourceFiles(path));
    else if (entry.isFile() && path.endsWith(".ts")) found.push(path);
  }
  return found;
}

const exempt = plexerDirectories();
const roots = [join(packageRoot, "src"), join(packageRoot, "extensions")];
const offences = roots.flatMap((root) => sourceFiles(root).flatMap((file) => scanFile(file, exempt)));

if (offences.length === 0) {
  console.log("check:vocabulary OK");
  process.exit(0);
}

const byFile = new Map<string, number>();
for (const offence of offences) byFile.set(offence.file, (byFile.get(offence.file) ?? 0) + 1);

for (const offence of offences.slice(0, 40)) {
  console.log(`check:vocabulary FAIL ${offence.file}:${offence.line} "${offence.word}" is a plexer's word - orch says "${offence.replacement}"`);
}
console.log(`check:vocabulary ${offences.length} uses across ${byFile.size} files`);
process.exit(1);
