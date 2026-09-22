// A locked or gated shell command runs only through `orch lock`, which asks orchd
// before it starts. Each harness integration rewrites a matching command into that
// wrapper; this module is the one place that decides what matches and how it wraps.
import { join } from "node:path";
import { packageRoot, shellQuote } from "../util.ts";
import type { OrchSettings } from "../types/settings.ts";

/** Env var the wrapper exports to its child: the patterns an ancestor already holds. */
export const HELD_LOCKS_ENV = "ORCH_HELD_LOCKS";

const BOUNDARY = "[\\s;&|(){}'\"`]";

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const COMMAND_START = "(?:^|[;&|({'\"`])\\s*";
const REDIRECTS = "(?:\\s+\\d*[<>]{1,2}&?\\S*)*";
const COMMAND_END = "\\s*(?:$|[;&|)}'\"`])";

function patternWords(pattern: string): string {
  return pattern.trim().split(/\s+/).map(escapeRegExp).join("\\s+");
}

function patternRegExp(pattern: string): RegExp {
  return new RegExp(`(?:^|${BOUNDARY})${patternWords(pattern)}(?=$|${BOUNDARY})`);
}

function wholeCommandRegExp(pattern: string): RegExp {
  return new RegExp(`${COMMAND_START}${patternWords(pattern)}${REDIRECTS}${COMMAND_END}`);
}

/** The first pattern the command line runs with no arguments of its own; redirects and pipes may follow. */
export function wholeCommandMatch(command: string, patterns: readonly string[]): string | undefined {
  return patterns.find((pattern) => pattern.trim() !== "" && wholeCommandRegExp(pattern).test(command));
}

const COMMAND_WORDS = /^[\w@%+=:./-]+(?: [\w@%+=:./-]+)*$/;

/** Whether a pattern is literal command words: no prose, no globs, no placeholders. */
export function isCommandPattern(pattern: string): boolean {
  return COMMAND_WORDS.test(pattern);
}

export const COMMAND_PATTERN_MESSAGE =
  "a locked or gated command is the literal words of the command, like `bun test`: no prose, no `*`, no `<file>`, no parentheses or commas";

/** Every pattern the command line runs: whole words anywhere, after `&&`, `;`, `|`, or inside quotes. */
export function matchedPatterns(command: string, patterns: readonly string[]): string[] {
  return patterns.filter((pattern) => pattern.trim() !== "" && patternRegExp(pattern).test(command));
}

/** The patterns a harness must route through `orch lock`: locked, gated and denied alike. */
export function gatedPatterns(settings: Pick<OrchSettings, "locked_commands" | "gated_commands" | "denied_commands">): string[] {
  return [...settings.locked_commands, ...settings.gated_commands, ...settings.denied_commands.commands];
}

/** A command the agent already sent through `orch lock` itself. */
const ASKED_LOCK = /^\s*orch\s+lock\s+--\s/;

/** The installed orch entrypoint; its shebang names the declared runtime. */
function orchEntrypoint(): string {
  return join(packageRoot(), "dist", "bin", "orch.js");
}

/** The command line that runs `command` under the lock, or undefined when nothing matches. */
export function lockedCommandLine(command: string, patterns: readonly string[]): string | undefined {
  const entrypoint = shellQuote(orchEntrypoint());
  if (command.startsWith(`${entrypoint} lock -- `) || ASKED_LOCK.test(command)) return undefined;
  if (matchedPatterns(command, patterns).length === 0) return undefined;
  return `${entrypoint} lock -- ${shellQuote(command)}`;
}

/** The patterns an ancestor `orch lock` holds, read from the env it exported. */
export function heldPatterns(env: NodeJS.ProcessEnv): string[] {
  return (env[HELD_LOCKS_ENV] ?? "").split("\n").filter(Boolean);
}
