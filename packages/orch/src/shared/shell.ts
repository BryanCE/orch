// Rendering a launch for the shell that runs it. A backend declares its shell's dialect; this is
// the one place a launch's argv and env become shell text.
import { shellQuote } from "../util.ts";
import type { LaunchProgram } from "../types/backend.ts";

/** The shell a backend's pane or process runs a line in. */
export type ShellDialect = "posix" | "cmd";

/** One argument quoted for cmd.exe: in double quotes, with each `"` in it doubled. */
function cmdQuote(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

const QUOTE: Readonly<Record<ShellDialect, (value: string) => string>> = { posix: shellQuote, cmd: cmdQuote };

/** `program` as one line of `dialect`: argv quoted for it, a `--cmd` line as given. */
export function shellCommand(dialect: ShellDialect, program: LaunchProgram): string {
  return program.kind === "shell" ? program.line : program.argv.map(QUOTE[dialect]).join(" ");
}

/** The line that starts `program` in a shell that is already running, with `env` set and each
 *  name in `unset` removed. posix runs it under `env`, and a `--cmd` line under `sh -c`; cmd sets
 *  each variable first. */
export function shellLaunchLine(dialect: ShellDialect, program: LaunchProgram, env: Readonly<Record<string, string>>, unset: readonly string[]): string {
  const removed = unset.filter((name) => !Object.hasOwn(env, name));
  if (dialect === "cmd") {
    const sets = [...removed.map((name) => `set "${name}="`), ...Object.entries(env).map(([name, value]) => `set "${name}=${value}"`)];
    return [...sets, shellCommand("cmd", program)].join(" & ");
  }
  const command = program.kind === "shell" ? ["sh", "-c", shellQuote(program.line)].join(" ") : shellCommand("posix", program);
  return ["env", ...removed.flatMap((name) => ["-u", name]), ...Object.entries(env).map(([name, value]) => `${name}=${shellQuote(value)}`), command].join(" ");
}
