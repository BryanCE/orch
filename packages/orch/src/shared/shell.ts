// Rendering a launch for the shell that runs it. A backend declares its shell's dialect; this is
// the one place a launch's argv and env become shell text.
import { shellLine, shellQuote } from "../util.ts";

/** The shell a backend's pane or process runs a line in. */
export type ShellDialect = "posix" | "cmd";

/** One argument quoted for cmd.exe: in double quotes, with each `"` in it doubled. */
function cmdQuote(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}

/** `argv` as one line of `dialect`, each argument quoted for it. */
export function shellCommand(dialect: ShellDialect, argv: readonly string[]): string {
  return dialect === "posix" ? shellLine(argv) : argv.map(cmdQuote).join(" ");
}

/** The line that starts `argv` in a shell that is already running, with `env` set and each name
 *  in `unset` removed. posix runs it under `env`; cmd sets each variable first. */
export function shellLaunchLine(dialect: ShellDialect, argv: readonly string[], env: Readonly<Record<string, string>>, unset: readonly string[]): string {
  const removed = unset.filter((name) => !Object.hasOwn(env, name));
  if (dialect === "cmd") {
    const sets = [...removed.map((name) => `set "${name}="`), ...Object.entries(env).map(([name, value]) => `set "${name}=${value}"`)];
    return [...sets, shellCommand("cmd", argv)].join(" & ");
  }
  return ["env", ...removed.flatMap((name) => ["-u", name]), ...Object.entries(env).map(([name, value]) => `${name}=${shellQuote(value)}`), shellLine(argv)].join(" ");
}
