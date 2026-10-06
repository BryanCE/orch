/** Usage lines built from the spec, so no command can print one that drifts from what it parses. */

import { UsageError } from "./spec.ts";
import type { CommandSpec, FlagSpec, Invocation } from "./spec.ts";

/** A command reached by its words: the spec and `["settings", "notify", "add"]`. */
export type CommandAt = Pick<Invocation, "command" | "path">;

/** True when the positional grammar already names the flag, as `--all` in `<target>... | --all`. Flag names are `[-a-z]` only. */
function namedInArgs(args: string, flag: FlagSpec): boolean {
  return new RegExp(`(^|[\\s[|])${flag.name}(?=[\\s\\]|=]|$)`).test(args);
}

/** `[--json]`, `[--tab <tab>]`, `[--file <path>]...`. */
export function flagUsage(flag: FlagSpec): string {
  if (flag.arity === "none") return `[${flag.name}]`;
  const shown = `[${flag.name} ${flag.placeholder ?? ""}]`;
  return flag.arity === "many" ? `${shown}...` : shown;
}

function commandArgs(spec: CommandSpec): string {
  if (spec.args !== undefined) return spec.args;
  if (spec.subcommands === undefined) return "";
  return `<${spec.subcommands.map((child) => child.name).join("|")}>`;
}

/** `orch tab close <tab>`: the command words and the positional grammar, without optional flags. */
export function synopsis(spec: CommandSpec, path: readonly string[]): string {
  return ["orch", ...path, commandArgs(spec)].filter((word) => word.length > 0).join(" ");
}

/** The flags the synopsis leaves out. */
export function unnamedFlags(spec: CommandSpec): readonly FlagSpec[] {
  const args = commandArgs(spec);
  return spec.flags.filter((flag) => !namedInArgs(args, flag));
}

/** The full usage line: the synopsis, then every declared flag it does not already name. */
export function usageLine(spec: CommandSpec, path: readonly string[]): string {
  return [synopsis(spec, path), ...unnamedFlags(spec).map(flagUsage)].join(" ");
}

/** The one refusal for a malformed invocation: the reason, when there is one, then the spec's usage line. */
export function usageError(at: CommandAt, reason?: string): UsageError {
  const usage = `usage: ${usageLine(at.command, at.path)}`;
  return new UsageError(reason === undefined ? usage : `${reason}\n${usage}`);
}
