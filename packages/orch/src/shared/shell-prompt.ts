import type { ForegroundProcesses } from "../types/backend.ts";

export const NO_FOREGROUND: ForegroundProcesses = { shellPid: null, foregroundPid: null, processes: [] };

/** What an environment counts as an agent's own shell: the same names a plexer
 *  reads as a pane's shell process, so orch reads exactly the fact the plexer reads. */
const SHELL_PROCESS_NAMES = new Set([
  "sh", "bash", "dash", "zsh", "fish", "ksh", "mksh", "csh", "tcsh",
  "elvish", "xonsh", "nu", "pwsh", "powershell", "cmd",
]);

/** The plexer's own normalization: basename, no login-shell dash, no `.exe`, lowercased.
 *  A login shell reports as `-bash`, and matching on a `sh` suffix instead calls
 *  `ssh` a shell. */
function processName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? name;
  return base.replace(/^-+/, "").toLowerCase().replace(/\.exe$/, "");
}

/** True while the agent's own shell owns the terminal. That covers an idle prompt
 *  AND a shell still sourcing its rc files, which are indistinguishable from
 *  outside — so this answers "no command is running", never "input is accepted". */
export function atShellPrompt(foreground: ForegroundProcesses): boolean {
  if (foreground.shellPid !== null && foreground.foregroundPid !== null) {
    return foreground.shellPid === foreground.foregroundPid;
  }
  return foreground.processes.length > 0
    && foreground.processes.every((name) => SHELL_PROCESS_NAMES.has(processName(name)));
}
